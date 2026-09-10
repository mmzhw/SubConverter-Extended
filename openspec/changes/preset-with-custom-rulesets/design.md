# Design: preset + 用户自定义规则（ext_ruleset=）

## Context

- 后端 C++：`src/handler/interfaces.cpp` 现有 `buildExternalConfigFetchPlan` 加载三方 `.ini`、收集 `rulePrependSources` / `ruleAppendSources`、调用 `fetchExternalRuleSources` 抓取并解析、注入 `base_rule["rules`。
- 既有 `ruleprepend` / `ruleappend` 仅从 `.ini` 的 `[ruleset] ruleprepend=...` / `[ruleset] ruleappend=...` 字段读取（`settings.cpp:2092-2093`、`settings.cpp:2283-2284`），URL 参数路径里只识别为"是否需要 transformation"（`interfaces.cpp:2425-2429`），未实际消费。
- 前端 Vue 3 + Element Plus：参数元数据集中在 `web/src/config/options.ts`；`Remote config` 是 `enum` + `allowCustom: true` 的下拉框；URL 拼装集中在 `web/src/composables/useGenerateSubscription.ts` 的 `buildSubUrl`。
- 用户动机：在 Aethersailor / ACL4SSR 三方预设基础上追加自维护的规则，无需手工 fork `.ini`、无需 cron / Action 同步基础设施。

## Goals / Non-Goals

**Goals:**

- 在 URL 协议层新增 `ext_ruleset=` 参数，后端在单次请求里完成"拉三方 preset → 抓自定义规则 → 校验组名 → 合并到 base_rule.rules"。
- 前端新增"额外规则集"多行文本框控件，复用既有 `el-input` 仅扩展 `multiline` 标志位。
- 组名严格校验：仅接受引用上游已定义组的条目；新组名直接 400，避免"指向不存在的策略组"导致的静默失败。
- 行为约束与现有 `ruleprepend` / `ruleappend` 对齐（仅 `target=clash`、复用 `max_allowed_rulesets`、atomic 失败语义）。
- 三方"自动跟上"通过后端每次请求实时 fetch 实现，**不引入 cron / Action / fork 工作流**。

**Non-Goals:**

- 不引入 GitHub Action / 同步脚本 / `base/dist/merged-*.ini` 托管（路线 A 排除）。
- 不为前端添加 group 名客户端预校验（首次输入需 fetch preset；当前阶段保留服务端校验以减小改动面积，UX 通过错误提示 + 文档引导弥补）。
- 不扩展到 `surge` / `quanx` / `loon` 等非 Clash target（与 `ruleprepend` 行为一致；其它 target 规则语法差异大，留待未来按 target 单独设计）。
- 不修改 Docker 部署形态、Dashboard / Inspect / Version 页面。

## Decisions

### D1: 新增独立 URL 参数 `ext_ruleset=`，不复用 `ruleset=`

`ruleset=` 在现有路径里仅识别而不消费（`transform_parameters` 白名单判断位），把它扩到既支持 `.ini` 又支持 URL 需重排读路径，风险大于收益。新增 `ext_ruleset=` 语义清晰（"外部补充规则"），与 `config=` 不混淆，与 `ruleprepend` / `ruleappend` 形成"前置 / 后置 / 追加"完整三件套语义。

### D2: 严格组名校验，新组直接 400

`ext_ruleset=` 列出的组名必须出现在 `extconf.custom_proxy_group`（解析后的 proxy_group 列表）以及模板内置 fallback 组（`Proxy`、`Direct`、`REJECT`、`GLOBAL`，与 `src/generator/template/templates.cpp` 内置 Clash 模板的 hardcoded fallback 组保持一致）。未匹配直接 400 + 列出上游已定义组（按字母序排序，截断到前 20 个，超过时附加"... (N more, see preset for full list)"提示用户查看完整列表），让用户立即修改而非让 Clash 启动时报"策略组不存在"。

### D3: 复用 `fetchExternalRuleSources`，不改函数签名

既有 `fetchExternalRuleSources(const string_array&, field_name, context, string_array& destination, std::string& error)` 返回 bool + 错误串，按 atomic 失败语义校验。本次为每条 `ext_ruleset` 单独调用一次，行为清晰、错误可定位。后续若发现性能瓶颈再讨论批量抓取。

### D4: 追加到 `base_rule["rules` 末尾

