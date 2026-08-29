# Design: 前端可视化配置界面 + Docker 单端口部署

## Context

- 仓库现状：C++ 后端（subconverter 演进版）通过 cpp-httplib/Beast 在 `25500` 端口直接对外服务，内置页面（`/dashboard`、`/inspect`、`/version`）以单文件 HTML 编译进二进制（`resources/*.html` → `generated/*.html.inc`）。
- Dockerfile：多阶段构建，最终阶段为 Alpine 运行时 + `start-subconverter` 脚本，`EXPOSE 25500`；docker-compose 发布 `25500:25500`。
- 仓库无任何 Node 前端工具链；Dockerfile 基础镜像均使用 `mirror.gcr.io/library/*` 前缀。
- 动机见 proposal.md「Why」。

## Goals / Non-Goals

**Goals:**

- 新增独立前端源码树，不侵入 C++ 核心转换逻辑；`src/` 代码改动最小化（最好为零）。
- 镜像构建一次即含前端产物与 nginx 配置，无运行时额外下载。
- 单容器单端口对外，内部双进程可监督、可健康检查。
- 前端产物完全本地打包（含二维码库），不依赖运行时 CDN。

**Non-Goals:**

- 不为前端新增后端 API（选项清单静态维护在前端），不做服务端 pref 在线编辑。
- 不做 HTTPS/TLS（交给外层反向代理）。
- 不改造现有 dashboard/inspect/version 页面本身，仅保证经 nginx 反代后行为不变。
- 不做多容器 compose 编排（保留现有单服务 compose 结构，仅改端口与环境变量）。

## Decisions

### D1: 前端技术栈 — Vue 3 + Vite + TypeScript + Element Plus（用户已确认）

- 结构：仓库新增 `web/` 目录，`package.json` + `package-lock.json` 提交入库。
- 使用 TypeScript：URL 组装/解析是参数模型的纯函数逻辑，类型约束便于测试与长期维护。
- UI 组件库使用 **Element Plus**（用户确认）：表单控件、折叠面板、选择器、开关、反馈消息直接用其组件；通过主题变量把 Element Plus 的 `--el-color-*` 等 token 映射到 dashboard 设计 token，保持视觉一致。不在此基础上叠加其他 UI 层。
- 状态管理不引入 Pinia：表单状态单一，用 composable + `localStorage` 持久化即可。
- i18n 用 `vue-i18n`（标准方案），语言偏好存储 key 沿用 dashboard 的 `sce-dashboard-lang` 风格（新 key `sce-config-lang`）。
- 测试：Vitest 覆盖核心纯函数（`buildSubUrl` / `parseSubUrl` / 预设序列化）。
- 备选：React SPA（被否：与项目现有风格差异最大、生态迁移成本无收益）；原生静态页（被否：用户明确选择 Vue 3 + Vite）；手写轻量样式不引组件库（被否：用户明确要求 Element Plus）。

### D2: 参数元数据静态维护，前后端解耦

- 目标格式与选项的清单、分组、默认值、中文/英文标签集中放在 `web/src/config/options.ts`（单一事实来源），对齐 subconverter 文档参数（clash / mihomo / singbox / surge / surfboard / loon / quanx / ss 等 target；emoji、tfo、udp、sort、rename、ruleset、本项目扩展参数如 `provider=` 等）。
- 理由：不新增后端接口、不动 C++ 服务端，规格要求的「URL 组装」完全在前端完成。
- 风险缓解：导入解析遇到清单外的未知参数时原样保留（透传），避免信息丢失。
- 备选：新增 `/api/options` 动态下发（被否：侵入服务端，超出本次范围，见 Non-Goals）。

### D3: Docker 运行时双进程监督 — s6-overlay

- 最终 Alpine 阶段 `apk add nginx s6-overlay`，用两个 s6 service 定义 nginx（前台 `daemon off`）与 subconverter；任一进程退出 s6 按策略终止容器，满足规格「进程监督」要求。
- 备选：`bash -n wait` + trap 的轻量脚本（被否：alpine 默认 ash 不支持 `wait -n`，信号处理边界多，可靠性不如 s6-overlay；体积差异可接受）。

### D4: nginx 路由策略 — 显式 API 前缀代理 + SPA 回退

- 监听 `${WEB_PORT}`（默认 8080），启动时由 `envsubst` 从模板渲染 `nginx.conf`。
- 明确清单内的 subconverter 路径（`/sub`、`/getprofile`、`/getruleset`、`/get`、`/mix`、`/render`、`/convert`、`/dashboard`、`/inspect`、`/version` 及其数据接口）`proxy_pass http://127.0.0.1:25500`，透传方法、查询串，设置 `X-Real-IP`、`X-Forwarded-For`、`Host`。
  - 实施任务第一步先盘点 `src/handler/interfaces.cpp` 注册的全部公开路径，补齐清单，避免遗漏。
- 其余路径 `try_files $uri $uri/ /index.html`（SPA 历史路由回退）；`/assets/` 长缓存 + `index.html` 不缓存。
- subconverter 在容器内仅监听 `127.0.0.1:25500`：Dockerfile 构建时对镜像内 `/base/pref.example.toml` 副本做 `sed` 替换 `listen` 值（仓库内文件不变，不影响裸机部署默认值）。

### D5: 反代下的客户端 IP 语义

