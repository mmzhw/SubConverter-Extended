# Tasks: subscription-source-list

## 1. 纯函数

- [x] 1.1 新增 `web/src/lib/source-urls.ts`：`splitSourceUrls(text)`（按行拆分、
  trim、丢弃空行）、`joinSourceUrlsForWire(text)`（拼成 `|` 分隔）、
  `wireToSourceUrls(wire)`（`|` 还原为换行）、`hasCommaSeparatedSources(text)`
  （识别"逗号紧跟 http(s)://"的多源误用）。验证：`npx vitest run source-urls`
- [x] 1.2 `web/src/lib/source-urls.test.ts` 覆盖：多行、空行与空白、行内前缀逗号
  （`interval:21600,https://…` 不得被判为多源误用）、逗号误用识别、
  `wireToSourceUrls → joinSourceUrlsForWire` 往返一致。验证：同上

## 2. 接线

- [x] 2.1 `url-builder.ts`：写 `url=` 时改为
  `joinSourceUrlsForWire(state.sourceUrl)`。验证：`npx vitest run url-builder`
- [x] 2.2 `url-parser.ts`：读 `url=` 时改为 `wireToSourceUrls(...)`。验证：
  `npx vitest run url-parser`
- [x] 2.3 `useFormState.ts`：`validateSource` 改为逐行校验；新增
  `sourceCommaWarning`（或复用 `sourceError`）承载逗号误用文案。验证：`npx vitest run useFormState`
- [x] 2.4 `ConfigForm.vue`：订阅源输入由单行 `el-input` 改为 `el-input type="textarea"`
  （`rows` 小、可纵向拉伸），占位符与帮助文案说明"一行一个"。验证：`npm run build`
- [x] 2.5 i18n：`zh-CN.ts` / `en.ts` 增加"一行一个"的占位符/帮助文案与逗号误用提示。验证：`npx vue-tsc --noEmit`

## 3. 前端三关与回归

- [x] 3.1 `npx vitest run` 全量绿
- [x] 3.2 `npx vue-tsc --noEmit` 无错
- [x] 3.3 `npm run build` 通过
- [x] 3.4 结构回归测试：`layout-structure.test.ts` 断言订阅源控件是 textarea 且
  `url-builder` 使用 `joinSourceUrlsForWire`。验证：`npx vitest run layout-structure`

## 4. 服务器端到端验证

- [x] 4.1 用两个可区分的本地托管订阅源，确认修复后生成的链接在浏览器里产生
  **2 个 proxy-provider**。验证：无头截图 + 后端输出里的 provider 数量
- [ ] 4.2 导入一个 `url=A|B` 的旧链接，文本域显示两行，再生成后 `url=` 仍为 `A|B`。
  验证：浏览器走查
- [ ] 4.3 逗号误用时提示出现且不静默拆分。验证：浏览器走查

## 5. 文档与发布

- [x] 5.1 `README.md` 订阅源地址部分说明：多源一行一个，生成时用 `|` 连接；
  逗号不是多源分隔符
- [ ] 5.2 与 `inline-rules-group-validation` 一起收尾：同步主 spec、归档、
  CHANGELOG、commit/push、发版
