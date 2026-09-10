# Proposal: 在 Web UI 选三方规则预设的基础上叠加用户自定义规则

## Why

当前 Web UI 的「远程配置」下拉框（`config=`）只能选**一个**三方预设（Aethersailor / ACL4SSR）或粘贴一个 `.ini` URL。当用户在一个预设基础上需要追加几条自己的规则（例如把自建机场的节点段额外分流、把若干个私有域名列表追加到已有 `Proxy` 组）时，没有内置的"preset + 自定义"组合方式：

- 用户被迫把三方 `.ini` 完整 fork 到自己仓库维护，需要手工跟上上游 diff；
- 或者放弃三方预设，单独维护一份完整 `.ini`，失去三方维护的实时性；
- 现有 `ruleprepend` / `ruleappend` 仅在 `.ini` 配置里生效，URL 参数未透传，Web UI 也没有暴露。

本特性新增 `ext_ruleset=` URL 参数 + 前端「额外规则集」文本框，让用户在每次生成订阅时直接附上自定义规则 URL，后端在同一次请求里完成"实时拉三方 + 校验组名 + 拉取 + 合并"，三方规则跟用户规则在同一份输出里共存。

## What Changes

- **后端**：新增 `ext_ruleset=Group,URL[;Group,URL]...` URL 参数；复用既有 `fetchExternalRuleSources` 抓取每条规则的原始内容；解析并校验所有 `Group` 必须出现在已加载的外部 `.ini` 已定义策略组中，否则返回 400。校验通过后把规则追加到 `base_rule["rules` 末尾。仅支持 `target=clash`，复用既有 `max_allowed_rulesets` 配额。
- **前端**：在 `web/src/config/options.ts` 的 `rule` 分组里新增 `ext_ruleset` 字段（`type: 'string'` + 新增 `multiline: true` 标志位）。`ConfigForm.vue` 检测 `multiline` 时渲染 `el-input type="textarea" :rows="5"`。`useGenerateSubscription.ts` 的 `buildSubUrl` 把多行文本按 `;` 拼装；`useFormState.ts` 的 `parseSubUrl` 反向 round-trip。
- **测试**：Vitest 覆盖 `buildSubUrl` / `parseSubUrl` 多行 round-trip；Python smoke 新增真实 preset + ext_ruleset 端到端 case 与未知组 400 校验 case。
- **文档**：README「规则和外部配置还支持」段补 `ext_ruleset=` 用法、限制、错误处理。

## Capabilities

### New Capabilities

- `preset-with-custom-rulesets`: Web UI 与 URL 协议层支持"三方 preset + 用户自定义规则"组合，包含参数解析、组名校验、规则抓取与合并、错误处理、测试矩阵。

### Modified Capabilities

<!-- 无现有 capability 的规格级行为变化 -->

## Impact

- 后端：`src/parser/subparser.h` + `src/parser/subparser.cpp` 增加 `ext_rulesets` 字段及解析；`src/handler/interfaces.cpp` 增加 ~60 行校验 + 抓取 + 合并逻辑。
- 前端：`web/src/config/options.ts` + `web/src/components/ConfigForm.vue` + `web/src/composables/useGenerateSubscription.ts` + `web/src/composables/useFormState.ts` 共约 +33 行。
- 不引入新依赖、不修改 Docker 部署形态、不影响 dashboard / inspect / version 页面。
- 配额 / 行为约束与现有 `ruleprepend` / `ruleappend` 对齐（仅 `target=clash`、复用 `max_allowed_rulesets`、atomic 失败语义）。