- nginx 反代后 subconverter 看到的 socket peer 恒为 `127.0.0.1`，dashboard 防爆破与统计将无法区分客户端。
- 缓解：镜像启动脚本在用户未显式设置时默认导出 `SUBCONVERTER_DASHBOARD_CLIENT_IP_HEADER=x-forwarded-for` 与 `SUBCONVERTER_DASHBOARD_TRUSTED_PROXY_CIDRS=127.0.0.1/32`（变量名沿用 docker-compose.yml 注释中已文档化的环境变量），使 subconverter 信任 nginx 这一跳并还原真实客户端地址；用户显式覆盖时尊重用户配置。
- 备选：不改默认值、仅文档提示（被否：默认体验会静默丢失客户端区分能力）。

### D6: Dockerfile 变更与端口

- 新增 `web-builder` 阶段（`mirror.gcr.io/library/node:20-alpine`）：`npm ci` → `npm run build`，产物 `/build/web/dist`。
- 最终阶段：`COPY --from=web-builder /build/web/dist /usr/share/nginx/html`，追加 nginx 配置模板与 s6 service 定义；`EXPOSE 8080`。
- 健康检查：`HEALTHCHECK` 同时探测 `http://127.0.0.1:${WEB_PORT}/`（nginx 静态）与 `http://127.0.0.1:${WEB_PORT}/version`（经代理到 subconverter），一次验证两个进程。
- docker-compose：端口映射改为 `${WEB_PORT:-8080}:8080`，更新注释；25500 不再发布（**BREAKING**，见 proposal）。
- 备选：保持双端口发布（被否：用户明确「暴露一个端口」）。

### D7: 二维码与复制

- 二维码：`qrcode` 库本地打包，生成 dataURL `<img>`，内容即当前组装 URL；不依赖外链 API（离线可用）。
- 复制：`navigator.clipboard.writeText` 优先，失败（非 HTTPS/权限）降级 `document.execCommand('copy')` 临时 textarea 方案，并给出 loading→成功/失败反馈。

### D8: UI 视觉与交互设计（ui-ux-pro-max 已验证数据合成）

- 视觉方向：glassmorphism（backdrop blur 15–24px、半透明白 10–30%、1px 浅边框、Z 深度）与现有 dashboard 一致；浅/深双模式自动跟随系统；主色板沿用 dashboard 设计 token（蓝紫渐变 accent `#0ea5e9→#2563eb`、玻璃白 surface）。skill 聚合输出的绿色 OLED / FAQ Landing 方案弃用（与既有品牌冲突且模式匹配不适用，按未命中处理）。
- 字体：界面用 Outfit（与 dashboard 一致），URL 预览/代码块用 JetBrains Mono（等宽适合 URL 展示）。
- 布局：桌面（≥1024px）两栏——左侧表单（目标格式、订阅源、选项分组折叠面板）、右侧粘性结果预览（URL、复制、二维码、预设列表）；移动端单栏堆叠 + 底部固定操作栏（复制 / 二维码 / 展开完整 URL），最小支持 375px。
- 表单 UX：订阅源输入 blur 校验 + 行内错误；导入失败提示可聚焦（role=alert，不靠 toast）；复制/保存按钮 loading→成功反馈。
- 无障碍与交互：Element Plus SVG 图标（无 emoji 图标）；对比度 4.5:1（浅/深均验）；键盘可达、focus 可见；触控目标 ≥44px；尊重 `prefers-reduced-motion`；断点验收 375/768/1024/1440。
- 设计系统文档落盘 `design-system/subconverter-config-ui/MASTER.md`，供实施阶段检索。

## Risks / Trade-offs

- [单端口切换破坏现有 25500 直连部署] → 在 README / docker-compose 注释中给出迁移说明；回滚即换回旧镜像 tag；compose 默认值可被 `WEB_PORT` 覆盖。
- [nginx 代理清单与 subconverter 实际路由漂移] → 任务中先盘点 `interfaces.cpp` 全部路径生成清单；新增 API 时同步更新（清单集中在单个 nginx include 文件）。
- [反代后客户端 IP 归因错误] → D5 的默认环境变量；文档说明用户显式设置时的责任边界。
- [前端参数清单与服务端能力漂移] → 清单集中在 `options.ts` 单文件并注明对应文档来源；未知参数透传保留（导入场景）。
- [s6-overlay 增加镜像体积与一条外部依赖] → 体积增幅小（<15MB）；备选方案已在 D3 记录，可回退。
- [移动端底部固定操作栏遮挡表单内容] → 表单容器预留底部留白（操作栏高度 + 安全区），滚动至底仍可完整操作。
- [Node 构建阶段拉长 CI/构建时间] → Docker BuildKit 层缓存（依赖安装与源码构建分层），`package-lock.json` 入库保证可复现。

## Migration Plan

1. 发布新镜像后，现有 compose 用户将端口映射从 `25500:25500` 改为 `8080:8080`（或设置 `WEB_PORT`），其余挂载与环境变量不变。
2. 直连 `25500` 的局域网客户端改走新端口访问；订阅 URL 中的 `:25500` 需改为新端口或域名。
3. 回滚：pin 回旧镜像 tag 并恢复旧端口映射，行为与升级前完全一致。

## Open Questions

<!-- 无：影响规格或任务拆分的决策均已在 D1–D8 确定 -->
