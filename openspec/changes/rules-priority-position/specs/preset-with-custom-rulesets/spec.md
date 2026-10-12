## MODIFIED Requirements

### Requirement: URL 参数 `ext_ruleset=`

系统 MUST 支持 `ext_ruleset=` URL 查询参数，语法为：

```
ext_ruleset=Group,URL[;Group,URL]...
```

- 分号 `;` 分隔多条；每条按第一个 `,` 拆为 `(group, url)`，逗号必须百分号编码为 `%2C`
- 空值 / 仅空白 / 仅注释行忽略
- `URL` 必须以 `http://` 或 `https://` 开头
- 总条数受服务端 `max_allowed_rulesets` 配置约束（与既有 `ruleprepend` / `ruleappend` 共用；默认 64，见 `base/pref.example.toml:431`）
- 仅当 `target=clash` 时生效；其它 target MUST 返回 400
- 与 `list=true` / `script=true` 互斥，组合使用 MUST 返回 400
- 本参数的同族置顶版本为 `ext_ruleset_prepend=`，其线格式、校验、gating、限额 MUST 与
  `ext_ruleset=` 逐项一致，仅最终落点不同（见"规则落点语义"要求）；总条数限额 MUST 按
  `ext_ruleset=` 与 `ext_ruleset_prepend=` 的条数之和计算

#### Scenario: 合法组合

- **WHEN** 请求 `GET /sub?target=clash&url=<订阅>&config=<三方 .ini URL>&ext_ruleset=Proxy,https://x/p.list;Domestic,https://x/d.list`
- **THEN** 后端拉取三方 `.ini`、校验 `Proxy` 与 `Domestic` 均为已定义组、抓取两条自定义规则 URL、合并到 `base_rule["rules"]`、返回完整 Clash YAML
- **AND** 自定义规则在 YAML 中位于三方生成规则之后、兜底终结规则（`MATCH` / `FINAL`）之前

#### Scenario: 置顶参数

- **WHEN** 请求带 `ext_ruleset_prepend=Proxy,https://x/p.list`
- **THEN** 后端抓取并解析该 URL，规则各带 `,Proxy`
- **AND** 这些规则 MUST 出现在最终 `rules:` 序列的最前面，排在远程配置 `[ruleprepend]` 贡献之前

#### Scenario: 两族合并计数的限额

- **WHEN** `ext_ruleset=` 与 `ext_ruleset_prepend=` 的来源条数之和 > `max_allowed_rulesets`
- **THEN** MUST 返回 HTTP 400，文案与既有 `ruleprepend` / `ruleappend` 总数限制对齐

#### Scenario: 未知组名

- **WHEN** `ext_ruleset=MyGroup,https://x/p.list` 且所选三方 preset 未定义 `MyGroup`
- **THEN** MUST 返回 HTTP 400
- **AND** 错误信息 MUST 包含引用不存在的组名 + 上游已定义的合法组名列表（按字母序排序，截断到前 20 个；超过时附加"... (N more, see preset for full list)"提示用户查看完整列表）
- **AND** MUST 提供中英文双语消息

#### Scenario: URL 抓取失败

- **WHEN** `ext_ruleset=` 中某条 URL 抓取返回非 2xx 或内容为空
- **THEN** MUST 返回 HTTP 400
- **AND** MUST 指明第几条（`ext_ruleset source #N`）抓取失败

#### Scenario: URL 内容无可用规则

- **WHEN** `ext_ruleset=` 中某条 URL 抓取成功但解析后无任何可用规则
- **THEN** MUST 返回 HTTP 400
- **AND** MUST 包含"no usable rules were found"提示

#### Scenario: target 非 clash

- **WHEN** `target=surge`（或其它非 clash）与 `ext_ruleset=` 同时出现
- **THEN** MUST 返回 HTTP 400
- **AND** 文案与 `ruleprepend` / `ruleappend` 限制场景对齐

#### Scenario: list=true / script=true 互斥