用户规则语义上是"在三方规则之后追加"，匹配 Clash rule-provider / RULE-SET 的语义规则（先三方、再用户）。**不做去重**：若用户规则与三方某条 `IP-CIDR` / `DOMAIN-SUFFIX` 重合，由 Clash 自己的匹配优先级解决（先匹配先生效）；后端不擅自裁剪用户输入。

### D5: 前端控件复用 `type: 'string'`，新增 `multiline: true` 标志位

`web/src/config/options.ts` 既有 `OptionDef.type` 联合类型里没有 `multiline`。扩展 `OptionDef` 接口加 `multiline?: boolean`，`ConfigForm.vue` 的 `def.type === 'string'` 分支按 `def.multiline` 选择 `el-input` 的 `type` 与 `rows`。最小改动、不引入新组件类型。

### D6: 文本格式 = `Group,URL`，多行用 `\n` 分隔；URL 拼接用 `;` 分隔

`URLSearchParams.set` 自动百分号编码（`,` → `%2C`、换行 → `%0A` 不需要但安全）。回填解析：`ext_ruleset=Proxy,URL1;Domestic,URL2` → split(';') → 每条 split(',') → 用 `\n` 拼回文本框。

### D7: 不做客户端预校验，错误信息靠后端 + 文档

前端 fetch preset 才能拿到合法组名列表，会引入额外的网络请求与缓存复杂度。当前阶段服务端校验 + 错误信息返回"列出合法组名"，用户改完再点一次"生成"即可；高频用户可在 README 里查到"如何从 preset 提取 group 名"。

## Architecture

```
 [Web UI]
  ┌──────────────────────────────────┐
  │ 规则组：                         │
  │   远程配置：[Aethersailor 标准 ▼] │
  │   额外规则集：              │
  │   ┌────────────────────────────┐ │
  │   │ Proxy,https://我的/list1   │ │
  │   │ Domestic,https://我的/... │ │
  │   └────────────────────────────┘ │
  └──────────────────────────────────┘
                 │
                 ▼  GET /sub?target=clash&url=...&config=<三方>&ext_ruleset=Proxy,URL;Domestic,URL
                 │
 [后端 C++ subconverter]
   │
   ├─ parseSubUrl → parsed.ext_rulesets = [(Proxy,URL),(Domestic,URL)]
   │
   ├─ buildExternalConfigFetchPlan
   │    ├─ fetchExternalConfig(<三方 URL>) → extconf
   │    ├─ collectExternalGroupNames(extconf) → {Proxy, Domestic, GFW, ...}
   │    │
   │    └─ ext_ruleset 校验阶段
   │         ├─ for (group, url) in parsed.ext_rulesets:
   │         │    if group ∉ valid_groups: 400 + 错误文案（含合法组名列表）
   │         │
   │         ├─ fetchExternalRuleSources([url], "ext_ruleset", PublicRequest, dest, err)
   │         │    for each url: 抓取 + 解析 → raw rules
   │         │
   │         └─ base_rule["rules += ext_rule_lines  (append 末尾)
   │
   └─ render → 完整 Clash YAML（用户规则位于末尾）
```

## Risks / Trade-offs

- [未知组名 400 比静默失败好，但用户首次输入可能要试错 1–2 次] → 错误文案列出合法组名；README 引导"如何从 preset 提取组名"。
- [atomic 失败语义：单条 URL 抓取失败整批拒绝] → 与 `ruleprepend` / `ruleappend` 一致；避免"配置看起来成功但实际少了规则"的更难排查问题。
- [复用 `fetchExternalRuleSources` 逐条调用有 N 次 HTTP 开销] → ext_ruleset 条数受 `max_allowed_rulesets` 限制（典型 ≤32），单次请求开销可接受；若未来瓶颈出现再考虑并发抓取。
- [新增 `ext_ruleset` 不影响现有 `ruleprepend` / `ruleappend`] → 二者并存，URL 中允许同时出现，互不干扰。

## Migration Plan

- 无破坏性变更。新参数向前兼容（不传 = 不启用）。
- 现有用户的 preset 选择行为不变。
- README "规则和外部配置还支持" 段补 `ext_ruleset=` 用法即可，无需迁移说明。

## Open Questions

<!-- 无：所有决策（D1–D7）已确定，未影响 spec 或 task 拆分 -->