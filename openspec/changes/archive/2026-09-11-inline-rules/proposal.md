## Why

`ext_ruleset=`（额外规则集）已上线（master，`preset-with-custom-rulesets` + `smart-ext-rulesets`），
但它要求用户**自建并公网托管一份规则文件**（如 Gist），UI 里只能贴 URL。这把"我想把 `foo.com`
走 Domestic 组"这种一行就能写完的诉求强行升格成"开 Gist → 写 ini → 拷贝 URL → 填回 UI"四步。

`smart-ext-rulesets/proposal.md` line 41 已把这条用户想法明确登记为"后续 change"：
"直接填域名 + 选模式（DOMAIN/DOMAIN-SUFFIX/DOMAIN-KEYWORD…）+ 选组 →
前端拼成内联规则或生成规则源，无需用户自建公网规则文件。"

本 change 落地这条后续：新增 `inline_rules=` URL 参数 + 前端行式控件，
把"我想让某个域名走某个组"压缩到 UI 三步以内（输值 → 选模式 → 选组）。

## What Changes

- **后端**：新增 `inline_rules=` URL 参数，格式 `Group:TYPE,value|TYPE,value;Group2:TYPE,value`。
  解析后按组校验、规则类型校验（复用 `parseExternalClashRules`，`require_target=false`），
  最终把每条规则 `TYPE,value,Group` 追加到 `policy.generator.rule_append`，落点与 `ext_ruleset=` 完全相同。
- **后端校验**：group ∈ `collectExternalGroupNames(extconf)`（与 `ext_ruleset=` 共用同一函数，
  行为一致）；总条数 ≤ `settings.max_allowed_rulesets`；仅 `target ∈ {clash, clashr}`；
  拒绝 `list=true` / `script=true`（与 `ext_ruleset=` 一致）。
- **前端**：新增 `InlineRulesControl.vue` 行式控件，每行 = 匹配模式下拉 + 值输入框 + 组名下拉 +
  删除按钮；底部"＋ 添加规则"。组名下拉复用 `useGroupNames(configUrl)`（`smart-ext-rulesets` 已实现）。
  与 `ExtraRulesetsControl` 并排在"规则"分组下，互不耦合。
- **状态模型**：新增 OptionDef `inline_rules`（key 独立于 `ext_ruleset`，不破坏现有字段）。
  新建 `web/src/lib/inline-rules.ts` 行 ↔ 字符串互转纯函数；
  `buildSubUrl` / `parseSubUrl` 把 `inline_rules` 加入参数表，URL round-trip 一致。
- **测试**：后端 smoke 新增 4 case（合法 fixture → 200；非法 group → 400；
  非法 rule type → 400；`list=true` 共存 → 400）；前端 vitest 覆盖行 ↔ 字符串互转 + round-trip。
- **文档**：README"额外规则集 / 内联规则"章节补一条说明。

## Capabilities

### New Capabilities

- `inline-rules`: 新 URL 参数 `inline_rules=`，让用户在 UI 里直接录入 `TYPE,value → Group`
  行式规则，无需自建并托管规则文件。后端落点与 `ext_ruleset=` 共用 `rule_append`，
  校验语义对齐；前端控件复用 `useGroupNames` 组名加载。

### Modified Capabilities

<!-- 无：ext_ruleset、smart-ext-rulesets、getgroupnames 的需求与行为均不变 -->

## Impact

- 后端：`src/handler/interfaces.cpp` 新增 `parseInlineRules` + `applyInlineRules` 私有函数、
  `subconverter` 主流程挂入 `inline_rules=` 处理分支、错误文案补全；
  `src/handler/interfaces.h` 不新增公开符号（与 `ext_ruleset=` 一样走 `RESPONSE_CALLBACK_ARGS` 入口）；
  `scripts/run-subconverter-smoke.py` 补 4 个 case。
- 前端：新增 `web/src/components/InlineRulesControl.vue`、
  `web/src/lib/inline-rules.ts` + 对应 `.test.ts`；
  `web/src/config/options.ts` 新增 `inline_rules` OptionDef；
  `web/src/components/ConfigForm.vue` 增加一行 `<InlineRulesControl>` 渲染分支；
  `web/src/lib/url-builder.ts` 与 `url-parser.ts` 把 `inline_rules` 加入参数表；
  README 补说明。
- 不动 ext_ruleset、不动 getgroupnames、不动 ExtraRulesetsControl、不动 useGroupNames。
- 不引入新依赖。

## 后续（非本 change）

- 把 ext_ruleset 和 inline_rules 合并到 tab 控件（用户反馈多时再做）。
- 给 inline_rules 单独给更小上限（用户量大时再做）。