- **WHEN** `ext_ruleset=` 与 `list=true` 或 `script=true` 同时出现
- **THEN** MUST 返回 HTTP 400

#### Scenario: 总条数超限

- **WHEN** `ext_ruleset=` 条数 > `max_allowed_rulesets`
- **THEN** MUST 返回 HTTP 400
- **AND** 文案与 `ruleprepend` / `ruleappend` 总数限制对齐

### Requirement: 追加语义

`ext_ruleset` 抓取的每条规则 MUST 追加到 `base_rule["rules"]` 末尾，不做去重、不插入到三方规则之间；
此处的"末尾"MUST 精确定义为 preset generated 规则之后、兜底终结规则（`MATCH` / `FINAL`）之前。

该系统 MUST 同时支持置顶语义：`ext_ruleset_prepend=` 抓取的规则 MUST 落在最终规则表的最前面，
排在远程配置 `[ruleprepend]` 贡献之前。两种落点 MUST NOT 相互改变对方的相对位置。

#### Scenario: 三方与用户规则共存

- **WHEN** 三方 preset 提供 `ruleset=Proxy,https://upstream/p.list` 共 1000 行，用户 `ext_ruleset=Proxy,https://my/p.list` 提供 10 行
- **THEN** 输出 Clash YAML 的 `rules` 段 MUST 包含 1010 行，其中用户 10 行 MUST 出现在末尾（即三方生成规则之后、终结规则之前）
- **AND** 重复的 `IP-CIDR` / `DOMAIN-SUFFIX` 由 Clash 自身匹配优先级解决，后端不擅自裁剪

#### Scenario: 置顶越过端口规则

- **WHEN** 用户 `ext_ruleset_prepend=♻️ 自动选择,https://my/domain.list` 提供
  `DOMAIN-KEYWORD,netmarble`，而 preset 规则表含 `DST-PORT,444-65535,🔀 非标端口`
- **THEN** 输出中 `DOMAIN-KEYWORD,netmarble,♻️ 自动选择` MUST 位于
  `DST-PORT,444-65535,🔀 非标端口` 之前

#### Scenario: 未使用置顶时的顺序与变更前一致

- **WHEN** 请求只用 `ext_ruleset=`（不含 `ext_ruleset_prepend=`）
- **THEN** 输出规则顺序 MUST 与本次变更前逐条一致

## ADDED Requirements

### Requirement: 前端额外规则集落点开关

`ExtraRulesetsControl` MUST 提供落点开关，取值 `prepend`（置顶 / 最高优先级）与
`append`（末尾，默认），且 MUST 满足：

- 落点为 `append` 时产出 MUST 与本次变更前逐字节一致（写 `ext_ruleset=`）。
- 落点为 `prepend` 时，生成的链接 MUST 写 `ext_ruleset_prepend=`，MUST NOT 同时写 `ext_ruleset=`。
- 切换落点 MUST NOT 丢失或改写已录入的 `组名,URL` 行。
- 选择 `prepend` 时 MUST 显示提示：这些规则优先级最高，会排在 preset 自身规则之前。
- 组名下拉与 `useGroupNames` 加载行为 MUST NOT 因落点改变。

#### Scenario: 切换落点保留行

- **WHEN** 控件有 `Proxy,https://x/p.list` 一行，用户把落点切到"置顶"
- **THEN** 该行仍显示组名 `Proxy` 与 URL `https://x/p.list`
- **AND** 生成的链接含 `ext_ruleset_prepend=Proxy%2Chttps%3A%2F%2Fx%2Fp.list`，不含 `ext_ruleset=`

#### Scenario: 导入置顶链接回填

- **WHEN** 导入含 `ext_ruleset_prepend=Proxy%2Chttps%3A%2F%2Fx%2Fp.list` 的链接
- **THEN** 控件显示该行且落点为"置顶"

#### Scenario: 默认落点不改旧链接行为

- **WHEN** 用户只用默认落点录入若干行
- **THEN** 生成的链接 MUST 只含 `ext_ruleset=`，与变更前一致
