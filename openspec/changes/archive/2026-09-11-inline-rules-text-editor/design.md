## Context

`InlineRulesControl.vue`（`smart-ext-rulesets` → `inline-rules` 落地）是行式控件：
`rows: InlineRuleRow[]` 派生自 `props.modelValue`，编辑后
`serializeInlineRuleRows(complete)` 回写 wire format。

Wire format 是 `Group:TYPE,value|TYPE,value;Group2:...`（后端
`parseInlineRules` 解析）。它紧凑但**不适合人读写**：一条组下多条规则挤在一行，
批量粘贴时要手工拼 `:` 和 `|`。

`ext_ruleset` 的历史提供了一个先例：它早期就是多行 textarea（一行 `组名,URL`），
后来才升级为行式控件（`ExtraRulesetsControl.vue`），且 `parseExtRulesetRows`
刻意同时接受 `\n` 与 `;` 两种分隔。也就是说，**"行文本 ↔ 结构化行" 在本项目里
已有既定做法**，本次沿用。

## Goals / Non-Goals

**Goals:**

- 同一控件内可切换「行式编辑」与「文本编辑」，两者状态互通。
- 文本格式选 `匹配模式,值,组名`：与行式字段顺序一致，也与生成配置 `rules:` 段的
  形式一致，方便从别处粘贴。
- 解析对"值里含逗号"健壮（首个逗号 + 末个逗号定位）。
- 无效行不静默消失：保留文本 + 计数提示。
- URL 协议、`buildSubUrl` / `parseSubUrl`、后端零改动。

**Non-Goals:**

- 不做语法高亮 / 自动补全 / 多光标等编辑器功能（用 `el-input type="textarea"`）。
- 不做"两套格式都收"的容错解析（用户明确选了单一格式）。
- 不记忆模式选择（不做跨会话持久化）。
- 不改默认模式（仍是行式编辑）。

## Decisions

### D1: 文本格式用 `模式,值,组名`，而不是 wire format

- 与行式控件的视觉顺序一致（模式 → 值 → 组），切换时认知成本最低。
- 与生成配置里 `rules:` 段的一行完全同形（`DOMAIN-SUFFIX,foo.com,Domestic`），
  用户可以从别处直接拷。
- 备选：直接编辑 wire format `Group:TYPE,value|...`。更"原生"（可从 URL 拷），
  但一条组下多条规则挤一行，恰恰是本次要解决的"难读"问题。

### D2: 首个逗号切模式、末个逗号切组名

值里可能含逗号（`DOMAIN-REGEX,^a,b$,Domestic`、`GEOIP` 不会但 regex 会）。
用"首个 + 末个"定位后，中间整体是值，天然正确。

备选：`split(',')` 后按固定下标取字段——含逗号的值会被切错，且 `DOMAIN-REGEX`
是本控件下拉里就提供的选项，不能不管。

### D3: 无效行保留在文本里，只计数不阻断

用户明确选择。理由：排版过程中会频繁出现半成品行，直接报错会打断输入；
但静默丢弃又会让人以为规则生效了。折中是**保留 + 计数 + 说明切回行式会丢弃**。

计数只统计"非空且非注释"的行，因此空行与 `#` 说明不会触发提示。

### D4: 切换方向决定同步行为

- 行式 → 文本：`textValue = serializeInlineRuleLines(rows)`
- 文本 → 行式：`rows = parseInlineRuleLines(textValue).rows`（无效行在此丢失，已在 D3 的提示里说明）

不保留"上次的原始文本"，避免来回切换时出现幽灵内容。

### D5: 纯函数放 `lib/inline-rules.ts`，与既有互转函数并列

```ts
export interface InlineRuleLineParse {
  rows: InlineRuleRow[];
  invalidLines: number;
}
export function parseInlineRuleLines(text: string): InlineRuleLineParse
export function serializeInlineRuleLines(rows: InlineRuleRow[]): string
```

`parseInlineRuleLines` 返回对象而非数组，因为 UI 需要同时拿到行集合与无效计数，
避免在组件里重复遍历。

### D6: 组件内单一状态源

两种模式共享 `rows`（行式模式编辑它；文本模式由它序列化生成文本）。
文本编辑时：`parse(text).rows` → `rows` → `serializeInlineRuleRows` → emit。
也就是说**文本模式也经过结构化行**，保证两种模式对"半填行"的处理完全一致。

## Risks / Trade-offs

- [切回行式会丢无效行] → D3 的提示里明确写出，且这些行本来也不进 URL。
- [值里同时含逗号和组名歧义] → 用"首个 + 末个逗号"后，只有"值本身以组名结尾"
  这种情况才可能误判；实际上组名来自 preset，是固定集合，可忽略。
- [控件变复杂] → 默认仍是行式模式，不点按钮完全等同于现有体验。
- [i18n 遗漏] → 新增三条文案同时在 `zh-CN.ts` 与 `en.ts` 落地。

## Migration Plan

- 无破坏性变更：wire format 与后端协议不变，旧链接、旧预设直接可用。
- 部署：纯前端改动，重建 Web 产物即可。

## Open Questions

<!-- 无：格式与无效行策略已由用户确认 -->
