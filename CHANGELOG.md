# 更新日志

本文件记录本 fork（[mmzhw/SubConverter-Extended](https://github.com/mmzhw/SubConverter-Extended)）相对上游的显著变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

发布方式：推送**附注标签** `vX.Y.Z`（`git tag -a v1.10.0 -m "..."`）触发 GitHub Actions，自动构建 amd64 / arm64 / armv7 三架构镜像并推送到 Docker Hub 与 GHCR，随后创建 GitHub Release 并把 `latest` 推进到该版本。分支构建的版本号为 `master-<短 SHA>`，本地或非发布 CI 构建为 `dev`。日期式标签（`2026.09.11-<短 SHA>`）不会触发 CI，仅供手动构建使用。

版本线独立于上游：本 fork 从 `v1.10.0` 起计，数值高于上游当前版本，避免与上游的 `1.9.x` 混淆。

## [未发布]

### 新增

#### 内联规则 / 额外规则集支持「置顶」，不再被预设规则抢先命中

起因是一个真实案例：某订阅的 preset 在第 100 条放了 `DST-PORT,444-65535,🔀 非标准端口`，而用户用 `inline_rules=` 写的 `DOMAIN-KEYWORD,netmarble,♻️ 自动选择` 落在第 103 条 —— 位置本身没错（追加落点确实在 preset 规则集之后、`MATCH` 之前），但非标端口先命中，内联规则成了死代码。想要它生效，只能自建一份规则文件挂到 preset 的 `[ruleprepend]`。

- 新增 `inline_rules_prepend=` 与 `ext_ruleset_prepend=`：线格式与原参数**逐字节相同**，只改落点。置顶的规则排在最终 Clash 规则表的**最前面**，优先于 preset 的 `ruleprepend` 来源；原来的追加落点（默认）不变，仍是「preset 规则集展开之后、终结规则之前」。
- 合并顺序固定为：置顶规则（`ext_ruleset_prepend=` 在前、`inline_rules_prepend=` 在后）→ preset `ruleprepend` → 原有非终结规则 → preset 规则集展开 → 追加规则 → 原有终结规则 → 展开结果的终结规则。
- 校验（组名、`MATCH` / `FINAL` 拒绝）、target gating（`inline_rules` 族 = clash/clashr，`ext_ruleset` 族 = clash）、以及 `max_allowed_rulesets` 配额全部复用追加侧实现。限额**按参数族求和**：`inline_rules=` + `inline_rules_prepend=` 的条数之和、`ext_ruleset=` + `ext_ruleset_prepend=` 的来源数之和各自受同一个上限约束，不会因为分列两个参数而翻倍。
- Web UI 的「额外规则集」与「内联规则」控件顶部新增「规则位置：末尾 / 置顶」开关，默认「末尾」，选「置顶」时提示其优先级最高；切换落点不改变已填写的规则内容。导入链接时若 `*_prepend=` 与追加参数同时出现，以 `*_prepend=` 为准，另一侧的值进入「未知参数」而不是被静默丢弃。
- 未使用这两个参数的旧链接行为**逐字节不变**（单元测试断言了空置顶槽位的输出与改动前逐条一致）。
- 取舍：置顶会越过 preset 自带的内网直连规则（`GEOSITE,private,DIRECT` 等），只在确实需要抢在端口类规则之前命中时使用。

## [v1.11.1] - 2026-09-12

### 新增

#### 订阅源地址改为多行输入，支持多个订阅源

- 订阅源地址由单行输入框改为**多行文本域，一行一个**，多个机场 / 订阅链接不用再手工拼分隔符。
- 生成链接时把多行用 `|` 连接成一个 `url=` 参数；导入含 `|` 的链接时还原成多行，保证「导入 → 再生成」往返一致。
- **逗号不是多源分隔符**：它在 `url=` 里分隔单个订阅源的「源前缀选项」与源 URL（如 `interval:21600,https://example.com/sub`）。此前用逗号分隔多个订阅源时，整串会被当作一个地址发出去，最终只有一个源生效 —— 因为 `new URL('https://a/x,https://b/y')` 并不报错（逗号在路径中合法），校验静默通过。现在界面会明确提示应一行一个。
- 校验改为逐行进行，报错会指出**第几行**不合法。

### 修复

#### 内联规则 / 额外规则集的组名校验（含行为收紧）

`collectExternalGroupNames` 过去**无条件**把 `Proxy`、`Direct`、`REJECT`、`GLOBAL` 四个名字并入合法组集合，但它服务的是只对 Clash/ClashR 生效的 `inline_rules=` 与 `ext_ruleset=`。后果分两个方向：

- **放行了不存在的组**：`Proxy` 只会为 **Stash** 输出自动补，`GLOBAL` 只会加到 **Sing-box** 输出，`Direct` 在任何 Clash 输出里都不存在。用了远程预设时写这些名字会通过校验，但生成的配置里没有对应策略组，客户端直接拒绝整个配置：`rules[95] [DOMAIN-KEYWORD,was.ink,Direct] error: proxy [Direct] not found`。
- **拒绝了正确的写法**：Clash 内置策略名是 **`DIRECT`（全大写）**，此前会被 HTTP 400 拒绝。

现在：

- 远程配置**声明了**策略组时，合法组 = 该配置声明的组 ∪ {`DIRECT`, `REJECT`}；`Proxy` / `Direct` / `GLOBAL` 不再被接受，请求会在**生成前**返回 400 并列出可用组名。
- 远程配置**未声明**任何组时维持原有宽容（此时后端没有可校验的真实组名）。
- `DIRECT` / `REJECT` 在两种情况下都接受。
- 前端：已选远程配置但组名**加载失败**时，下拉框不再回落到那四个兜底名（它们只是猜测，且猜错就会产出坏配置），改为空列表并保留「加载失败，可手动输入」提示；兜底名只在未选远程配置时出现。

> **这是有意的破坏性收紧。** 历史链接若用 `Direct` / `Proxy` / `GLOBAL` 指向远程预设，会从「200 + 客户端加载不了的配置」变为「400 + 可用组名列表」。

## [v1.11.0] - 2026-09-11

### 新增

#### 内联规则支持逐行 / 批量双模式编辑

- 内联规则控件新增「批量编辑」模式：一个多行文本框，一行一条 `匹配模式,值,组名`（例如 `DOMAIN-SUFFIX,foo.com,Domestic`），可从别处直接粘贴；与既有「逐行编辑」随时切换，当前规则自动带过去。
- 解析按**首个逗号**切匹配模式、**末个逗号**切组名，因此值里含逗号（如 `DOMAIN-REGEX,^a,b$,Domestic`）不会被切错；空行与 `#` 注释行忽略。
- 无法识别的行保留在文本框中并提示「有 N 行无法识别」，不会写入链接；切回逐行编辑会丢弃这些行。
- URL 协议、后端与 localStorage 预设格式零改动。

### 修复

#### CI 与 Docker Hub 同步

- `sync-dockerhub-description.yml` 的 API 地址被拆成两行，命名空间仍是上游的 `aethersailor`，导致描述同步**从未生效**；已改指本 fork。
- `cleanup_container_registry.py` 的默认 owner / namespace 仍指向上游，而每日定时任务不传参就执行 `--prune-all --apply`；已改指本 fork（该任务只清理 `ci-` / `buildcache-` 前缀的临时标签，不会动正式版本）。
- `docker/Dockerfile.debian`、`docker/Dockerfile.armv7-cross` 的 `maintainer` 标签仍是上游；已改。
- 描述同步遇到 Docker Hub 的既有平台限制（**personal access token 无权写仓库描述**，[docker/hub-feedback#1927](https://github.com/docker/hub-feedback/issues/1927)）时，改为输出 warning 并以 0 退出，不再让 CI 常红；如需自动化可另配 `DOCKERHUB_PASSWORD`。
- secrets 使用前一律 `strip()`：GitHub 原样保存密钥，粘贴带入的换行会让裸 API 调用 401，而 `docker/login-action` 会自动去除，所以此前表现为「镜像能推、脚本认证失败」。
- 镜像 smoke 断言按**镜像形态**区分：amd64/arm64 用 `./Dockerfile`（nginx 前置、后端只听回环），armv7 用 `./docker/Dockerfile.armv7-cross`（**没有 nginx**，后端直接对外），因此通配符绑定告警在 armv7 上本就应当出现。
- nginx 模板为 `/Custom_OpenClash_Rules(/|$)` 增加显式 404：该路径此前会落到 SPA 回退并返回 200，与镜像 smoke 断言冲突。

### 文档

- Docker Hub 的 Overview 改为以仓库内 `.github/DOCKERHUB_DESCRIPTION.md` 为唯一来源，并刷新界面截图。
- 新增 `docs/RELEASE-RUNBOOK.md`（维护与发布手册）与 `AGENTS.md`（AI agent 入口）。

## [v1.10.1] - 2026-09-11

### 修复

#### 首次发布不再被 `releases/latest` 阻塞

- `gh api ... --jq` 在 404 时会把错误 JSON 写到 **stdout**，命令替换因此拿到 `{"message":"Not Found",...}` 而不是空串，首次发布的空值判断永远不会命中，发布在 `create-release` 阶段失败。
- 改为用 `curl -o file -w '%{http_code}'` 显式读状态码：`404` 视为首次发布，`200` 解析 `tag_name`，其余报错退出。

## [v1.10.0] - 2026-09-11

### 变更

#### 发布流程改为 CI 驱动的 `vX.Y.Z` 标签

- 正式版本不再手动构建，改为推送 `vX.Y.Z` 附注标签由 CI 自动完成。
- **必须使用附注标签**：workflow 用 `refs/tags/<tag>^{}` 解析标签指向的提交，轻量标签（`git tag v1.10.0`，不带 `-a`）解析为空并导致发布失败。
- 修复首次发布被阻塞的问题：`create-release` 原先要求仓库已存在已发布的 Release 才能生成发布说明，`releases/latest` 返回空即直接报错退出。现在该情况会被识别为首次发布，改用当前历史生成说明。
- README 补充维护者发布流程、标签规范和所需 secrets。

#### 构建、镜像与文档不再指向上游仓库

本 fork 此前对外宣称的源码地址是上游仓库，导致两个问题：`/version` 页的构建提交链接 404（该 SHA 只存在于本 fork），以及两个自动更新器会把上游的 release 覆盖到本 fork 的构建上。

- `src/version.h` 新增 `PROJECT_REPO_URL`；`/version` 的构建提交链接与 `/version`、`/inspect` 两处源代码页脚都改用它。
- 两个自动更新器改为从本 fork 拉取 release：`bridge/cmd/portable-updater`、OpenWrt 的 `subconverter-extended-update`。
- 镜像命名空间：Docker Hub 改为 `mmzhw51/subconverter-extended`，GHCR 改为 `ghcr.io/mmzhw/subconverter-extended`（两者所有者不同，改写时 GHCR 先行）。
- 同步更新 `Dockerfile`、`docker/Dockerfile.{debian,armv7-cross}` 的 OCI 标签与 maintainer、`docker-compose.yml`、`scripts/{ci/build_plan.py,ci/release_manifest.py,merge_manifest.py}`、`build-dockerhub.yml`、`block-master-prs.yml` 的 actor 守卫、OpenWrt 包元数据，以及锁步的 `tests/test_build_plan.py` 与 `tests/ci_delivery_scripts_test.sh`。
- 文档中的仓库身份链接改指本 fork。**Wiki 链接仍指向上游**（本 fork 没有 wiki，`/wiki` 会 302 回仓库首页）。
- 版权归属保留：`/version` 的「项目沿革」段、LICENSE，以及 `Custom_OpenClash_Rules`、`Rule-Bot` 等相关项目链接均未改动。
- 刻意未改：`bridge/go.mod` 的 module 路径，以及 CI 会读取的 `com.aethersailor.dependency-snapshot.sha256` 标签。

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

### 测试

- 后端 smoke 新增 `inline_rules`（10 例）与短链更新（4 例）用例，并新增 `--short-link-password` 参数（默认读 `SUBCONVERTER_SHORT_LINK_PASSWORD`）。
- 短链更新与内联规则的 smoke 夹具改用**无远程规则集**的 preset，避免转换时等待不可达主机；`assert_inline_rules_valid` 由约 12.7s 降至 0.0s，消除了原有的间歇性超时。
- `tests/short_link_storage_test.cpp` 覆盖原地更新语义、拒绝更新不改动记录、以及缺 `updated_at` 的老文件兼容。
- 前端 vitest 覆盖行 ↔ 字符串互转、`useGroupNames` 代理重写/缓存/超时、`requestUpdateShortLink` 与 manager 就地打补丁。

### 已知问题

- 部署环境若 DNS 对 `.invalid` 域名**挂起而不快速失败**，`assert_getgroupnames_bad_url` 与 `assert_ext_ruleset_fetch_failure` 会因 nginx 先返回 504 而失败（期望后端 400）。根因是后端出站 fetch 缺少超时上限，尚未修复。
- 测试容器当前未挂载 `/base/short-links` 卷，`docker rm` 重建会丢失短链记录并重新生成管理密码；长期部署请参考 `docker-compose.yml` 挂载持久化目录。

---

## 更早的变更

本 fork 在 v1.10.0 之前相对上游已包含以下功能：

- `ext_ruleset=Group,URL[;...]`：向所选 preset 的已有策略组追加远程规则来源，含严格组名校验、atomic 抓取失败语义与配额限制。
- `GET /getgroupnames?config=<url>`：返回所选远程配置的合法策略组名，供 UI 下拉自动加载；与 `ext_ruleset` 校验共用 `collectExternalGroupNames`，保证两端清单一致。
- 「额外规则集」行式控件：组名下拉 + URL 输入 + 增删行，替代原先需要手写 `组名,URL` 的多行文本框。
- `scripts/run-subconverter-smoke.py` 覆盖上述参数的正常/异常路径。
