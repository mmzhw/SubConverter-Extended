# Proposal: 集成前端可视化配置界面（Web 配置界面 + Docker 单端口部署）

## Why

目前 SubConverter-Extended 只有命令行/手工拼接 URL 的用法：用户需要记忆 `/sub?target=clash&url=...&emoji=true` 这类参数才能生成订阅链接，社区常用的 sub-web 前端还需要单独部署一套服务。集成一个前端可视化配置界面到本仓库，并让 Docker 镜像内置 nginx + subconverter 双进程、只暴露一个端口，用户构建镜像后即可开箱即用地通过浏览器组装订阅 URL，无需额外部署任何组件。

## What Changes

- 新增 **Vue 3 + Vite + Element Plus SPA** 前端（仓库新增 `web/` 目录），提供可视化 URL 组装界面（桌面两栏布局、移动端单栏 + 底部固定操作栏）：
  - 选择目标格式（clash / mihomo / singbox / surfboard 等）、填写订阅源地址，勾选常用选项（emoji、tfo、udp、sort、rename、ruleset 等），实时生成并展示组装好的订阅 URL；
  - 支持粘贴现有订阅链接自动解析参数回填表单；
  - 支持配置方案保存到浏览器 localStorage、一键加载复用；
  - 支持一键复制 URL、展示二维码便于手机扫码导入。
- **Docker 镜像改为单镜像双进程**：运行时同时运行 nginx 与 subconverter，nginx 托管前端静态资源，并将 `/sub`、`/getprofile`、`/getruleset` 等后端 API 反向代理到 `127.0.0.1:25500` 的 subconverter 服务。
- **暴露端口变化**：镜像只暴露一个 nginx 端口（默认 8080），原 25500 端口不再对外发布，仅保留为容器内部回环通信。**BREAKING**：`docker-compose.yml` 的端口映射由 `25500:25500` 改为 nginx 端口。
- Dockerfile 新增 Node 构建阶段（编译前端产物），最终运行阶段基于现有 Alpine 运行时追加 nginx 与启动编排（如 s6-overlay 或轻量启动脚本）。
- 现有 `/dashboard`、`/inspect`、`/version` 页面保持由 subconverter 直接服务，经 nginx 反代后路径与行为不变。

## Capabilities

### New Capabilities

- `web-config-ui`: 前端可视化配置界面（Vue 3 SPA）的行为规格——URL 组装、导入解析、预设保存、复制与二维码。
- `web-serving`: Docker 镜像内 nginx + subconverter 双进程部署与反向代理行为规格——单端口暴露、路径路由、subconverter 内部回环访问。

### Modified Capabilities

<!-- 无现有 capability 的规格级行为变化 -->

## Impact

- 新增 `web/` 前端源码树（Vue 3 + Vite + Element Plus + package.json），不影响 C++ 核心转换逻辑。
- 修改 `Dockerfile`：新增 Node 构建阶段、运行阶段安装 nginx、入口脚本编排双进程。
- 新增 nginx 配置模板与启动编排脚本（`docker/` 或 `scripts/` 下）。
- 修改 `docker-compose.yml`：端口映射改为 nginx 端口；文档注释同步更新。
- `src/` C++ 服务端代码基本不动（可能仅涉及 nginx 反代下 client-ip 信任配置的文档说明，见 design.md）。
