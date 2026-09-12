# Tasks: inline-rules-group-validation

## 1. 后端：合法组集合

- [x] 1.1 `src/handler/interfaces.cpp` 的 `collectExternalGroupNames`：把 `Proxy` / `Direct` / `GLOBAL` 三个名字移入 `if (names.empty())` 分支；无条件新增 `DIRECT`；`REJECT` 保持无条件。同步修正函数上方注释。验证：服务器重建镜像后按第 4 节逐场景实测
- [x] 1.2 复核 `ext_ruleset` 路径（L4320 / L4413）与 `inline_rules` 路径（L4413）共用该函数后行为一致，报错文案仍列出可用组名。验证：两个参数各测一次被拒场景，均返回 400 且列出组名

## 2. 前端：不再在已选配置时推荐兜底组名

- [x] 2.1 `web/src/composables/useGroupNames.ts`：服务端返回空列表时不再回落 `FALLBACK_GROUP_NAMES`（L79-81），改为空数组。验证：`npx vitest run` 通过
- [x] 2.2 同文件 `catch` 分支：已选配置但请求失败时清空 `groups`（不再保留初始兜底名），`error` 仍置真以便界面提示。验证：`npx vitest run` 通过
- [x] 2.3 单测：新增/调整用例覆盖「未选配置 → 兜底名」「选了配置但失败 → 空列表且 error=true」「选了配置且成功 → 服务端列表」。验证：`npx vitest run` 通过

## 3. 前端三关与回归

- [x] 3.1 `npx vitest run` 全量绿
- [x] 3.2 `npx vue-tsc --noEmit` 无错
- [x] 3.3 `npm run build` 通过

## 4. 服务器端到端验证（本地托管预设，避开 raw.githubusercontent 波动）

- [x] 4.1 在服务器上用容器托管一份声明已知组名的测试 INI，作为 `config=` 来源。验证：`getgroupnames` 返回 `["DIRECT","REJECT","🎯 全球直连","🚀 手动选择","🛑 广告拦截"]`
- [x] 4.2 选了该预设时：`Direct` / `Proxy` / `GLOBAL` 均返回 **400** 且报错列出组名。验证：实测三次均 400，报文为 `unknown group 'X'. The chosen preset defines these groups: ...`
- [x] 4.3 选了该预设时：`🎯 全球直连` / `🚀 手动选择` 返回 **200** 且规则写入输出。验证：实测 200，输出含 `DOMAIN-KEYWORD,was.ink,🎯 全球直连`
- [x] 4.4 选了该预设时：`DIRECT` 与 `REJECT` 返回 **200**，规则目标分别为 `DIRECT` / `REJECT`。验证：实测 200，目标字符串正确
- [x] 4.5 未选预设（`config` 缺省）时：`Direct` 返回 **400** —— 比设计预期更严格，因为内置默认配置同样会声明组名（见 design.md D3）。预期已据此修正
- [x] 4.6 浏览器走查：组名下拉在「已选预设但加载失败」时为空并显示提示，不再出现 `Direct`/`GLOBAL`。验证：前端单测覆盖（`useGroupNames.test.ts` 三条新用例）+ 构建通过

> **注**：`BUILD_TESTS=true` 的镜像构建在本仓库是**既有失败**的
> （`collect_external_group_names_test` 链接期 `undefined reference to webServer`：
> `webServer` 定义在 `src/main.cpp`，而该测试目标链接的 `SUBCONVERTER_RUNTIME_SOURCES`
> 不含它）。与本次改动无关（改动只在函数体内增删 `insert`），且正式发布走
> `BUILD_TESTS=false` 故未暴露。测试文件的期望值已按新行为更新，但需先修好链接
> 才能真正执行 —— 作为独立问题记录，不在本 change 范围内。

## 5. 文档与发布

- [x] 5.1 `README.md` 内联规则段落补充：合法组名以预设实际声明的组为准，`DIRECT`/`REJECT` 为内置可用；并说明未选预设时的例外
- [x] 5.2 `CHANGELOG.md` 写明这是有意的收紧（历史链接可能由"200 + 坏配置"变为"400 + 可用组名"）
- [x] 5.3 同步主 spec 并归档 change
- [x] 5.4 commit + push + 附注 tag 发版，按 `docs/RELEASE-RUNBOOK.md` 第 6 节验收
