# Proposal: 额外规则集智能化——组名自动加载 + 行式控件

## Why

`ext_ruleset=`（额外规则集）已上线（master，`preset-with-custom-rulesets`），但前端的多行文本框对不懂规则配置的用户不友好。用户反馈两个卡点：

1. **不理解格式含义**：`Proxy,https://...` 一行格式需要用户自己记住"组名,URL"的拼法；
2. **不知道组名填什么**：组名必须已在所选 preset 中定义，用户无法凭空知道合法组名是什么（只有生成时后端 400 才会列出）。

本 change 把"额外规则集"从自由文本改为**结构化行式控件**（组名下拉 + URL 输入），并新增后端组名查询接口供下拉框自动加载合法组名。格式拼装交给 UI，组名知识交给后端。

## What Changes

- **后端**：新增 `GET /getgroupnames?config=<url>` 接口，返回所选远程配置的合法策略组名列表（JSON）。复用现有 `buildExternalConfigFetchPlan` 的拉取逻辑与 `collectExternalGroupNames`（与 ext_ruleset 校验共用同一代码，保证两端组名清单永远一致）。响应只含组名，不含配置内容。
- **前端**：`ConfigForm.vue` 中"额外规则集"从 `el-input textarea` 改为新组件 `ExtraRulesetsControl.vue`：
  - 每行 = 组名下拉（`filterable` + `allow-create`，数据来自 `/getgroupnames`）+ URL 输入 + 删除按钮；底部"＋ 添加规则"；
  - 组名加载：新 composable `useGroupNames(configUrl)`，300ms 防抖 + 按 configUrl 内存缓存；拉取失败时下拉退化为自由输入并显示行内提示；
  - "远程配置"为空时显示引导提示，下拉以 4 个 fallback 组兜底。
- **状态模型不变**：`options.ext_ruleset` 仍是 `Group,URL;Group,URL` 字符串，组件内部做行 ↔ 字符串互转（新纯函数 `web/src/lib/ext-rulesets.ts`）。URL round-trip、localStorage 预设、后端协议零改动。
- **测试**：后端 smoke 新增 2 case（200 含预期组名 / 坏 URL 400）；前端 vitest 覆盖行 ↔ 字符串互转 + `useGroupNames` 防抖/缓存/失败回退。
- **文档**：README"额外规则集"说明更新。

## Capabilities

### New Capabilities

- `smart-ext-rulesets`: 组名查询接口（`/getgroupnames`）+ 前端行式控件，降低 ext_ruleset 的配置门槛。

### Modified Capabilities

<!-- 无：ext_ruleset 的 URL 协议、校验语义、输出行为均不变 -->

## Impact

- 后端：`src/handler/interfaces.{h,cpp}` 新增 ~50 行接口实现；`src/server/webserver*.cpp` 注册新路径（与 `/getruleset` 同方式）；`docker/nginx/subconverter-paths.txt` 补路径（前端经 nginx 访问）。
- 前端：新增 `web/src/components/ExtraRulesetsControl.vue`、`web/src/lib/ext-rulesets.ts`、`web/src/composables/useGroupNames.ts`；`ConfigForm.vue` 替换渲染分支；`web/src/config/options.ts` 描述文案更新。
- 不改 URL 协议、不改 ext_ruleset 校验/合并逻辑、不引入新依赖。
- **不做**（记为后续）：域名/关键词直接录入生成规则（下一 change 单独设计）。

## 后续（非本 change）

- 用户想法：直接填域名 + 选模式（DOMAIN/DOMAIN-SUFFIX/DOMAIN-KEYWORD…）+ 选组 → 前端拼成内联规则或生成规则源，无需用户自建公网规则文件。形态待单独 brainstorm。