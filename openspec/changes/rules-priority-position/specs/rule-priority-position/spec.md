## Purpose

让用户自己贡献的规则（内联规则与额外规则集）可以选择在最终 Clash 规则表中的落点：默认追加在
preset 规则之后（兜底 `MATCH` 之前），或置顶到整张规则表的最前面以获得最高匹配优先级——
解决"用户规则被 preset 里更早命中的通用规则（如 `DST-PORT` 非标端口规则）压成死代码"的问题。

## ADDED Requirements

### Requirement: 全局合并顺序与两个用户落点

系统 MUST 按下列固定顺序合并最终 Clash `rules:` 列表（`|` 表示拼接）：

```
rule_user_prepend | rule_prepend | original(non-terminal) | generated | rule_append | original(terminal) | generated(terminal)
```

- `rule_user_prepend` 是"用户前置"槽位，只承载用户通过 URL 参数声明为置顶的贡献。
- `rule_prepend` / `rule_append` 保持原语义（远程配置 ini 的 `[ruleprepend]` / `[ruleappend]`）。
- **置顶 MUST 定义为一个位置**：用户前置槽位整体排在远程配置 `[ruleprepend]` 贡献之前，
  即最终规则表的**绝对第一条**。
- 用户前置槽位内部顺序 MUST 为：先 `ext_ruleset_prepend=` 的贡献，再
  `inline_rules_prepend=` 的贡献；同一次请求内多个来源按参数里出现的顺序拼接。
- 两个槽位 MUST NOT 去重、MUST NOT 排序、MUST NOT 把用户规则插入到 preset 规则之间。
- 同一请求同时提供置顶与追加贡献时，两者 MUST 各自落位、互不影响。

#### Scenario: 置顶规则位于整张规则表最前

- **WHEN** 请求同时带 `inline_rules_prepend=Proxy:DOMAIN-KEYWORD,foo` 与
  `inline_rules=Proxy:DOMAIN-KEYWORD,bar`，且所选 preset 自身的 `[ruleprepend]` 含
  `DST-PORT,7844,DIRECT`
- **THEN** 输出 YAML 的 `rules:` 序列以 `DOMAIN-KEYWORD,foo,Proxy` 开头
- **AND** `DOMAIN-KEYWORD,foo,Proxy` MUST 出现在 `DST-PORT,7844,DIRECT` 之前
- **AND** `DOMAIN-KEYWORD,bar,Proxy` MUST 出现在 preset 的 generated 规则之后、
  兜底 `MATCH` 之前

#### Scenario: 用户前置早于 preset 的端口规则

- **WHEN** preset 的 generated 规则含 `DST-PORT,444-65535,🔀 非标端口`，用户提供
  `inline_rules_prepend=♻️ 自动选择:DOMAIN-KEYWORD,netmarble`
- **THEN** 输出中的 `DOMAIN-KEYWORD,netmarble,♻️ 自动选择` MUST 位于
  `DST-PORT,444-65535,🔀 非标端口` 之前
- **AND** 目的端口落在 444-65535 的连接 MUST 由该域名规则判定，而不是由端口规则判定

#### Scenario: 两个槽位同时使用

- **WHEN** 请求同时带 `ext_ruleset_prepend=Proxy,<url1>` 与
  `inline_rules_prepend=Proxy:DOMAIN-KEYWORD,foo`
- **THEN** 输出 MUST 先出现来自 `<url1>` 的规则（各带 `,Proxy`），再出现
  `DOMAIN-KEYWORD,foo,Proxy`

#### Scenario: 未使用置顶参数时行为不变

- **WHEN** 请求只有 `inline_rules=` 与 `ext_ruleset=`（不含任何 `_prepend` 参数）
- **THEN** 最终规则顺序 MUST 与本次变更前逐条一致
- **AND** 用户前置槽位 MUST NOT 引入任何额外规则或空占位

### Requirement: 落点参数的命名与线格式

置顶参数 MUST 为 `inline_rules_prepend=` 与 `ext_ruleset_prepend=`，各自的值线格式 MUST 与其
非置顶版本**逐字节相同**（`inline_rules_prepend` 用 `Group:TYPE,value|TYPE,value;Group2:...`，
`ext_ruleset_prepend` 用 `Group,URL[;Group,URL]...`）。系统 MUST NOT 让"落点"影响任何
解析细节，也 MUST NOT 为落点引入新的分隔符。

