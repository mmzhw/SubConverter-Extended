## Purpose

让短链（`/s?id=<code>`）的目标订阅 URL 可以原地修改，同时保持 code 不变。用户把短链
分发给所有客户端后，后续增删规则只需更新短链内容，客户端无需重新导入订阅。

## ADDED Requirements

### Requirement: 短链原地更新接口 `PATCH /short`

系统 MUST 支持 `PATCH /short?id=<code>`，请求体为 JSON 对象
`{"url": "<新的 /sub?... URL>", "name": "<可选名称>"}`。

- 鉴权 MUST 与 `GET /short/list`、`DELETE /short` 一致（`shortLinkAdminAuthorized`）。
- 成功：HTTP 200，`Content-Type: application/json`，body
  `{"code":"<code>","path":"/s?id=<code>","updated_at":<毫秒时间戳>}`。
- `id` 缺失或 code 格式非法 / 记录不存在：HTTP 404，body `{"error":"not-found"}`。
- `url` 缺失、非字符串，或不是合法的 `/sub?target=...&url=...` 地址：
  HTTP 400，body `{"error":"invalid-url"}`（`url` 字段缺失时为 `invalid-request`）。
- 写盘失败：HTTP 503，body `{"error":"storage-unavailable"}`，且 MUST NOT 留下半更新状态。
- 更新 MUST 保留 `code`、`created_at`、`last_access_at`，只替换 `url`（以及提供时的 `name`），
  并把 `updated_at` 设为当前时间。
- 更新后 `GET /s?id=<code>` MUST 解析到新的 URL。

#### Scenario: 更新后 code 不变、内容改变

- **WHEN** 先用 `POST /short` 创建 URL `A` 得到 code `C`，再
  `PATCH /short?id=C` body `{"url":"B"}`
- **THEN** 响应 200 且 `code` 为 `C`，随后 `GET /s?id=C` 命中的是 `B` 的转换结果

#### Scenario: 更新后列表反映新 URL

- **WHEN** 对 code `C` 执行一次成功更新
- **THEN** `GET /short/list` 中 code `C` 的 `url` 为新值，`updated_at` 大于 `created_at`

#### Scenario: 不存在的 code

- **WHEN** `PATCH /short?id=zzzzzzzz`（不存在的合法格式 code）
- **THEN** HTTP 404 + `{"error":"not-found"}`

#### Scenario: 非法目标 URL

- **WHEN** `PATCH /short?id=C` body `{"url":"https://example.com/not-a-sub-link"}`
- **THEN** HTTP 400 + `{"error":"invalid-url"}`，且该 code 的原 URL 保持不变

#### Scenario: 未配置管理密码时免鉴权

- **WHEN** 未设置 `SUBCONVERTER_SHORT_LINK_PASSWORD`，且不带任何凭据调用 `PATCH /short?id=C`
- **THEN** 请求被接受（与 `GET /short/list` 行为一致）

#### Scenario: 配置了管理密码时拒绝无凭据请求

- **WHEN** 设置了 `SUBCONVERTER_SHORT_LINK_PASSWORD`，且请求不带
  `X-Short-Link-Password` / `Authorization` / `?password=`
- **THEN** HTTP 401 + `{"error":"unauthorized"}`，且不修改任何记录

### Requirement: 短链记录 `updated_at`

`ShortLinkRecord` MUST 增加 `updated_at` 字段并在 `short-links.json` 中持久化。

- 新建记录时 `updated_at` MUST 等于 `created_at`。
- 读取老数据（文件里没有 `updated_at`）MUST 按 0 处理，不得导致加载失败或丢记录。
- `GET /short/list` 的每条 item MUST 输出 `updated_at`。

#### Scenario: 老数据向后兼容

- **WHEN** 存储文件里某条记录只有 `url`/`name`/`created_at`/`last_access_at`
- **THEN** 该记录仍被加载，列表里其 `updated_at` 为 0，其余字段不变

#### Scenario: 新建记录的 updated_at

- **WHEN** 通过 `POST /short` 创建一条新短链
- **THEN** 该记录的 `updated_at` 等于 `created_at`

### Requirement: 前端编辑短链

`UrlPreview.vue` 的"服务器短链"列表 MUST 为每条记录提供"编辑"入口。

- 点击"编辑"后，系统 MUST 用该记录的目标 URL 回填表单，使用户能在常规 UI 控件里
  修改规则（含内联规则、额外规则集、远程配置等）。
- 进入编辑态后 MUST 显示横幅标明正在编辑的短链 code，并提供"更新短链"与"取消编辑"。
- "更新短链" MUST 把**当前已生成的订阅 URL** 通过 `PATCH /short?id=<code>` 写回该短链。
- 更新成功后 MUST 刷新列表并退出编辑态。
- 更新失败 MUST 显示错误，并**保持编辑态**以便用户重试。
- 用户修改表单会使已生成 URL 失效（签名不匹配），此时"更新短链" MUST 不可用，
  提示用户先点"生成"。

#### Scenario: 加规则后更新同一短链

- **WHEN** 用户对短链 `C` 点"编辑"，在表单里新增一条内联规则，点"生成"，
  再点"更新短链"
- **THEN** 发送 `PATCH /short?id=C` 且 body 的 `url` 含新增的内联规则，
  成功后列表刷新且 `C` 的短链地址不变

#### Scenario: 表单已改动但未重新生成

- **WHEN** 用户处于编辑态并修改了任意选项，但尚未点"生成"
- **THEN** "更新短链"处于不可用状态，避免把过期 URL 写回短链

#### Scenario: 更新失败保持编辑态

- **WHEN** "更新短链" 返回 401 或 503
- **THEN** 显示对应错误文案，编辑态与横幅保留，用户可直接重试

#### Scenario: 取消编辑

- **WHEN** 用户点击"取消编辑"
- **THEN** 退出编辑态、横幅消失，且不发送任何更新请求

### Requirement: 测试

- 后端 smoke MUST 覆盖：更新成功（code 不变、`/s` 命中新内容、list 反映新 URL）、
  code 不存在 → 404、非法 URL → 400、非法 URL 时原 URL 不变。
- 前端 vitest MUST 覆盖 `requestUpdateShortLink` 的成功/失败/鉴权头，
  以及 `useShortLinksManager.update` 成功后列表就地更新。

#### Scenario: smoke 覆盖更新路径

- **WHEN** 运行 `scripts/run-subconverter-smoke.py`
- **THEN** 上述 4 个 update 用例全部执行并通过
