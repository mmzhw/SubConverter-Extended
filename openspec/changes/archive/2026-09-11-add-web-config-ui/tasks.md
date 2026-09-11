# Tasks: 前端可视化配置界面 + Docker 单端口部署

## 1. 路由与参数盘点

- [ ] 1.1 盘点 `src/handler/interfaces.cpp` 注册的全部公开路径（`/sub`、`/getprofile`、`/getruleset` 等），在 `docker/nginx/` 下产出代理路径清单文件；验证：清单逐条对应 interfaces.cpp 中的注册项，无遗漏
- [ ] 1.2 汇总 subconverter 支持的目标格式与常用选项参数（对照 README/docs 与 `pref.example.toml`，含本项目扩展参数如 `provider=`），产出参数元数据草案；验证：与文档中的参数表逐项核对一致

## 2. 前端脚手架

- [ ] 2.1 初始化 `web/` 项目（Vite + Vue 3 + TypeScript + **Element Plus** + vue-i18n + vitest），提交 `package.json` 与 `package-lock.json`；验证：`npm ci && npm run dev` 成功启动开发服务器
- [ ] 2.2 搭建基础布局与主题：Element Plus 主题变量映射 dashboard 设计 token（配色/圆角），Outfit 界面字体 + JetBrains Mono URL 预览，双语框架；验证：中文浏览器默认显示中文、切换按钮立即切换语言（规格：界面语言）
- [ ] 2.3 编写设计系统文档 `design-system/subconverter-config-ui/MASTER.md`（色彩 token、字体配对、布局、UX/无障碍规则，内容按 design.md D8 合成）；验证：文档四部分齐全且与 D8 一致
- [ ] 2.4 实现响应式布局：桌面（≥1024px）两栏表单 + 右侧粘性预览；移动端单栏堆叠 + 底部固定操作栏（复制/二维码/展开 URL），触控目标 ≥44px、底部留白避让；验证：375/768/1024/1440 四档视口无横向滚动且操作可达（规格：视口支持）

## 3. URL 组装与导入解析

- [ ] 3.1 实现 `web/src/config/options.ts` 参数元数据（目标格式、分组选项、默认值、双语标签，任务 1.2 的草案落地）；验证：vitest 断言清单非空且每个选项具备完整标签与默认值
- [ ] 3.2 实现 `buildSubUrl` 纯函数：按表单状态组装 `/sub?...` URL，url 参数百分号编码，支持相对路径与自定义后端前缀；验证：vitest 覆盖特殊字符编码（`&`、`=`）与 `target` 参数断言（规格：可视化组装订阅 URL）
- [ ] 3.3 实现组装表单 UI（el-select 目标格式、el-input 订阅源带 blur 校验 + 行内错误、el-collapse 选项分组、URL 实时展示）；验证：dev server 中修改任一控件 URL 立即更新（规格：实时更新场景）
- [ ] 3.4 实现 `parseSubUrl` 纯函数：解析已有订阅链接回填参数，未知参数透传保留，非法输入报错；验证：vitest 覆盖成功回填、未知参数保留、非法链接报错（规格：导入现有订阅链接解析）
- [ ] 3.5 实现导入交互（粘贴框 + 错误提示，失败时表单保持原状）；验证：浏览器粘贴合法/非法链接观察回填与提示（规格：无效链接场景）

## 4. 预设、复制与二维码

- [ ] 4.1 实现预设保存/加载/删除（localStorage + 命名预设）；验证：保存后新会话加载恢复全部表单状态（规格：预设保存与复用）
- [ ] 4.2 实现 localStorage 不可用时的提示降级；验证：禁用浏览器本地存储后保存预设显示明确提示，其余功能不受影响（规格：存储不可用场景）
- [ ] 4.3 实现一键复制（`navigator.clipboard` 优先，`execCommand` 降级）与 loading→成功/失败反馈；验证：点击复制后剪贴板内容与展示 URL 完全一致（规格：一键复制与二维码）
- [ ] 4.4 集成 `qrcode` 库渲染二维码（本地打包、dataURL，无外链依赖）；验证：扫码结果与当前展示 URL 一致（规格：二维码场景）

## 5. Docker / nginx 部署形态

- [ ] 5.1 编写 nginx 配置模板（`envsubst` 渲染 `WEB_PORT`；任务 1.1 清单内路径反代 `127.0.0.1:25500` 并设置 `X-Real-IP`/`X-Forwarded-For`/`Host`；SPA `try_files` 回退；`/assets/` 长缓存、`index.html` 不缓存）；验证：`nginx -t` 校验通过
- [ ] 5.2 编写 s6-overlay 服务定义（nginx 前台运行 + subconverter，oneshot `up` 为 execlineb 单行、shell 逻辑放独立脚本），启动脚本按 D5 默认导出 dashboard 客户端 IP 环境变量（用户显式设置时尊重）；验证：s6 服务树静态校验（sh -n、up 单行、COPY 目标在 s6-rc.d 之外）+ 容器运行时冒烟（longrun 崩溃由 s6 重启、HEALTHCHECK 转不健康，见 5.5 端到端）
- [ ] 5.3 修改 Dockerfile：新增 `web-builder` 阶段（node:20-alpine，`npm ci` + `npm run build`）；最终阶段安装 nginx/s6-overlay、拷贝 dist 与配置、镜像内 `pref.example.toml` 副本 listen 改为 `127.0.0.1`、`EXPOSE 8080`、HEALTHCHECK 同时探测 `/` 与 `/version`；验证：`docker build` 成功且 `docker inspect` 见 HEALTHCHECK 与 EXPOSE 8080
- [ ] 5.4 更新 `docker-compose.yml`：端口映射改为 `"${WEB_PORT:-8080}:8080/tcp"`、补充 WEB_PORT 环境变量与注释（BREAKING 说明）；验证：`docker compose up` 后经 8080 可打开前端并完成一次转换，外部无法直连 25500（规格：单镜像单端口部署）
- [ ] 5.5 端到端验证反代行为：经 8080 访问 `/sub`、`/dashboard`、`/version` 行为与直连一致；验证：dashboard 防爆破按真实客户端 IP 区分（容器日志中 peer 为原始客户端地址，规格：反向代理转换接口、subconverter 自有页面兼容）

## 6. 文档与整体验收

- [ ] 6.1 更新 README 与 docker-compose 注释：新端口用法、迁移说明（25500 → 8080）、回滚方式；验证：按文档步骤新用户可完成部署与订阅组装
- [ ] 6.2 规格场景整体走查：组装/导入/预设/复制/二维码/语言/自定义后端/视口/健康检查逐项验收；验证：对照 `specs/web-config-ui/spec.md` 与 `specs/web-serving/spec.md` 全部场景通过
- [ ] 6.3 UI 交付验收：浅/深对比度 4.5:1、键盘可达、focus 可见、`prefers-reduced-motion`、SVG 图标无 emoji、375/768/1024/1440 四档断点无横向滚动、移动端底部操作栏可达性与触控目标；验证：对照 checklist 逐项通过