#### Scenario: 置顶参数复用同一线格式

- **WHEN** `inline_rules_prepend=Domestic:DOMAIN-SUFFIX,foo.com|DOMAIN-KEYWORD,bar`
- **THEN** 解析结果与 `inline_rules=Domestic:DOMAIN-SUFFIX,foo.com|DOMAIN-KEYWORD,bar` 完全相同
- **AND** 仅最终落点不同

#### Scenario: 无法识别的落点参数被忽略

- **WHEN** 请求带 `inline_rules_middle=Domestic:DOMAIN-SUFFIX,foo.com`
- **THEN** 该参数 MUST NOT 产生任何规则，也 MUST NOT 触发错误

### Requirement: 落点不影响校验与限额

置顶参数 MUST 与非置顶版本适用完全相同的校验与 gating：

- 组名 MUST 在 `collectExternalGroupNames` 产出的合法组集合内（未知组 → HTTP 400 双语报错，
  并列出可用组名）。
- 每条规则 MUST 通过 `parseExternalClashRules`（未知规则类型、空的匹配值、`MATCH`/`FINAL`
  → HTTP 400 双语报错）。
- `inline_rules*` MUST 仅对 `target ∈ {clash, clashr}` 生效；`ext_ruleset*` MUST 仅对
  `target=clash` 生效；其它 target → HTTP 400。
- `list=true` / `script=true` 组合 MUST 返回 HTTP 400。
- 限额 MUST 按"参数族"合并计数：`inline_rules` 与 `inline_rules_prepend` 的规则条数之和
  MUST NOT 超过 `settings.max_allowed_rulesets`；`ext_ruleset` 与 `ext_ruleset_prepend` 的
  来源条数之和 MUST NOT 超过同一配置。超限 MUST 返回 HTTP 400 双语报错。
- 置顶来源的排序去重语义 MUST 与追加来源一致（不去重）。

#### Scenario: 置顶参数的未知组被拒绝

- **WHEN** `inline_rules_prepend=NotARealGroup:DOMAIN-SUFFIX,foo.com`
- **THEN** 响应 MUST 为 HTTP 400，MUST 列出当前 preset 声明的合法组名

#### Scenario: 置顶参数不允许 MATCH

- **WHEN** `inline_rules_prepend=Proxy:MATCH,DIRECT`
- **THEN** 响应 MUST 为 HTTP 400（否则会截断整张规则表）

#### Scenario: 两族合并计数的限额

- **WHEN** `max_allowed_rulesets` 为 64，请求中 `inline_rules` 与 `inline_rules_prepend`
  合计声明 65 条规则
- **THEN** 响应 MUST 为 HTTP 400，报错 MUST 指明配置的限额值

#### Scenario: 置顶参数的 target gating

- **WHEN** `target=surge&inline_rules_prepend=Proxy:DOMAIN-SUFFIX,foo.com`
- **THEN** 响应 MUST 为 HTTP 400，并说明该参数仅支持 `clash`/`clashr`

### Requirement: 前端落点开关

两个规则控件（内联规则、额外规则集）MUST 各提供一个"落点"开关，取值
`prepend`（置顶 / 最高优先级）与 `append`（末尾，默认）。

- 切换落点 MUST NOT 丢失或改写已录入的规则内容，切换回来后内容与切换前一致。
- 落点 MUST NOT 改变控件内部的规则顺序、组名下拉、行/文本双模式行为。
- 选择"置顶"时 UI MUST 显示提示，说明这些规则会排在 preset 自身规则（含内网直连等）之前，
  属于最高优先级、可能影响系统级流量。
- 落点 MUST NOT 改变控件读取组名的方式（仍走 `useGroupNames`）。

#### Scenario: 切换落点不丢规则

- **WHEN** 内联规则控件里有 `DOMAIN-SUFFIX,foo.com` 指向 `Domestic`，用户把落点切成"置顶"
- **THEN** 控件仍显示同一条规则
- **AND** 生成的链接把该规则写进 `inline_rules_prepend=`

