## Why

短链（`/s?id=<code>`）的目标 URL 是**建后即冻结**的：想改内容只能删掉重建，
而重建会生成新 code，于是每台客户端都得重新导入订阅。用户的实际场景是
"短链已经发给了所有客户端，现在我只想加几条内联规则"——却被迫做一轮全端换链接。

根因是存储层只有 create/list/delete，**没有原地更新**：
`short-links.json` 里 `code → url` 的映射无法替换 `url` 而保留 `code`。

本 change 补上"原地更新"：短链 code 不变，目标 URL 可改。

## What Changes

- **后端存储**：`short_link_storage` 新增 `updateShortLink(code, url, name, has_name, now_ms)`：
  校验 code 存在、新 URL 是合法 `/sub?...`，替换 `url`（可选替换 `name`），
  **保留 `code` / `created_at` / `last_access_at`**，写入新的 `updated_at`。
- **后端接口**：新增 `PATCH /short?id=<code>`，body `{"url": "...", "name": "..."}`（name 可选）；
  复用与其他管理接口相同的 `shortLinkAdminAuthorized` 鉴权；
  成功返回 `{"code","path","updated_at"}`；code 不存在 → 404 `not-found`；
  URL 非法 → 400 `invalid-url`；写盘失败 → 503 `storage-unavailable`。
- **后端列表**：`GET /short/list` 的每条 item 增加 `updated_at`（老数据缺失按 0 处理）。
- **前端**：`useShortLinksManager` 新增 `update(code, url, name)`；
  `UrlPreview.vue` 的"服务器短链"每个 item 增加"编辑"按钮：
  - 点击 → 用现有 `parseSubUrl` + `form.applyParsed` 把该短链参数回填到表单
    （内联规则、额外规则集、preset 等全部回到 UI 控件里）→ 进入编辑态，
    顶部显示"正在编辑短链 <code>"横幅 + "更新短链" / "取消编辑"；
  - 用户按平常方式改规则 → 点"生成"产出新 URL → 点"更新短链"→ `PATCH /short?id=<code>`；
  - 成功后就地刷新列表并清空编辑态；失败按错误码显示提示。
- **不引入自动同步**：不做"每次生成都写回短链"的开关，避免误覆盖。
- **测试**：后端 smoke 新增 update 正/反用例；前端 vitest 覆盖
  `requestUpdateShortLink` 与 manager 的 `update`。

## Capabilities

### New Capabilities

- `editable-short-links`: 短链目标 URL 的原地更新能力——`PATCH /short?id=` 接口、
  存储层 `updated_at` 字段，以及前端"编辑短链 → 表单回填 → 更新"的编辑态流程。

### Modified Capabilities

<!-- 无：create/list/delete/resolve 的既有语义不变（list 仅新增一个字段） -->

## Impact

- 后端：`src/handler/short_link_storage.{h,cpp}`（新增 `updateShortLink` + `updated_at` 字段
  与 JSON 读写）；`src/handler/short_links.{h,cpp}`（新增 `updateShortLinkEndpoint`，
  list 输出补 `updated_at`）；`src/main.cpp` 注册 `PATCH /short`。
- nginx：`docker/nginx/nginx.conf.tmpl` 的 location 正则已含 `short(/|$)` 且不限制 method，
  **无需改动**；`subconverter-paths.txt` 同样已含 `short`。
- 前端：`web/src/composables/useShortLinksManager.ts`（`update` + `updatedAt` 字段）；
  `web/src/components/UrlPreview.vue`（编辑按钮 + 编辑态横幅 + 更新动作）；
  `web/src/i18n/locales/{zh-CN,en}.ts`（编辑相关文案）。
- 存储兼容：`short-links.json` 单向兼容——老文件无 `updated_at` 字段仍可读（按 0 处理），
  写回时补齐；不改 code 格式、不改文件路径。
- 安全：编辑接口与 list/delete 同为管理接口，共用 `SUBCONVERTER_SHORT_LINK_PASSWORD`；
  未配置密码时维持现有"免鉴权"行为（与 list/delete 一致）。
