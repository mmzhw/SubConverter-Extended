## Why

用户报告：订阅源地址填了两个机场、用逗号分隔，生成的订阅里**只有一个机场的节点**。

实测复现（`target=clash`，两个本地托管的可区分订阅源）：

| `url=` 写法 | 结果 |
| --- | --- |
| `A\|B`（竖线） | **2 个 proxy-provider** ✓ |
| `A\|B\|C` | **3 个** ✓ |
| `A,B`（逗号） | **1 个**，且 `url:` 是 `http://…/nodes.txt,http://…/nodes2.txt` ✗ |
| `A;B`（分号） | 1 个，同上 ✗ |
| `A<换行>B` | 1 个，两串直接粘连 ✗ |

后端本身没问题：**`|` 就是 subconverter 传统的多订阅源分隔符**。问题在前端：

- `web/src/lib/url-builder.ts:39` 把 `state.sourceUrl` **原样**塞进 `url=`
- `useFormState.validateSource()` 用 `new URL(value)` 校验，而
  `https://a/x,https://b/y` **是合法 URL**（逗号在路径中是合法字符）→ 校验通过
- 于是整串被当作**一个**订阅源 URL 发出去，客户端拿到一个取不回来的地址

`url=` 参数里逗号另有含义（分隔"源前缀选项"与 URL，见 `interval:21600,https://…`），
所以逗号**不能**当多源分隔符。

同时用户提出：多源输入现在的单行输入框不好用，希望改成和内联规则一样的大文本框，
一行一个。

## What Changes

- **前端输入形态**：订阅源地址由单行 `el-input` 改为多行文本域，**一行一个订阅源**。
- **状态规范形**：`state.sourceUrl` 统一存放**换行分隔**的规范化文本（人可读、可编辑）。
- **生成链接**：`buildSubUrl` 在写入 `url=` 参数前把换行转成 `|`，即向后端发送
  `url=<源1>|<源2>`。
- **解析链接**：`parseSubUrl` 读到 `url=` 时把 `|` 还原成换行，保证导入→再生成的往返一致。
- **校验**：逐行校验；单行内出现"逗号紧跟 http(s)://"这种典型的逗号误用形态时，
  给出**明确提示**（说明应一行一个 / 或用 `|`），而不是静默生成坏链接。
  源前缀形态（`interval:21600,https://…`）在现有界面本就被 `new URL()` 判为非法，
  因此该提示不引入新的误报。
- **纯函数**：新增 `web/src/lib/source-urls.ts` 承载分隔/拼接/规范化逻辑并配套单测，
  组件只负责渲染。

## Capabilities

### New Capabilities

<!-- 无 -->

### Modified Capabilities

- `web-config-ui`：扩展「可视化组装订阅 URL」需求 —— 订阅源地址改为多行输入，
  并明确多个订阅源在 `url=` 参数中的分隔符是 `|`。

## Impact

- 前端：`web/src/components/ConfigForm.vue`（输入控件）、
  `web/src/lib/source-urls.ts`（新增）+ 单测、
  `web/src/lib/url-builder.ts`、`web/src/lib/url-parser.ts`、
  `web/src/composables/useFormState.ts`（逐行校验）、i18n 文案。
- **后端不改**：`|` 是既有且已验证的写法。
- 兼容性：既有链接若用 `|` 分隔，导入后显示为多行，再生成仍然正确（往返一致）；
  单源链接行为不变。
- 历史链接若误用逗号分隔，本身产出的是坏配置；本次不静默"修复"它们，
  而是在界面给出可操作的提示。
