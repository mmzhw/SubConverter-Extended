## Context

现状（`src/handler/short_link_storage.cpp`）：

- 存储是一条 `code → ShortLinkRecord{code,url,name,created_at,last_access_at}` 映射，
  落盘为 `short-links.json`（`code` 为 8 位、字母表去掉了易混字符）。
- `createShortLink` 有去重：URL 完全相同则直接返回已有 code。
- `resolveShortLinkEndpoint` 走 `shortLinkSubTarget` 把记录的 URL 转成 `/sub?<query>`
  再调用 `subconverter`——**短链本身不存转换结果的缓存，是每次实时转换**。
  这点很关键：改掉 URL 后，客户端下次刷新就会拉到新内容，无需任何缓存失效逻辑。
- 管理接口 `GET /short/list`、`DELETE /short` 共用 `shortLinkAdminAuthorized`；
  未配置 `SUBCONVERTER_SHORT_LINK_PASSWORD` 时该函数直接放行。
- 两个 webserver 都已支持 PATCH（httplib `server.Patch`，beast `http::verb::patch`）；
  nginx location 正则已覆盖 `short(/|$)` 且不限 method。

## Goals / Non-Goals

**Goals:**

- `PATCH /short?id=<code>` 原地替换目标 URL，code 恒定。
- 存储层新 `updated_at`，老 `short-links.json` 无损兼容。
- 前端"编辑短链"走**表单回填**，让用户用常规控件改规则；
  更新是**显式动作**（点"更新短链"），不做自动同步。
- 复用既有鉴权、既有 `extractSubQuery` 校验、既有 `parseSubUrl` 回填。

**Non-Goals:**

- 不做"每次生成自动写回短链"的开关（会误覆盖，用户已确认不要）。
- 不做短链内容版本历史 / 回滚。
- 不做 code 自定义（用户自选短码）。
- 不改 `createShortLink` 的 URL 去重语义。
- 不做转换结果缓存（现有实现本就实时转换）。

## Decisions

### D1: 接口用 `PATCH /short?id=<code>`，而非 `POST /short/update`

- 与既有的 `DELETE /short?id=<code>` 对称，`/short` 成为该资源的统一入口。
- 两个 webserver 与 nginx 都已支持，无新增路由基础设施。
- 备选 `POST /short/update`：需要新路径注册，且与现有 REST 风格不一致。

### D2: 更新是"替换整个 URL"，不是"打补丁到参数级"

记录的 `url` 始终是一个完整的 `/sub?...` 串。短链不解析成参数结构，
因为：
- 参数集随时可能扩展（`inline_rules` 就是刚加的），参数级 diff 需要后端理解每个参数语义；
- 前端已经把参数结构化了（`parseSubUrl` / `buildSubUrl`），参数级编辑属于前端职责；
- 后端只做"这个新 URL 是不是合法的 /sub 链接"这一件事，与 `createShortLink` 完全同源
  （共用 `extractSubQuery`）。

### D3: `updateShortLink` 返回结构复用 `ShortLinkCreateResult` 的形状

新增 `ShortLinkUpdateResult{ok, code, path, error}`（与 create 同形）。
错误码集合：`not-found` / `invalid-request` / `invalid-url` / `storage-unavailable`，
与 create 的 `invalid-url` / `code-exhausted` / `storage-unavailable` 保持命名风格一致。

### D4: `updated_at` 用独立字段，不复用 `last_access_at`

`last_access_at` 会被每次 `resolveShortLink` 刷新（含有客户端自动轮询），
拿它当"内容最后修改时间"会让列表里的时间一直在跳，失去意义。因此新开 `updated_at`：
- 新建时 = `created_at`；
- 每次成功 update 时刷新；
- 老数据缺失按 0，列表照常展示（前端已有 `shortLinkTime()` 处理 0 → `'-'`）。

### D5: 前端编辑态放在 `UrlPreview.vue`，用 `applyParsed` 回填

- 回填直接复用现有 `loadServerShortLink` 的那一行
  （`form.applyParsed(parseSubUrl(item.url).state)`），不新增解析逻辑。
- 编辑态只是一个 `ref<ServerShortLink | null>`；非空即显示横幅。
- "更新短链"按钮的可用性绑定 `form.builtUrl.value`：它是 computed，
  只在"当前表单签名 == 上次生成时的签名"时才非空。用户一改选项签名就失配、
  `builtUrl` 变空 → 按钮自动禁用，天然防止写回过期 URL（正是 spec 里那条
  "表单已改动但未重新生成" 的场景）。
- 这是本设计里最省事的一处：**不需要额外实现脏检查**，复用 `builtUrl` 的既有语义即可。

### D6: 编辑失败保持编辑态

401（密码错）/ 503（存储不可用）都是可重试错误。清空编辑态会让用户丢失
"我在改哪条"的上下文，所以失败只弹错误、不清态。

### D7: 前端 `ServerShortLink` 增加 `updatedAt`

`normalizeItem` 里把 `updated_at` 读进来（缺失/非数字按 0）。列表 UI 可选用它
替换/补充 `createdAt` 的展示；本 change 只要求数据可得，展示保持现有两栏
（创建 / 访问）不变，避免改动既有视觉。

## Risks / Trade-offs

- [把短链指向的内容换掉后，客户端拉到的是新内容，用户可能"静默生效"] →
  这正是需求本身；且更新是显式动作 + 前端横幅明示，不会误操作。
- [两条短链被更新成同一个 URL] → 允许。`createShortLink` 的去重只在创建时生效，
  更新不合并，避免误删用户手里的另一条链接。
- [并发更新同一 code] → `updateShortLink` 全程持 `storage_mutex`，
  后写覆盖先写；短链管理是单用户低频操作，不加乐观锁。
- [`updated_at` 写回让老文件变大] → 单字段，可忽略。
- [更新接口成为短链劫持面] → 与 delete 同级风险，已受同一管理密码保护；
  未配置密码时保持现有免鉴权行为（与 list/delete 一致，不新增暴露面）。

## Migration Plan

- 无破坏性变更：新增接口与字段，不删不改既有协议。
- 老 `short-links.json` 直接可读；首次写入时自动补齐 `updated_at`。
- 部署：重建镜像即可（nginx 无需改）。
- 回滚：旧二进制读新文件时忽略未知字段 `updated_at`（`loadLocked` 只挑已知键），
  因此可安全回滚。

## Open Questions

<!-- 无：D1–D7 已确定；用户已确认「表单回填编辑」+「手动显式更新」 -->
