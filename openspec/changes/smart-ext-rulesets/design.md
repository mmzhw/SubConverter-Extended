# Design: 额外规则集智能化（/getgroupnames + 行式控件）

## Context

- `ext_ruleset=` 已上线：后端在 `buildExternalConfigFetchPlan`（`src/handler/interfaces.cpp`）里校验组名 ∈ `collectExternalGroupNames(extconf)`（`custom_proxy_group` 解析结果 + 4 个 fallback 组 Proxy/Direct/REJECT/GLOBAL），非法组名返回 400 并列出合法组名。
- 前端：`web/src/config/options.ts` 的 `ext_ruleset` OptionDef（`type: 'string'`, `multiline: true`），`ConfigForm.vue` 渲染为 textarea；`buildSubUrl` 把多行 join 成 `;`，`parseSubUrl` 反向 split 回 `\n`。
- 用户痛点：格式看不懂（"组名,URL"一行拼法）、组名不知道填什么（合法组名只有后端 400 才知道）。
- 已确认：组名来源走**后端新接口**（不用前端直拉 .ini，避开 CORS 与自定义 URL 不可达问题）。

## Goals / Non-Goals

**Goals:**

- 新增 `GET /getgroupnames?config=<url>`，返回 `{"groups":[...]}`，与 ext_ruleset 校验共用 `collectExternalGroupNames`，保证清单一致。
- 前端"额外规则集"改为行式控件：组名下拉（自动加载）+ URL 输入 + 增删行；组名加载失败退化自由输入。
- 状态模型不变（`Group,URL;...` 字符串），URL round-trip / localStorage 预设 / 后端协议零改动。
- 所有新增逻辑可单测（行 ↔ 字符串互转纯函数；组名加载 composable mock fetch）。

**Non-Goals:**

- 不做规则源"超市"、不做域名/关键词直接录入生成规则（记为后续 change）。
- 不改 ext_ruleset 的校验、合并、错误语义。
- 不做后端缓存（前端内存缓存 + 防抖足够）。
- 不开放其它 target（接口只服务 clash 语义，与 ext_ruleset 一致）。

## Decisions

### D1: 接口 `GET /getgroupnames?config=<url>`

- 命名与 `/getruleset`、`/getprofile` 风格一致。
- 实现路径：拉取 config（复用 `buildExternalConfigFetchPlan` 同款 fetch 参数：PublicRequest 上下文、代理策略、GitHub 代理前缀）→ 解析 `ExternalConfig` → `collectExternalGroupNames` → 排序输出。
- 错误：config 缺失 / 拉取失败 / 解析失败 → 400 + 双语文案；无任何组（理论上不可能，因 fallback 恒在）→ 仍返回 4 个 fallback。
- 安全：与 `config=` 完全相同的出站策略与 fetch 上下文，无新增攻击面；响应不含配置内容。

### D2: 前端状态模型不变，行 ↔ 字符串互转放纯函数

`web/src/lib/ext-rulesets.ts`：

```ts
export interface ExtRulesetRow { group: string; url: string }
export function parseExtRulesetRows(value: string): ExtRulesetRow[]  // ';' split → 首个 ',' 拆
export function serializeExtRulesetRows(rows: ExtRulesetRow[]): string // 过滤空行 → join ';'
```

组件内部持 `rows` 派生状态，`@update:model-value` 时 `serialize` 回写 `options.ext_ruleset`。`buildSubUrl` / `parseSubUrl` 的既有逻辑不动（它们本就以 `;` 为界），两套互转逻辑共享同一 lib 函数（`url-parser.ts` 的反向解析可改为调用 `parseExtRulesetRows` + join `\n`，保持行为等价）。

### D3: 组名加载 composable `useGroupNames(configUrl)`

- `300ms` 防抖；按 `configUrl` 内存 Map 缓存（组件卸载不清理，页面生命周期内有效——列表足够小）。
- fetch `${backendBase}/getgroupnames?config=<encodeURIComponent(configUrl)>`；backendBase 用 `backendBaseForState`。
- 状态：`{ groups, loading, error }`。`error` 时组件显示行内提示 + 下拉 `allow-create` 自由输入。
- `configUrl` 为空 → 直接返回 4 个 fallback 组 + 提示文案（不发请求）。

### D4: 组件 `ExtraRulesetsControl.vue`

- Props：`modelValue: string`（对应 `options.ext_ruleset`）、`configUrl: string`、`backendBase: string`。Emits：`update:modelValue`。
- 内部：`rows = ref(parseExtRulesetRows(modelValue))`，watch modelValue 外部变化（导入链接回填）→ 重新解析。
- 每行：`el-select`（组名，`filterable` + `allow-create` + `default-first-option`）+ `el-input`（URL，`placeholder` 用 OptionDef 占位符）+ 删除按钮（行数 > 1 时显示；等于 1 时删除 = 清空该行内容）。
- "＋ 添加规则"按钮 append 空行；空行序列化时被过滤（与现行为一致）。
- 组名下拉加载中：`loading` 属性转圈；加载失败：行内 `el-alert`-like 小字提示（项目内样式，不引新组件）。

### D5: nginx 路径注册

`/getgroupnames` 加入 `docker/nginx/subconverter-paths.txt`（nginx 反代清单），并在 `src/server` 的路由注册表登记（与 `/getruleset` 同方式）。裸机直连 25500 部署无需额外配置。

## Risks / Trade-offs

- [接口被滥用刷第三方 URL] → 与 `config=` 同等的 PublicRequest 上下文与出站策略；组名响应极小；若未来需要可加 `max_allowed_rulesets` 级配额。
- [前端内存缓存陈旧（preset 更新了组名）] → 页面刷新即失效；preset 组名变化本就罕见；代价可接受。
- [行式控件与既有 textarea 数据兼容] → 状态仍为字符串，旧 localStorage 预设、旧 URL 导入均直接可用。
- [自定义 .ini URL 拉不到组名] → 下拉退化为自由输入 + 提示，与现状（手打）体验相同，不更差。

## Migration Plan

- 无破坏性变更。URL 协议、预设存储格式、后端 ext_ruleset 行为均不变。
- 部署侧：nginx 清单补一个路径（镜像内文件，重打镜像生效）。

## Open Questions

<!-- 无：D1–D5 已确定 -->