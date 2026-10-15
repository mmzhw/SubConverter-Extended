# 上游同步进度

更新日期：2026-10-15。后续会话、其他机器或其他维护者请先读此文件，再决定同步范围。

## 当前结论

**第一批兼容性修复已完成并随本 fork 的 `v1.12.1` 发布；没有整体合并上游 `v1.9.15`。**

| 项目 | 记录 |
| --- | --- |
| 上游仓库 | [Aethersailor/SubConverter-Extended](https://github.com/Aethersailor/SubConverter-Extended) |
| 原始共同基线 | 上游 `v1.8.6`，`7065ec839fe246f9e9fb670f272a8f4c9250c6df` |
| 已审阅范围的截止点 | 上游 `v1.9.15` / master `23f93c11eac3610fad1564a1bde799aa3018694e`，2026-10-13 |
| 已实施的范围 | 从上述范围中选择七条提交，覆盖下表五组修复 |
| 本 fork 发布版本 | [`v1.12.1`](https://github.com/mmzhw/SubConverter-Extended/releases/tag/v1.12.1)，2026-10-15 |
| 发布代码提交 | `3016b393c2d6cc310e20d6487162f9678b629aa2` |
| 发布 CI | [38676988053](https://github.com/mmzhw/SubConverter-Extended/actions/runs/38676988053)，Success |

“已审阅截止点”只表示排查覆盖到这个上游快照，不代表已经吸收其全部代码，也不保证它仍是上游实时最新提交。本 fork 和上游使用独立版本线，不能按版本号大小推断同步程度。

## 已同步并发布

这些修复通过补丁移植进入本 fork 的提交，**没有把对应上游提交加入本分支的 Git 祖先链**。

| 修复组 | 上游提交 | 当前状态 |
| --- | --- | --- |
| 订阅解码保留 URI 转义；先识别 YAML、再解开 Base64；URI 列表跳过坏节点，原生 YAML 保持严格校验 | `fbeb833158425e46a4479e7d99371ccbfb7ae993` | 已同步，`v1.12.1` |
| Clash Provider URL 不再重复解码，保留签名参数和嵌套 URL | `619c189d61005ca9555bcd562b87a265229d7202` | 已同步，`v1.12.1` |
| data URI 保留 `+`、载荷字节和普通文本换行，减少编码缓冲区占用，并兼容换行包裹的 Base64 | `5694018d59021c0d4880590465aa968241ed9d57`、`97019775309195b3dfdfc99a2c64a35fe60ea608`、`06c3e1cf8c0a13dc91e967ce33b839581d6aa022` | 三条一组已同步，`v1.12.1` |
| 规则转换和 `/getruleset` 输出保留 URL、正则、路径中的字面 `//` | `a67b8970b06026d65e8d8eea40a2bd16e1912fe1` | 已同步，`v1.12.1` |
| 已完成但失败的共享抓取退出复用，允许新消费者真正重试；成功结果继续复用 | `ecf467a6c8abd6f2a2b574f4a4947b73b067c2ea` | 已同步，`v1.12.1` |

本 fork 的实施与验收提交：

- `58acdc15a2300598925c5ce2ac933caed69672f9`：第一批七条上游修复及新增回归测试。
- `d13c4e659152ea2b29834ac6f82b0d0ccfbc3d8c`：补齐测试接线、修正夹具、记录服务器验收并归档规格；未追加修改生产代码。
- `3016b393c2d6cc310e20d6487162f9678b629aa2`：整理 `v1.12.1` 发布日志，附注 tag 指向此提交。

详细行为与验证证据：

- [主规格](openspec/specs/upstream-compatibility/spec.md)
- [归档设计](openspec/changes/archive/2026-10-14-merge-upstream-compatibility-fixes/design.md)
- [归档验收记录](openspec/changes/archive/2026-10-14-merge-upstream-compatibility-fixes/tasks.md)
- [版本更新日志](CHANGELOG.md)

## 尚未同步

下表是已审阅后的待选清单，**不代表已获准实施，也不属于 `v1.12.1` 的能力**。

| 改动 | 上游参考 | 建议与边界 |
| --- | --- | --- |
| Clash 策略组继承 `expected-status`、`timeout`、`lazy` | `2960091e` / PR #150 | 推荐下一批评估；拆开同提交中的 YAML arena、yaml-cpp 和构建优化，不整体覆盖生成器 |
| Stash DoH3 URL 引用修复 | `e2017331` | 使用 Stash 时选择性引入 |
| Sing-box 去除冗余 DNS detour、现代化远程规则与 HTTP client 配置 | `76d9094e`、`1f042a82` / PR #140 | 使用相关客户端时引入；须验证新旧客户端和 legacy 模板分支 |
| 连通性测试 URL 统一 | `518403ed` | 可选维护项，结合部署网络可达性判断 |
| 显式 HTTP(S) 节点 `node:` | `cfcab7f6` / PR #143 | 新增能力；后端与 Web UI 校验、导入往返必须一起设计，不等于通用 HTTP 代理 URI 支持 |
| Mihomo Alpha、Mieru、Go 依赖及生成能力表更新 | `605f280d` 及后续依赖/生成提交 | 尚未升级；`v1.12.1` 保持 Mihomo `v1.19.30`、Mieru `v3.36.0`。升级时锁步处理模块、能力表、生成头文件和依赖快照 |
| 异步转换流水线、QuickJS lane、owner/transport admission、共享内存预算等运行时重构 | 2026-08-26 起的系列提交，含 `97a2d874` | 单独立项，不能与小型兼容性修复混合；本批没有新增上游的 `src/runtime/` 执行模型 |
| OpenWrt 双语 LuCI、IPK/APK 17 架构与软浮点构建扩展 | `6d5dcddd`、`de04dbe0` | 原生 OpenWrt 有需求时引入；本项目既有 APK 交付不等于已同步这批扩展 |

`7a2acd15` 修复的是新异步运行时中的同步 import 回退；当前没有该抽象，不应单独当作本项目的一处待补漏洞。若以后迁移该运行时，必须保留其后续修复。

## 明确不照搬

- 不引入 `4637c8f1` 的测试、smoke 与 PR 门禁删除；保留本 fork 的回归测试。
- 不照搬 dev-only CodeQL 和依赖自动合并策略；保持本 fork 当前的 master + 附注 tag 发布方式。
- 不整体替换 Dockerfile、Compose、更新器或仓库身份配置；保持 nginx 前置、回环端口、持久化目录和本 fork 镜像命名空间。
- 不机械重放上游性能试验及其撤回提交，也不在没有压测证据时声称性能必然提升。

## 本 fork 必须保留的能力

- Web UI、多订阅源输入、内联规则、额外规则集、置顶/追加顺序及按参数族共享配额。
- 真实策略组校验和 `DIRECT` / `REJECT` 内置策略；额外规则集抓取失败的 atomic 语义及 HTTP(S)-only 来源限制。
- `parseExternalClashRules(..., require_target=false)` 与独立的 `user_prepend` 合并槽位。
- 可编辑短链、旧数据兼容、单链接 DNS 模板、GitHub 代理与测延迟，以及相关持久化。
- amd64/arm64 的 nginx 前置与后端 `127.0.0.1:25501`；armv7 没有 nginx，不能套同一监听断言。
- 本 fork 的仓库、镜像和自动更新来源；不得被上游同名配置覆盖。

## 验证与发布状态

- 测试服务器完成 Linux amd64 生产程序和镜像构建；固定 `nofile=1048576:1048576` 后完整 CTest **36/36** 通过，Linux Go 全量测试通过。
- 前端 220 个测试、类型检查和构建通过。后端新集成入口为 `tests/upstream_compatibility_test.py`。
- 发布 CI 完成 amd64、arm64、arm/v7 构建与镜像 smoke，Windows 包和 Linux 便携包已发布。
- 2026-10-15 发布验收确认 Docker Hub 和 GHCR 的 `v1.12.1`、`latest` 指向同一镜像摘要，包含上述三个 Linux 平台。`latest` 是可变别名，今后需要实时查询，不应永久假定它仍指向本版本。

发布验收摘要：

```text
sha256:933a8344409759e35287c71282bf1017276328237ab5f5f282aa46b1cd08a9ae
```

镜像：`mmzhw51/subconverter-extended:v1.12.1`、`ghcr.io/mmzhw/subconverter-extended:v1.12.1`。

未做独立 Mihomo/sing-box 客户端校验器验收。默认资源边界下的热重载差异、早期 HTTP 终态归因偶发失败和后续重复测试，均保留在归档验收记录中；一次全量通过不代表所有时序问题已被消除。

## 下一次如何继续

1. 先读本文件和归档验收记录，再刷新上游引用，区分“已审阅”与“已实施”。
2. 从待选清单确认下一批范围；新行为按 AGENTS.md 走 OpenSpec，不默认扩大到整个上游。
3. 核对补丁内容和测试，不能仅用 `git log HEAD..upstream/master` 或 `git cherry` 判断七条修复仍未同步：它们是手工移植，祖先关系没有改变。
4. 不要直接 merge/覆盖上游整棵树。首次整体合并预演曾有 17 个冲突文件；该数字是历史审计结果，后续须重新预演。
5. 每批完成后更新“已同步”“尚未同步”、本 fork 提交、发布版本和验证边界；文档提交不代表新镜像已发布。
6. `v1.12.1` 已发布，不能重用或改写其 tag。后续代码发布使用新的附注版本 tag。
