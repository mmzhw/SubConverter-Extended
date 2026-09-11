## Why

「内联规则」目前只有行式控件（匹配模式 + 值 + 组名）。单条添加很直观，但**批量场景很难用**：

- 从别处一次粘贴十几条规则，要一行一行点「添加规则」再逐字段填；
- 想整体看一眼当前录了哪些规则，行式控件要上下滚动；
- 想批量改（比如把一组规则的组名统一换掉），只能逐行改。

`inline-rules` 的 specs 只要求了行式控件，没有给批量编辑留出口。

## What Changes

- **前端**：`InlineRulesControl.vue` 增加**模式切换按钮**，在「行式编辑」与「文本编辑」（大编辑器）之间切换。两种模式共享同一份状态（`options.inline_rules` 的 wire format），切换时互相同步。
- **文本编辑器格式**：一行一条规则，`匹配模式,值,组名`，例如：
  ```
  DOMAIN-SUFFIX,foo.com,Domestic
  IP-CIDR,10.0.0.0/8,Proxy
  ```
  与行式控件的字段顺序一致，也与生成配置里 `rules:` 段的形式一致，可直接从别处粘贴。
- **解析规则**：按**首个逗号**切出模式、按**末个逗号**切出组名，中间整体作为值（因此 `DOMAIN-REGEX,^a,b$,Group` 这类含逗号的值不会被切错）。空行与 `#` 注释跳过，不计为无效。
- **无效行处理**：无法解析的行（字段不足、模式/值/组名为空）**保留在编辑器文本里**、不计入生成结果，并在编辑器下方提示「N 行无法识别」。切回行式编辑时这些行会被丢弃，因此提示文案需说明。
- **纯函数**：`web/src/lib/inline-rules.ts` 新增 `parseInlineRuleLines`（返回 `{rows, invalidLines}`）与 `serializeInlineRuleLines`，配套 vitest。
- **i18n**：模式切换按钮、无效行提示、编辑器占位符的中英文案。

## Capabilities

### New Capabilities

<!-- 无：这是对既有 inline-rules 能力的增强，不引入新能力 -->

### Modified Capabilities

- `inline-rules`: 「前端行式控件」这条需求扩展为**行式 / 文本双模式控件**，新增 `匹配模式,值,组名` 行文本格式与无效行计数行为。

## Impact

- 前端：`web/src/components/InlineRulesControl.vue`（模式切换 + 文本编辑器分支）、
  `web/src/lib/inline-rules.ts` + `.test.ts`（新增两个纯函数）、
  `web/src/i18n/locales/{zh-CN,en}.ts`（三条文案）。
- 后端与 URL 协议**零改动**：`options.inline_rules` 仍是 `Group:TYPE,value|TYPE,value;...`
  的 wire format，`buildSubUrl` / `parseSubUrl` 不变。
- 不引入新依赖；不改变默认模式（默认仍是行式编辑）。
- 不改 `部署/镜像`：纯前端改动，随 Web UI 一起构建。
