# Tasks: editable-short-links

## 1. 后端存储层 updateShortLink

- [x] 1.1 `src/handler/short_link_storage.h`：`ShortLinkRecord` 增加 `uint64_t updated_at = 0`；新增 `struct ShortLinkUpdateResult { bool ok; std::string code; std::string path; std::string error; }`；声明 `ShortLinkUpdateResult updateShortLink(const std::string &code, const std::string &url, const std::string &name, bool has_name, uint64_t now_ms);`。验证：编译通过
- [x] 1.2 `src/handler/short_link_storage.cpp`：`createShortLink` 里新建记录时令 `updated_at = now_ms`；`saveLocked` 写出 `updated_at`；`loadLocked` 读入 `updated_at`（缺失按 0）。验证：老文件仍能加载，新文件含该字段
- [x] 1.3 `src/handler/short_link_storage.cpp` 实现 `updateShortLink`：`validCode` 校验 → 未找到返回 `not-found` → `extractSubQuery(url)` 校验 → 失败返回 `invalid-url` → 替换 `url`、`has_name` 时替换 `name`、`updated_at = now_ms`（保留 `created_at`/`last_access_at`）→ `saveLocked()` 失败则回滚内存并返回 `storage-unavailable` → 成功返回 `{ok, code, "/s?id=" + code}`。全程持 `storage_mutex`。验证：编译通过

## 2. 后端 HTTP 接口

- [x] 2.1 `src/handler/short_links.h` / `.cpp`：新增 `updateShortLinkEndpoint(RESPONSE_CALLBACK_ARGS)`：先 `shortLinkAdminAuthorized`（未过 → 401 `unauthorized` + `WWW-Authenticate`），解析 body JSON 取 `url`/可选 `name`，缺 `url` → 400 `invalid-request`，调 `updateShortLink`，错误码映射 404/400/503，成功输出 `{"code","path","updated_at"}`。验证：编译通过
- [x] 2.2 `listShortLinksEndpoint` 的每条 item 增加 `"updated_at"` 输出。验证：`GET /short/list` 响应含该字段
- [x] 2.3 `src/main.cpp` 注册 `webServer.append_response("PATCH", "/short", "application/json; charset=utf-8", updateShortLinkEndpoint);`。验证：`grep -n 'PATCH' src/main.cpp` 命中
- [x] 2.4 确认 nginx/路由无需改动：`docker/nginx/nginx.conf.tmpl` 的 location 正则含 `short(/|$)` 且不限 method；`docker/nginx/subconverter-paths.txt` 已含 `short`。验证：`grep -n 'short' docker/nginx/nginx.conf.tmpl docker/nginx/subconverter-paths.txt` 命中且无需编辑

## 3. 后端 smoke 测试

- [x] 3.1 `scripts/run-subconverter-smoke.py` 新增 `assert_short_link_update_ok`：创建短链拿到 code → 用不同 `inline_rules` 的 URL 执行 `PATCH /short?id=<code>` → 断言 200、返回 code 不变、`GET /s?id=<code>` 响应含新规则、`GET /short/list` 中该 code 的 `url` 为新值且 `updated_at > 0`。注意：短链管理接口需要 `SUBCONVERTER_SHORT_LINK_PASSWORD`，smoke 需支持传入密码头（新增 `--short-link-password` 参数，未提供时跳过短链用例）。验证：smoke 跑通
- [x] 3.2 新增 `assert_short_link_update_not_found`（合法格式但不存在的 code → 404 `not-found`）与 `assert_short_link_update_invalid_url`（`url` 非 `/sub` 链接 → 400 `invalid-url`），后者还需断言该 code 的原 URL 未被改动。验证：smoke 全绿
- [x] 3.3 把 3.1/3.2 的三个函数挂进 `run_checks`，并加 `--short-link-password` CLI 参数（默认读 `SUBCONVERTER_SHORT_LINK_PASSWORD` 环境变量）。验证：`python -m py_compile scripts/run-subconverter-smoke.py` 通过

## 4. 前端 API 层

- [x] 4.1 `web/src/composables/useShortLinksManager.ts`：`ServerShortLink` 增加 `updatedAt: number`；`normalizeItem` 读取 `updated_at`（缺失/非数字按 0）；新增导出 `requestUpdateShortLink(origin, code, url, name, password, fetcher)` 发 `PATCH ${base}/short?id=<code>`，body JSON `{url, name}`，复用 `authInit` 带鉴权头，成功断言 `payload.code` 为字符串。验证：`npx vitest run useShortLinksManager` 通过
- [x] 4.2 同文件：`useShortLinksManager` 暴露 `update(code, url, name)`——成功后把该 item 的 `url`/`updatedAt` 就地替换（不整表刷新，避免闪动），失败返回 false 并设 `error`。验证：vitest 覆盖成功就地更新与失败保留原值

## 5. 前端编辑态 UI

- [x] 5.1 `web/src/components/UrlPreview.vue`：新增 `editingShortLink = ref<ServerShortLink | null>(null)`；`startEditShortLink(item)` 调 `loadServerShortLink(item)` 并置编辑态；`cancelEditShortLink()` 清空；`updateEditingShortLink()` 调 `shortManager.update(editing.code, form.builtUrl.value, form.state.subscriptionName)`，成功则退出编辑态 + `ElMessage.success`，失败保持编辑态 + 错误提示。验证：`npm run build` 通过
- [x] 5.2 列表每行增加"编辑"按钮（`:icon="EditPen"`）；编辑态时对应行高亮。验证：`npm run build` 通过
- [x] 5.3 编辑态横幅：显示"正在编辑短链 <code>"+ 目标地址 + "更新短链"（`:disabled="!form.builtUrl.value"`）+ "取消编辑"；表单已改动未重新生成时显示"请先点生成"提示。验证：`npm run build` 通过 + 手工走查按钮禁用逻辑
- [x] 5.4 处理"编辑中删除该短链"的边界：`shortManager.remove(code)` 后若删除的是当前编辑对象，清空编辑态。验证：手工走查

## 6. i18n

- [x] 6.1 `web/src/i18n/locales/zh-CN.ts` / `en.ts` 的 `history` 段补：`edit`（编辑/Edit）、`editing`（正在编辑短链 {code}/Editing short link {code}）、`updateShortLink`（更新短链/Update short link）、`cancelEdit`（取消编辑/Cancel edit）、`updateFailed`（更新失败/Update failed）、`updateSuccess`（短链已更新/Short link updated）、`generateFirst`（请先点"生成"再更新/Generate first, then update）、`updatedAt`（修改/Updated）。验证：`npx vue-tsc --noEmit` 通过

## 7. 文档与验收

- [x] 7.1 README 补一段短链可编辑说明：`PATCH /short?id=` 用法 + "code 不变、内容可改"的语义 + 前端编辑入口一句话。验证：`grep -n "PATCH /short" README.md` 命中
- [x] 7.2 端到端验收（测试服务器容器重建后）：创建短链 → PATCH 更新 → `/s?id=` 命中新内容 → 前端走查"编辑 → 加内联规则 → 生成 → 更新短链 → 短链地址不变"；既有 smoke 无回归。验证：smoke exit 0（短链用例需带 `--short-link-password`）
- [ ] 7.3 OpenSpec change 归档（按项目 archive 流程）
