# preset-with-custom-rulesets Specification

## Purpose

在 Web UI 选三方规则预设（Aethersailor / ACL4SSR 等）的基础上叠加用户自定义规则，无需 fork `.ini`、无需 cron / Action 同步基础设施。三方规则由后端每次请求实时拉取，用户自定义规则随请求 URL 一并送达，在单次转换里合并到 Clash 输出。

## Requirements

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

#### Scenario: 合法组合

- **WHEN** 请求 `GET /sub?target=clash&url=<订阅>&config=<三方 .ini URL>&ext_ruleset=Proxy,https://x/p.list;Domestic,https://x/d.list`
- **THEN** 后端拉取三方 `.ini`、校验 `Proxy` 与 `Domestic` 均为已定义组、抓取两条自定义规则 URL、合并到 `base_rule["rules` 末尾、返回完整 Clash YAML
- **AND** 自定义规则在 YAML 中位于三方规则之后（追加语义）

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

### Requirement: 前端"额外规则集"控件

`web/src/config/options.ts` MUST 新增 OptionDef：

```
key: 'ext_ruleset'
type: 'string'
multiline: true
group: 'rule'
label: { en: 'Extra rulesets', zh: '额外规则集' }
description: {
  en: "One per line as 'Group,URL'. Appends rules to existing groups in the chosen preset. Each group must already exist in the preset.",
  zh: '每行一条 "组名,URL"，规则会追加到所选 preset 已存在的策略组。组名必须已在 preset 中定义。'
}
defaultValue: ''
placeholder: { en: 'Proxy,https://...\nDomestic,https://...', zh: 'Proxy,https://...\nDomestic,https://...' }
```

#### Scenario: 渲染

- **WHEN** 用户在前端"规则"分组看到"额外规则集"字段
- **THEN** MUST 渲染为 `el-input type="textarea" :rows="5"`，placeholder 按 i18n 显示
- **AND** 输入框内的换行 MUST 保留（state 保存为多行字符串）

#### Scenario: URL 拼装

- **WHEN** 用户在文本框填入：
  ```
  Proxy,https://x/p.list
  Domestic,https://x/d.list
  ```
- **THEN** `buildSubUrl` MUST 输出 `ext_ruleset=Proxy,https://x/p.list;Domestic,https://x/d.list`
- **AND** `URLSearchParams` 自动百分号编码 `,` 为 `%2C`
- **AND** 空行 / `#` 注释行 MUST 被忽略

#### Scenario: 解析回填

- **WHEN** 用户粘贴已有订阅链接，URL 含 `ext_ruleset=Proxy,https%3A%2F%2Fx%2Fp.list;Domestic,https%3A%2F%2Fx%2Fd.list`
- **THEN** `parseSubUrl` MUST 反向解码并回填文本框：
  ```
  Proxy,https://x/p.list
  Domestic,https://x/d.list
  ```
- **AND** `buildSubUrl` 再次拼装 MUST round-trip 等价

### Requirement: 组名校验数据来源

后端 `collectExternalGroupNames(extconf)` MUST 从以下来源收集合法组名集合：

1. `extconf.custom_proxy_group` 解析后的所有 group 名（与现行 `ruleprepend` / `ruleappend` 一致）
2. 模板内置 fallback 组：`Proxy`、`Direct`、`REJECT`、`GLOBAL`（与 `src/generator/template/templates.cpp` 内置 Clash 模板的 hardcoded fallback 组保持一致；后续如模板调整需同步本清单）

#### Scenario: 模板 fallback 组兜底

- **WHEN** 三方 preset 的 `custom_proxy_group` 未显式列出 `Proxy`
- **THEN** `Proxy` 仍 MUST 在 `valid_groups` 集合中（兜底）

### Requirement: 追加语义

`ext_ruleset` 抓取的每条规则 MUST 追加到 `base_rule["rules` 末尾，不做去重、不插入到三方规则之间。

#### Scenario: 三方与用户规则共存

- **WHEN** 三方 preset 提供 `ruleset=Proxy,https://upstream/p.list` 共 1000 行，用户 `ext_ruleset=Proxy,https://my/p.list` 提供 10 行
- **THEN** 输出 Clash YAML 的 `rules` 段 MUST 包含 1010 行，其中用户 10 行 MUST 出现在末尾
- **AND** 重复的 `IP-CIDR` / `DOMAIN-SUFFIX` 由 Clash 自身匹配优先级解决，后端不擅自裁剪

### Requirement: 测试覆盖

`scripts/run-subconverter-smoke.py` MUST 新增以下 case：

1. preset + 合法 `ext_ruleset=`（已知组名）→ 200 + 输出包含用户规则
2. preset + 未知组名 `ext_ruleset=` → 400 + 错误信息含合法组名
3. preset + 抓取失败的 `ext_ruleset=` URL → 400
4. preset + `target=surge` 与 `ext_ruleset=` → 400

`web/src/composables/useGenerateSubscription.test.ts` 与 `useFormState.test.ts` MUST 新增 `ext_ruleset` 多行 round-trip case。

#### Scenario: smoke 覆盖 ext_ruleset 的正反路径

- **WHEN** 运行 `scripts/run-subconverter-smoke.py`
- **THEN** 上述 4 个 case MUST 全部执行；合法输入返回 200 且输出含用户规则，未知组名 / 抓取失败 / 错误 target 均返回 400

#### Scenario: 前端多行 round-trip

- **WHEN** 表单里填写多行 `ext_ruleset` 并生成订阅 URL，再把该 URL 导回表单
- **THEN** 每一行的组名与 URL MUST 与导入前一致

### Requirement: 文档

README "规则和外部配置还支持" 段 MUST 新增 `ext_ruleset=` 用法，包含：

- URL 语法示例
- 合法组名约束说明
- 与既有 `ruleprepend` / `ruleappend` 的差异
- 错误信息解读

#### Scenario: README 覆盖 ext_ruleset

- **WHEN** 阅读 README 的"规则和外部配置还支持"段
- **THEN** MUST 能找到 `ext_ruleset=` 的语法示例、合法组名约束、与 `ruleprepend` / `ruleappend` 的差异说明，以及常见错误信息的解读
