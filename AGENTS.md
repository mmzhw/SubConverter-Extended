# AGENTS.md

给在这个仓库里工作的 AI agent 的入口说明。

## 先读这个

**[`docs/RELEASE-RUNBOOK.md`](docs/RELEASE-RUNBOOK.md)** —— 维护与发布手册。
仓库结构、本地验证命令、测试服务器构建方式、CI 全景、发布步骤、
发布后验收、**已知坑清单**、故障速查表、收尾清单都在里面。
动手前读一遍能省掉大量试错。

敏感信息（服务器地址与口令、Docker Hub 凭据）在仓库根的 `EXPERIENCE.md`，
**该文件已 gitignore，不要提交，也不要把内容复制进其它文件**。

## 这个仓库是什么

`mmzhw/SubConverter-Extended`，`Aethersailor/SubConverter-Extended` 的 fork，
基线 v1.8.6。C++ 后端 + Vue 3 前端，Docker 交付，OpenSpec 管理规格。

**与上游最大的结构差异**：本 fork 的容器是 **nginx 前置**，C++ 后端只听
`127.0.0.1`。写镜像 smoke 或端口相关代码时必须记住这一点，并注意
**armv7 镜像走另一个 Dockerfile、没有 nginx**。

## 硬规则

1. **发布必须用附注 tag**：`git tag -a vX.Y.Z -m "..."`。轻量 tag 不触发 CI。
2. **同一个版本号不能重发**：registry 里已存在该 tag 会让 `prepare` 直接失败，
   要换新版本号。详见手册第 5 节。
3. **改行为就要走 OpenSpec**：`proposal.md` / `design.md` / delta `spec.md` /
   `tasks.md`，实现后同步主 spec 再归档。delta 里 `### Requirement:` 的名字
   **必须与主 spec 逐字一致**，否则会新增重复需求。
4. **不要提交敏感信息**：真实订阅 URL、节点凭据、Token、口令、私有主机名一律不进仓库。
5. **`web/` 的改动必须过三关**：`npx vitest run`、`npx vue-tsc --noEmit`、`npm run build`。

## 快速验证

```bash
cd web && npx vitest run && npx vue-tsc --noEmit && npm run build
openspec validate --specs && openspec validate --changes
```

C++ 改动本地编译不了，必须按手册第 3 节到测试服务器构建验证。

## 分支约定

`CONTRIBUTING.md` 规定 `dev` 是集成分支、PR 目标为 `dev`，`master` 由发布流程同步。
**但本 fork 上目前没有 `dev` 分支**，实际发布是手工打 `vX.Y.Z` 附注 tag。
两条路径的细节与差异见手册第 5 节「本项目的两条发版路径」。

提交前先确认当前分支和用户意图；与文档不一致时以用户当次要求为准，并在回复中说明。

## 回复风格

用户偏好：**结论先行、给出可验证的证据**（命令输出、HTTP 状态码、实际截图），
失败时直说原因而不是绕开。不确定就说不确定，不要用推测填空。
