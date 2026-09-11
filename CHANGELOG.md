# 更新日志

本文件记录本 fork（[mmzhw/SubConverter-Extended](https://github.com/mmzhw/SubConverter-Extended)）相对上游的显著变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。
镜像由 GitHub Actions 在推送 `vX.Y.Z` 标签时构建并发布；分支构建的版本号为 `master-<短 SHA>`，本地/CI 构建为 `dev`。

## [Unreleased]

### 新增

#### 内联规则 `inline_rules=`（无需自建公网规则文件）

- 新增 `inline_rules=Group:TYPE,value|TYPE,value;Group2:...` URL 参数：`;` 分组、`:` 分隔组名与规则列表、`|` 分隔同组规则。
- 后端复用 `parseExternalClashRules(require_target=false)` 校验，并把每条规则补上 `,<组名>` 后追加到 `rule_append`，与 `ext_ruleset=` 共用同一落点。
- 校验与 `ext_ruleset=` 对齐：组名走 `collectExternalGroupNames`；仅 `target=clash/clashr`；拒绝 `list=true` / `script=true`；总条数受 `max_allowed_rulesets` 限制；`MATCH` / `FINAL` 被拒绝。
- 新增 Web UI「内联规则」行式控件：匹配模式下拉 + 值输入框 + 组名下拉（复用 `/getgroupnames` 自动加载），与「额外规则集」并存。
- 匹配模式下拉为 9 种类型（`DOMAIN` / `DOMAIN-SUFFIX` / `DOMAIN-KEYWORD` / `DOMAIN-REGEX` / `GEOIP` / `GEOSITE` / `IP-CIDR` / `IP-CIDR6` / `SRC-IP-CIDR`），每项带中英文说明与示例；选中后行下方还有一行解释与 placeholder 提示。

#### 短链内容可编辑 `PATCH /short`

- 新增 `PATCH /short?id=<code>`：**短链地址不变，目标 URL 可原地替换**。把短链分发给客户端后，后续增删规则无需让每台客户端重新导入订阅。
- 存储层新增 `updateShortLink()`：保留 `code` / `created_at` / `last_access_at`，只替换 `url`（可选替换 `name`），并写入新的 `updated_at`；写盘失败时回滚内存，不留半更新状态。
- 错误语义：`code` 不存在或格式非法 → 404 `not-found`；`url` 非 `/sub?...` 地址 → 400 `invalid-url`（原记录不变）；缺 `url` 字段 → 400 `invalid-request`；写盘失败 → 503 `storage-unavailable`。
- `GET /short/list` 每条记录增加 `updated_at`（“修改”时间，与每次访问都会刷新的 `last_access_at` 区分）。
- Web UI「服务器短链」新增编辑入口：点击后表单回填该短链的全部参数（内联规则、额外规则集、远程配置等），顶部显示编辑横幅，改完点“生成”再点“更新短链”即可。“更新短链”按钮直接绑定已生成 URL 的签名，表单改动后会失效禁用，避免写回过期 URL。
- 老 `short-links.json` 向后兼容：缺少 `updated_at` 的记录按 0 读取，首次更新时自动补齐。

### 修复

- **组名加载不走 GitHub 代理**：`useGroupNames` 调 `/getgroupnames` 时未应用 UI 里选择的 GitHub 加速前缀，导致 `config=` 为 GitHub 地址时必然请求超时（nginx 504），组名下拉一直空着。现在与订阅 URL 生成共用同一重写逻辑。
- **组名加载无超时**：`/getgroupnames` 请求新增 8 秒超时，网络不可达时快速失败并提示“组名加载失败，可手动输入”，不再让用户对着 Loading 干等上游超时。
- **匹配模式下拉看不到说明**：Element Plus 的 `.el-select-dropdown__item` 固定 34px 行高 + `nowrap` + `ellipsis`，把三行内容裁成一行；下拉又被 teleport 到 `<body>`，scoped 样式无效。改为 `popper-class` + 全局样式覆盖。
- **`ext_ruleset` 抓取失败被静默跳过**：补 `skip_on_fetch_failure=false`，恢复 atomic 失败语义（单条 URL 抓取失败即整批 400）。
- **`ext_ruleset` 规则集文件报 “target policy is missing”**：规则集内容文件只有 2 字段，改为 `require_target=false` 并由调用方补 `,组名`。
- **`parseExtRulesetRows` 不认旧格式**：兼容 `;` 与换行两种分隔，修复旧链接导入后行合并乱码。
- **`templates.cpp` 空 `request_params` 崩溃**：`all_args.erase(size()-1)` 在空 map 时 `erase(npos)` 抛 `out_of_range`，导致 `/getgroupnames` 返回 500；补空判断。

### 变更

#### 构建、镜像与文档不再指向上游仓库

本 fork 此前对外宣称的源码地址是上游仓库，导致两个问题：`/version` 页的构建提交链接 404（该 SHA 只存在于本 fork），以及两个自动更新器会把上游的 release 覆盖到本 fork 的构建上。

- `src/version.h` 新增 `PROJECT_REPO_URL`；`/version` 的构建提交链接与 `/version`、`/inspect` 两处源代码页脚都改用它。
- 两个自动更新器改为从本 fork 拉取 release：`bridge/cmd/portable-updater`、OpenWrt 的 `subconverter-extended-update`。
- 镜像命名空间：Docker Hub 改为 `mmzhw51/subconverter-extended`，GHCR 改为 `ghcr.io/mmzhw/subconverter-extended`（两者所有者不同，改写时 GHCR 先行）。
- 同步更新 `Dockerfile`、`docker/Dockerfile.{debian,armv7-cross}` 的 OCI 标签与 maintainer、`docker-compose.yml`、`scripts/{ci/build_plan.py,ci/release_manifest.py,merge_manifest.py}`、`build-dockerhub.yml`、`block-master-prs.yml` 的 actor 守卫、OpenWrt 包元数据，以及锁步的 `tests/test_build_plan.py` 与 `tests/ci_delivery_scripts_test.sh`。
- 文档中的仓库身份链接改指本 fork。**Wiki 链接仍指向上游**（本 fork 没有 wiki，`/wiki` 会 302 回仓库首页）。
- 版权归属保留：`/version` 的「项目沿革」段、LICENSE，以及 `Custom_OpenClash_Rules`、`Rule-Bot` 等相关项目链接均未改动。
- 刻意未改：`bridge/go.mod` 的 module 路径，以及 CI 会读取的 `com.aethersailor.dependency-snapshot.sha256` 标签。

### 测试

- 后端 smoke 新增 `inline_rules`（10 例）与短链更新（4 例）用例，并新增 `--short-link-password` 参数（默认读 `SUBCONVERTER_SHORT_LINK_PASSWORD`）。
- 短链更新与内联规则的 smoke 夹具改用**无远程规则集**的 preset，避免转换时等待不可达主机；`assert_inline_rules_valid` 由约 12.7s 降至 0.0s，消除了原有的间歇性超时。
- `tests/short_link_storage_test.cpp` 覆盖原地更新语义、拒绝更新不改动记录、以及缺 `updated_at` 的老文件兼容。
- 前端 vitest 覆盖行 ↔ 字符串互转、`useGroupNames` 代理重写/缓存/超时、`requestUpdateShortLink` 与 manager 就地打补丁。

### 已知问题

- 部署环境若 DNS 对 `.invalid` 域名**挂起而不快速失败**，`assert_getgroupnames_bad_url` 与 `assert_ext_ruleset_fetch_failure` 会因 nginx 先返回 504 而失败（期望后端 400）。根因是后端出站 fetch 缺少超时上限，尚未修复。
- 测试容器当前未挂载 `/base/short-links` 卷，`docker rm` 重建会丢失短链记录并重新生成管理密码；长期部署请参考 `docker-compose.yml` 挂载持久化目录。

---

## 更早的变更（本次尚未推送的历史）

以上版本之前，本 fork 相对上游已包含以下功能，均随本次一并推送：

- `ext_ruleset=Group,URL[;...]`：向所选 preset 的已有策略组追加远程规则来源，含严格组名校验、atomic 抓取失败语义与配额限制。
- `GET /getgroupnames?config=<url>`：返回所选远程配置的合法策略组名，供 UI 下拉自动加载；与 `ext_ruleset` 校验共用 `collectExternalGroupNames`，保证两端清单一致。
- 「额外规则集」行式控件：组名下拉 + URL 输入 + 增删行，替代原先需要手写 `组名,URL` 的多行文本框。
- `scripts/run-subconverter-smoke.py` 覆盖上述参数的正常/异常路径。
