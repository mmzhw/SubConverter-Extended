# Spec: smart-ext-rulesets

## Purpose

让"额外规则集"（ext_ruleset=）对不懂规则配置的用户可用：前端把"组名,URL"一行格式拆成结构化行式控件（组名下拉 + URL 输入），组名列表由后端新接口 `/getgroupnames` 从所选远程配置自动加载。URL 协议、校验语义、输出行为与既有 ext_ruleset 完全一致。

## Requirements

### Requirement: 后端接口 `/getgroupnames`

系统 MUST 支持 `GET /getgroupnames?config=<百分号编码的 .ini URL>`：

- 成功响应：HTTP 200，`Content-Type: application/json`，body `{"groups":["Direct","Domestic",...]}`，按字母升序，MUST 包含 4 个 fallback 组（`Direct`、`GLOBAL`、`Proxy`、`REJECT`）以及所选配置 `custom_proxy_group` 中定义的所有组名，去重。
- `config` 参数缺失或为空：HTTP 400 + 双语文案。
- config 拉取失败（非 2xx / 空内容）或解析失败：HTTP 400 + 双语文案（指明来源 URL 与原因）。
- 响应 MUST NOT 包含配置内容或任何非组名数据。
- 出站拉取策略与 `config=` 参数一致（同 fetch 上下文、同代理策略、同 GitHub 代理前缀处理）。

#### Scenario: 正常查询

- **WHEN** `GET /getgroupnames?config=<data:%20URI 编码的 fixture preset，含 custom_proxy_group=MyGroup`select`DIRECT>`
- **THEN** 200，`groups` 为字母序数组，包含 `Direct`、`GLOBAL`、`MyGroup`、`Proxy`、`REJECT`，无重复项

#### Scenario: config 缺失

- **WHEN** `GET /getgroupnames`（无 config 参数）
- **THEN** 400 + 双语文案

#### Scenario: 拉取失败

- **WHEN** `GET /getgroupnames?config=<不可达 URL>`
- **THEN** 400 + 双语文案（含来源标识）

#### Scenario: 组名清单与 ext_ruleset 校验一致

- **WHEN** 同一 config 分别请求 `/getgroupnames` 与带非法组名的 `ext_ruleset=` 转换
- **THEN** `/getgroupnames` 返回的组名集合 MUST 与 ext_ruleset 校验接受的组名集合**完全一致**（两者共用 `collectExternalGroupNames` 同一函数产出）

### Requirement: 行 ↔ 字符串互转纯函数

`web/src/lib/ext-rulesets.ts` MUST 导出：

```ts
export interface ExtRulesetRow { group: string; url: string }
export function parseExtRulesetRows(value: string): ExtRulesetRow[]
export function serializeExtRulesetRows(rows: ExtRulesetRow[]): string
```

- `parseExtRulesetRows`：按 `;` split，每条按首个 `,` 拆 group/url，trim；忽略空条目与 `#` 开头条目；无 `,` 的条目忽略。
- `serializeExtRulesetRows`：过滤 group 与 url 均为空的行，trim 后按 `;` join。
- round-trip：`parse(serialize(rows))` 与输入 rows 等价（忽略空行后）。

#### Scenario: 多行互转

- **WHEN** `parseExtRulesetRows("Proxy,https://a/p.list;Domestic,https://b/d.list")`
- **THEN** 返回 `[{group:"Proxy",url:"https://a/p.list"},{group:"Domestic",url:"https://b/d.list"}]`

#### Scenario: 序列化过滤空行

- **WHEN** `serializeExtRulesetRows([{group:"Proxy",url:"https://a"}, {group:"",url:""}, {group:"Domestic",url:"https://b"}])`
- **THEN** 返回 `"Proxy,https://a;Domestic,https://b"`

### Requirement: 组名加载 composable `useGroupNames(configUrl)`

`web/src/composables/useGroupNames.ts` MUST：

- configUrl 为空：不发请求，返回 4 个 fallback 组 + 不显示错误。
- 300ms 防抖后请求 `${backendBase}/getgroupnames?config=<encodeURIComponent(configUrl)>`。
- 按 configUrl 内存缓存（相同 URL 不重复请求）。
- 暴露 `{ groups, loading, error }`；失败时 `error` 为真、`groups` 保持上次成功值或空。

#### Scenario: 缓存命中

- **WHEN** 同一 configUrl 连续两次触发加载（如切换其它选项后再切回）
- **THEN** 只发出一次 HTTP 请求

#### Scenario: 失败回退

- **WHEN** 请求返回 400
- **THEN** `error` 为真，UI 显示"组名加载失败，可手动输入"提示，下拉允许自由输入

### Requirement: 行式控件 `ExtraRulesetsControl.vue`

- Props：`modelValue: string`、`configUrl: string`、`backendBase: string`；Emits：`update:modelValue`。
- 渲染：每行 = 组名下拉（`filterable` + `allow-create`，选项来自 `useGroupNames`）+ URL 输入 + 删除按钮；底部"＋ 添加规则"。
- 行为：
  - modelValue 外部变化（导入链接回填）→ 重新解析为行。
  - 任何行编辑 → 序列化并 emit `update:modelValue`。
  - 删除按钮：行数 > 1 时删除该行；行数 = 1 时清空该行（等效空输入，序列化后为 `""`）。
  - "远程配置"为空：显示引导提示"选择远程配置后自动加载组名"，下拉仅 4 个 fallback 组。

#### Scenario: 与旧数据兼容

- **WHEN** 导入含 `ext_ruleset=Proxy,https://a;Domestic,https://b` 的旧链接
- **THEN** 控件显示两行，组名下拉分别选中 `Proxy`、`Domestic`，URL 框填充对应值

#### Scenario: 生成 URL 不变

- **WHEN** 通过行式控件添加两行（Proxy,https://a；Domestic,https://b）后生成订阅链接
- **THEN** URL 含 `ext_ruleset=Proxy,https://a;Domestic,https://b`（编码后），与 textarea 时代行为一致

### Requirement: nginx / 路由注册

- `/getgroupnames` MUST 加入 `docker/nginx/subconverter-paths.txt` 反代清单。
- `src/server` 路由注册表 MUST 登记 `/getgroupnames`（与 `/getruleset` 同方式）。

#### Scenario: 容器内经 nginx 可达

- **WHEN** 镜像部署后请求 `<公开入口>/getgroupnames?config=<合法 URL>`
- **THEN** 正常代理至 subconverter 并返回 JSON（不被 SPA 回退吞掉）

### Requirement: 测试与文档

- 后端 smoke（`scripts/run-subconverter-smoke.py`）新增 2 case：合法 fixture config → 200 + 组名断言；坏 URL → 400。
- 前端 vitest：`ext-rulesets.ts` 互转 case；`useGroupNames` 防抖 / 缓存 / 失败回退（mock fetch）。
- README "额外规则集" 描述更新为行式控件行为 + `/getgroupnames` 一句话说明。