#### Scenario: 默认落点为末尾

- **WHEN** 用户打开页面、录入规则但从不碰落点开关
- **THEN** 生成的链接 MUST 仍使用 `inline_rules=` / `ext_ruleset=`，不含任何 `_prepend` 参数

#### Scenario: 置顶提示可见

- **WHEN** 用户把落点切到"置顶"
- **THEN** 控件 MUST 展示关于最高优先级的提示文案（中英双语）

### Requirement: 落点的 URL 往返

- `buildSubUrl` MUST 按当前落点写出对应参数：`append` → `inline_rules=` / `ext_ruleset=`；
  `prepend` → `inline_rules_prepend=` / `ext_ruleset_prepend=`。
- `parseSubUrl` MUST 从参数还原落点：读到 `*_prepend` 参数即把该控件的落点置为 `prepend`，
  否则置为 `append`。
- 往返 MUST 等价：导入一条只含 `*_prepend` 参数的链接，再生成链接，MUST 仍写出同名参数且值不变。
- 未设置落点的旧链接 MUST 继续 round-trip 为 `append`，MUST NOT 被自动升级或改写。
- 同一控件的置顶参数与追加参数同时出现在一条链接里时，导入 MUST 采用置顶参数的值作为该控件
  当前内容、落点为 `prepend`；另一侧的值 MUST NOT 被静默丢弃（保留在"未知参数"里供用户可见）。

#### Scenario: 置顶链接 round-trip

- **WHEN** 导入含 `inline_rules_prepend=Domestic%3ADOMAIN-SUFFIX%2Cfoo.com` 的链接
- **THEN** 控件显示该规则且落点为"置顶"
- **AND** 再次生成的链接含同名参数与相同值

#### Scenario: 旧链接不受影响

- **WHEN** 导入含 `inline_rules=Domestic%3ADOMAIN-SUFFIX%2Cfoo.com` 的旧链接
- **THEN** 落点为"末尾"，再次生成的链接参数名与值均不变

#### Scenario: 落点值不泄漏到链接里

- **WHEN** 用户把落点设为"置顶"（该值只影响写哪个参数）
- **THEN** 生成的链接 MUST NOT 出现承载落点本身语义的额外参数

#### Scenario: 两参数并存时导入

- **WHEN** 导入同时含 `inline_rules=Proxy%3ADOMAIN-KEYWORD,bottom` 与
  `inline_rules_prepend=Proxy%3ADOMAIN-KEYWORD,top` 的链接
- **THEN** 控件内容 MUST 为 `DOMAIN-KEYWORD,top`，落点为"置顶"
- **AND** `DOMAIN-KEYWORD,bottom` MUST NOT 被静默丢弃（出现在未知参数中）

### Requirement: 文档与测试

- README MUST 说明两个置顶参数、置顶与追加的精确落点、与 preset `[ruleprepend]` 的先后关系，
  以及"置顶会越过 preset 的直连类规则"这一取舍。
- `CHANGELOG.md` MUST 记录本变更。
- 后端单元测试 MUST 覆盖新的合并槽位顺序（含"未使用置顶时顺序不变"的回归断言）。
- smoke 测试（`scripts/run-subconverter-smoke.py`）MUST 新增至少 2 个 case：置顶参数成功且
  规则位于规则表最前；置顶参数的非法组名返回 400。
- 前端 vitest MUST 覆盖落点 round-trip 与两个控件的落点开关渲染。

#### Scenario: 单元测试覆盖槽位顺序

- **WHEN** 运行后端单元测试
- **THEN** MUST 存在断言：用户前置贡献排在 `rule_prepend` 之前、生成的 `MATCH` 之后无用户规则
- **AND** MUST 存在断言：`rule_user_prepend` 为空时输出顺序与旧行为一致

#### Scenario: smoke 覆盖置顶正反路径

- **WHEN** 运行 `scripts/run-subconverter-smoke.py`
- **THEN** 置顶成功 case MUST 返回 200 且用户规则位于 `rules:` 序列最前
- **AND** 置顶非法组名 case MUST 返回 400
