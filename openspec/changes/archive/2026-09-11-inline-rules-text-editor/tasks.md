# Tasks: inline-rules-text-editor

## 1. 行文本 ↔ 结构化行 纯函数

- [x] 1.1 `web/src/lib/inline-rules.ts` 新增 `InlineRuleLineParse { rows; invalidLines }`、`parseInlineRuleLines(text)`、`serializeInlineRuleLines(rows)`：首个逗号切模式、末个逗号切组名、中间为值；trim；空行与 `#` 注释跳过且不计无效；字段不足或任一字段为空计为无效行。验证：`npx vitest run inline-rules` 全绿
- [x] 1.2 `web/src/lib/inline-rules.test.ts` 覆盖：正常多行、值含逗号（`DOMAIN-REGEX,^a,b$,Domestic`）、空行与 `#` 不计无效、字段不足计入无效、空字段计入无效、`serialize → parse` round-trip、`parse` 后无效行数为 0 的场景。验证：同上

## 2. 控件模式切换

- [x] 2.1 `InlineRulesControl.vue`：新增 `mode = ref<'rows' | 'text'>('rows')`、`textValue = ref('')`、`invalidLines = ref(0)`；`switchMode(next)` 按 D4 同步（rows→text 用 `serializeInlineRuleLines`，text→rows 用 `parseInlineRuleLines().rows`）。验证：`npm run build` 通过
- [x] 2.2 模板：控件右上角/底部 meta 行加切换按钮（`el-button link` + 图标）；`mode === 'rows'` 渲染现有行式 UI，`mode === 'text'` 渲染 `el-input type="textarea" :rows="8"`。验证：`npm run build` 通过
- [x] 2.3 文本模式的输入处理：`onTextInput(value)` → `parse(value)` → 更新 `invalidLines` → `rows` ← `parsed.rows` → emit `serializeInlineRuleRows(rows)`。验证：`npm run build` 通过
- [x] 2.4 无效行提示：`invalidLines > 0` 时在编辑器下方显示「N 行无法识别，不会写入链接；切回行式编辑会丢弃」。验证：手工走查 + 构建通过
- [x] 2.5 确认外部 `modelValue` 变化（导入链接回填）在两种模式下都正确：行式模式走既有 watch；文本模式若处于激活状态需同步刷新 `textValue`。验证：手工走查

## 3. i18n

- [x] 3.1 `zh-CN.ts` / `en.ts` 补：模式切换按钮文案（切到文本 / 切到行式）、文本编辑器占位符、无效行提示（含 `{count}` 插值）。验证：`npx vue-tsc --noEmit` 通过

## 4. 验证与文档

- [x] 4.1 `npx vitest run` 全量 + `npx vue-tsc --noEmit` + `npm run build` 全绿
- [x] 4.2 服务器重建镜像后在浏览器走查：行式 ↔ 文本来回切换状态一致；粘贴三行生效；写一行缺组名的看到「1 行无法识别」且 URL 不含它。验证：手测
- [x] 4.3 README「内联规则」段落补一句：控件支持行式 / 文本双模式，文本格式为 `模式,值,组名`。验证：`grep -n "模式,值,组名" README.md` 命中
- [x] 4.4 OpenSpec change 归档
