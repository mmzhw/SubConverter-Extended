# SubConverter Config UI — Design System (MASTER)

> 来源：ui-ux-pro-max 已验证数据（style 域 glassmorphism、product 域 Developer Tool、ux 域表单指南、vue 栈指南）+ 项目现有 dashboard 设计 token 合成。聚合输出中不匹配的「FAQ Landing 模式 / 绿色 OLED 色板」未采用。
> 生成日期：2026-08-29。变更源：openspec/changes/add-web-config-ui/design.md D8。

## 1. 色彩 Token

沿用 dashboard 既有 token（浅/深双模式，`prefers-color-scheme` 自动切换）：

| Token | Light | Dark |
|---|---|---|
| `--accent` | `#2563eb` | `#38bdf8` |
| `--accent-2` | `#0ea5e9` | `#60a5fa` |
| `--accent-gradient` | `linear-gradient(135deg, #0ea5e9 0%, #2563eb 58%, #1d4ed8 100%)` | 同上（暗色变体） |
| `--surface` | `rgba(255,255,255,.82)` | `rgba(15,23,42,.72)` |
| `--surface-border` | `rgba(15,23,42,.1)` | `rgba(148,163,184,.18)` |
| `--text-primary` | `#1a202c` | `#f8f9fa` |
| `--text-secondary` | `#4a5568` | `#a0aec0` |
| `--danger` | `#dc2626` | `#f87171` |

Element Plus 主题映射：`--el-color-primary` → `--accent`（浅色模式）；深色模式有意分叉——`--el-color-primary: #2563eb`（按钮 4.5:1 对比度），`--accent` 保持 `#38bdf8` 用于文字/强调；`--el-border-radius-base` 向 dashboard 圆角（16–28px 卡片、999px 按钮）靠拢；表单控件背景用 `--control-bg` 玻璃感。

## 2. 字体配对

- **界面字体**：Outfit（400/500/600/700），与 dashboard 一致；中英文回退 `system-ui, "Microsoft YaHei", "PingFang SC"`。
- **代码/URL 显示**：JetBrains Mono（400/500），用于 URL 预览、导入解析框。
- 正文 16px 基线、行高 1.5；标签 0.88rem 加粗；正文不得小于 12px。

## 3. 布局

- **桌面 ≥1024px**：两栏。左栏表单（目标格式 el-select、订阅源 el-input、选项分组 el-collapse、保存预设/导入）；右栏粘性结果预览（URL 卡片、复制按钮、二维码、预设列表）。容器 max-width ~1180px，与 dashboard `.shell` 一致。
- **移动端 <768px**：单栏堆叠；底部固定操作栏（复制 / 二维码 / 展开完整 URL），表单容器预留底部留白（操作栏高度 + 安全区 env(safe-area-inset-bottom)）；最小支持 375px。
- **768–1023px**：过渡区间，右栏预览转为非粘性堆叠。
- 无横向滚动；触控目标 ≥44×44px。

## 4. 组件与交互规范（UX 规则）

- **表单校验**：订阅源 URL 在 blur 时校验，行内错误提示紧邻字段；不只在提交时校验。
- **错误可达**：导入失败提示为可聚焦容器（`role="alert" tabindex="-1"`），不依赖 toast。
- **操作反馈**：复制/保存按钮 loading → 成功/失败状态，禁止无反馈点击。
- **玻璃拟态**：backdrop-filter blur 15–24px、半透明白 10–30%、1px 浅边框；保证文字对比度 4.5:1（浅/深均验）。
- **图标**：Element Plus SVG 图标，禁用 emoji 作为图标。
- **动效**：hover/过渡 150–300ms；尊重 `prefers-reduced-motion`；不做大位移动画。
- **可访问性**：键盘可达、focus 可见（outline 不删除）；表单控件必须有可见 label（禁止 placeholder-only）。
- **Vue 规范**：禁止 `v-if` 与 `v-for` 同元素；表单校验用 Element Plus 自带规则，不引 VeeValidate。

## 5. 交付前 Checklist

- [ ] 浅/深模式文本对比度 4.5:1
- [ ] 键盘导航全流程可达、focus 可见
- [ ] `prefers-reduced-motion` 生效
- [ ] 375 / 768 / 1024 / 1440 四档视口无横向滚动
- [ ] 移动端底部操作栏可达、不遮挡内容（底部留白）
- [ ] 触控目标 ≥44px
- [ ] SVG 图标（无 emoji）
- [ ] 双语切换即时生效（zh-CN / en）
