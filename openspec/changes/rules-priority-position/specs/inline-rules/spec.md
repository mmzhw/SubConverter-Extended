## ADDED Requirements

### Requirement: 内联规则落点选择 `inline_rules_prepend=`

系统 MUST 支持 `inline_rules_prepend=<value>`，其值线格式与 `inline_rules=` 完全相同
（`Group:TYPE,value|TYPE,value;Group2:TYPE,value`），解析语义、组名校验
（`collectExternalGroupNames`）、单条规则校验（`parseExternalClashRules`，`require_target=false`）、
target / `list` / `script` gating 与错误文案 MUST 与 `inline_rules=` 逐项一致。

- 该参数的规则 MUST 落在最终 Clash `rules:` 的**用户前置槽位**，即整张规则表的最前面，
  排在远程配置 `[ruleprepend]` 贡献之前。
- `inline_rules=` 的既有落点（generated 规则之后、兜底 `MATCH` 之前）MUST 保持不变。
- 同一次请求里两个参数 MUST 可同时使用：`inline_rules_prepend=` 的规则在前，
  `inline_rules=` 的规则在后，各自内部保持参数内顺序。
- 条数限额 MUST 按两参数之和计算，不得超过 `settings.max_allowed_rulesets`。
- `inline_rules_prepend=` 为空或仅空白时 MUST NOT 产生规则、MUST NOT 报错。

#### Scenario: 置顶内联规则排到端口规则之前

- **WHEN** 请求带
  `inline_rules_prepend=♻️ 自动选择:DOMAIN-KEYWORD,netmarble`，且所选 preset 的规则表里
  存在 `DST-PORT,444-65535,🔀 非标端口`
- **THEN** 输出 YAML 中 `DOMAIN-KEYWORD,netmarble,♻️ 自动选择` MUST 出现在
  `DST-PORT,444-65535,🔀 非标端口` 之前
- **AND** 该规则 MUST NOT 出现在兜底 `MATCH` 之后

#### Scenario: 置顶与追加同时使用

- **WHEN** `inline_rules_prepend=Proxy:DOMAIN-KEYWORD,top` 与
  `inline_rules=Proxy:DOMAIN-KEYWORD,bottom` 同时出现
- **THEN** 输出 MUST 含两条规则，`DOMAIN-KEYWORD,top,Proxy` 在 `DOMAIN-KEYWORD,bottom,Proxy` 之前
- **AND** 两条规则各自的落点相对 preset 规则与本次变更前该参数单独使用时的语义一致

#### Scenario: 置顶参数的校验与追加参数一致

- **WHEN** `inline_rules_prepend=NotARealGroup:DOMAIN-SUFFIX,foo.com` 或
  `inline_rules_prepend=Proxy:MATCH,DIRECT` 或 `inline_rules_prepend=Proxy:DOMAIN-SUFFIX,`
- **THEN** 三种情况 MUST 各自返回 HTTP 400 双语报错，文案与 `inline_rules=` 的对应失败场景一致

#### Scenario: 合并限额

- **WHEN** `settings.max_allowed_rulesets` 为 64，`inline_rules=` 声明 40 条规则、
  `inline_rules_prepend=` 声明 25 条规则
- **THEN** 响应 MUST 为 HTTP 400，报错 MUST 指明 `max_allowed_rulesets` 与其取值

#### Scenario: 空置顶参数

- **WHEN** `inline_rules_prepend=` 为空或仅空白
- **THEN** 响应 MUST 为 200，且规则表与不带该参数时逐条一致

### Requirement: 前端内联规则落点开关

`InlineRulesControl` MUST 提供落点开关，取值 `prepend`（置顶）与 `append`（末尾，默认），
且 MUST 满足：

- 控件内部规则内容与行/文本双模式行为 MUST NOT 因落点改变。
- 落点为 `append` 时，`update:modelValue` 的产出 MUST 与本次变更前逐字节一致。
- 落点为 `prepend` 时，页面生成的订阅链接 MUST 把该控件内容写进 `inline_rules_prepend=`，
  MUST NOT 同时写出 `inline_rules=`。
- 选择 `prepend` 时 MUST 显示提示：这些规则优先级最高，会排在 preset 自身规则（含内网直连类）
  之前。
- 落点开关 MUST 在行模式与文本模式下都可用，切换编辑模式 MUST NOT 重置落点。

#### Scenario: 切换落点保留内容

- **WHEN** 控件里有 `DOMAIN-SUFFIX,foo.com` → `Domestic`，用户把落点切到"置顶"
- **THEN** 规则仍在控件里，匹配模式、值、组名均不变
- **AND** 切回"末尾"后内容仍不变

#### Scenario: 置顶时链接参数切换

- **WHEN** 落点为"置顶"且控件含 `DOMAIN-SUFFIX,foo.com` → `Domestic`
- **THEN** 生成的链接含 `inline_rules_prepend=Domestic%3ADOMAIN-SUFFIX%2Cfoo.com`
- **AND** 不含 `inline_rules=`

#### Scenario: 落点在两种编辑模式间保持

- **WHEN** 落点为"置顶"，用户从行模式切到文本模式再切回行模式
- **THEN** 落点 MUST 仍为"置顶"

#### Scenario: 导入置顶链接回填落点

- **WHEN** 导入含 `inline_rules_prepend=Domestic%3ADOMAIN-SUFFIX%2Cfoo.com` 的链接
- **THEN** 控件显示该规则且落点为"置顶"
- **AND** 再次生成的链接参数名与值不变
