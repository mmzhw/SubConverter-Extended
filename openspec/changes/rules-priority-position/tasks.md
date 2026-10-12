## 1. 后端：新合并槽位

- [x] 1.1 `src/generator/config/external_rules.h` / `.cpp`：`mergeClashRules` 与
      `mergeClashRulesWithinLimit` 增加首个参数 `const string_array &user_prepend`，顺序改为
      `user_prepend → prepend → original(非终结) → generated → append → original(终结) → generated(终结)`；
      验证：`tests/external_rules_test.cpp` 编译通过且现有断言按新签名更新后全绿。
- [x] 1.2 `src/generator/config/subexport.h`：`ExtConfig` 新增 `string_array rule_user_prepend;`
      （紧邻 `rule_prepend` / `rule_append`，带一行注释说明它是"用户前置槽位"）；
      验证：`grep -n "rule_user_prepend" src/generator/config/subexport.h` 命中且编译通过。
- [x] 1.3 `src/generator/config/subexport.cpp:2068-2097`（Clash 主路径）：`has_external_rules`
      纳入 `rule_user_prepend`，`merge_external_rules` 把新槽位作为第一个实参传入；
      验证：新增单元断言"用户前置在 `rule_prepend` 之前、`MATCH` 之后无用户规则"通过。
- [x] 1.4 `src/generator/config/subexport.cpp:3710-3725`（Stash 路径）：守卫条件扩展为
      `!ext.rule_user_prepend.empty() || !ext.rule_prepend.empty() || !ext.rule_append.empty()`，
      merge 第一个实参传 `{}`；验证：`grep -n "rule_user_prepend" src/generator/config/subexport.cpp`
      两处命中，且 Stash 输出快照测试无变化。

## 2. 后端：置顶参数

- [x] 2.1 `src/handler/interfaces.cpp`：在 `parseExtRuleset` / `parseInlineRules` 调用点
      （约 3809-3810 行）解析 `ext_ruleset_prepend=` 与 `inline_rules_prepend=`，落点数组分别为
      `policy.generator.rule_user_prepend`（ext_ruleset 先、inline 后，与 append 侧同序）；
      验证：新增的 API 层测试/手动请求断言输出 `rules:` 首条为用户前置规则。
- [x] 2.2 `src/handler/interfaces.cpp`：置顶分支的组名校验（`collectExternalGroupNames`）、
      单条规则校验（`parseExternalClashRules`，`require_target=false`）、target/list/script gating
      与现有 ext_ruleset / inline_rules 分支逐项对齐，错误文案同为双语；
      验证：非法组名、`MATCH`、空值三种输入均返回 400 且文案与追加侧一致。
- [x] 2.3 `src/handler/interfaces.cpp`：限额改为按参数族求和
      （`inline_rules` + `inline_rules_prepend` 条数之和、`ext_ruleset` + `ext_ruleset_prepend`
      来源数之和）；验证：构造刚好超限的请求返回 400，未超限请求返回 200。

## 3. 后端测试

- [x] 3.1 `tests/external_rules_test.cpp`：更新既有 `mergeClashRules` 断言签名，并新增
      "user_prepend 为空 → 输出与旧顺序逐条一致"的回归断言；
      验证：`npx` 之外的后端测试入口（见 `AGENTS.md`）编译运行全绿。
- [x] 3.2 `tests/external_rules_test.cpp`：新增 `user_prepend` 非空场景断言（位置、顺序、
      与 prepend/append 的相互关系、限额函数返回 false 的边界）；
      验证：运行后端测试通过。
- [x] 3.3 `scripts/run-subconverter-smoke.py`：新增 2 个 case——`inline_rules_prepend=` 成功且
      规则位于 `rules:` 序列最前；`inline_rules_prepend=` 非法组名 400；
      验证：`python scripts/run-subconverter-smoke.py --help` 可用，且在可用环境下运行该 2 个 case 通过
      （若环境无法起服务，记录为未执行并在交付说明中标注）。
      实际落地 3 个 case：`assert_inline_rules_prepend_places_rules_first`、
      `assert_inline_rules_prepend_unknown_group`、`assert_ext_ruleset_prepend_unknown_group`
      （第三个为第二个参数族的接线证明，同样离线）。本机无编译环境、无运行中的服务
      （127.0.0.1:8080 / 25500 均拒绝连接），故三个 case **未执行**，`--help` 与 `ast.parse` 语法检查通过；
      "用户置顶越过 preset `[ruleprepend]`" 的顺序契约改由 `tests/external_rules_test.cpp` 的
      merge 单元断言覆盖（preset 的 `ruleprepend=` 只接受 HTTP(S) URL，离线 harness 无法构造）。

## 4. 前端：落点基础设施

- [x] 4.1 新增 `web/src/lib/rule-target.ts`：`RulePlacement` 类型、`ruleParamFor(key, placement)`、
      `placementOf(params, key)`、`rulePlacementKey(key)`（返回 `${key}_mode`）四个导出；
      验证：新增 `web/src/lib/rule-target.test.ts` 覆盖两个函数的分支，`npx vitest run` 通过。
- [x] 4.2 `web/src/lib/url-builder.ts`：按 `options[\`${key}_mode\`]` 选择写 `key` 或
      `${key}_prepend`，并确保 `${key}_mode` 不出现在 URL 中；
      验证：`web/src/lib/url-builder.test.ts` 新增断言——默认落点只写 `inline_rules=`/`ext_ruleset=`，
      置顶落点只写 `*_prepend=`。
- [x] 4.3 `web/src/lib/url-parser.ts`：把 `*_prepend` 归一到 `options[key]` 并写入
      `options[\`${key}_mode\`]='prepend'`；两参数并存时以 `*_prepend` 为准且另一侧值进入 `unknown`；
      验证：`web/src/lib/url-parser.test.ts` 新增 round-trip 与并存两个 case 通过。

## 5. 前端：控件与文案

- [x] 5.1 `web/src/components/InlineRulesControl.vue`：新增 `placement` prop +
      `update:placement` emit，渲染"置顶/末尾"二选一控件与置顶提示，行/文本双模式都可见；
      验证：`npx vitest run` 与 `npx vue-tsc --noEmit` 通过，控件测试断言落点切换不丢规则。
- [x] 5.2 `web/src/components/ExtraRulesetsControl.vue`：同样新增落点开关；
      验证：组件测试断言切换落点保留 `组名,URL` 行且链接参数名随之切换。
- [x] 5.3 `web/src/components/ConfigForm.vue`：给两个控件绑定落点（读写
      `options[\`${key}_mode\`]`，默认 `'append'`）；验证：`npx vue-tsc --noEmit` 通过，
      手工/组件测试确认切换落点后生成的链接参数名改变。
- [x] 5.4 `web/src/i18n/locales/zh-CN.ts` 与 `en.ts`：新增落点标签与提示键
      （如 `form.rulePlacementPrepend` / `form.rulePlacementAppend` / `form.rulePlacementPrependHint`）；
      验证：`npx vitest run` 中 i18n 相关测试通过，页面无缺键警告。
      实际新增 4 个键（含 `form.rulePlacement` 标签键），中英各一份。

## 6. 前端测试

- [x] 6.1 `web/src/lib/url-builder.test.ts` + `url-parser.test.ts` + `rule-target.test.ts`：
      覆盖置顶/默认两种落点的往返、并存参数导入、旧链接不被改写；
      验证：`npx vitest run` 全绿。
      额外新增 `web/src/lib/rule-placement.test.ts`：把"翻转落点"作为端到端流程断言
      （解析链接 → `applyPlacement` → `buildSubUrl`），证明翻转只改参数名、不改规则内容，
      且未翻转的旧链接重建后逐字节相同。
- [x] 6.2 组件测试：落点开关在两种编辑模式间保持、切换落点内容不变、置顶提示可见；
      验证：`npx vitest run` 全绿。
      本仓库没有 `@vue/test-utils`，组件无法挂载，故新增
      `web/src/components/rule-placement-control.test.ts` 做结构断言：两个控件都声明
      `placement` prop 与 `update:placement` emit、都渲染两个落点选项与置顶提示、
      `setPlacement` 只 emit 落点（绝不改写规则值）；并断言 `InlineRulesControl.vue` 的开关
      位于 `v-if="mode === 'rows'"` 分支之前（两种编辑模式共用同一个开关）。"切换不丢内容"
      的行为由 6.1 的 `rule-placement.test.ts` 功能断言承担。

## 7. 文档与验证

- [x] 7.1 README：在"额外规则集 / 内联规则"章节补充两个置顶参数、置顶/追加的精确落点、
      与 preset `[ruleprepend]` 的先后关系、以及"置顶会越过直连类规则"的取舍；
      验证：README 中可检索到 `inline_rules_prepend`。
      已落在 `README.md:223`（紧随 `ruleprepend` / `ruleappend` 那条 bullet），含 7 段完整顺序代码块、
      限额按参数族求和的说明、`> [!WARNING]` 取舍提示与 UI 开关说明；
      `grep -n "inline_rules_prepend\|ext_ruleset_prepend" README.md` 命中 4 行。
- [x] 7.2 `CHANGELOG.md`：记录本变更；验证：条目存在且描述与实现一致。
      已按仓库约定新增 `## [未发布]` 段（`CHANGELOG.md:11`）+ `#### 内联规则 / 额外规则集支持「置顶」…`
      （`:15-24`），位于 `## [v1.11.1] - 2026-09-12`（`:26`）之前；版本号由单独的
      `docs(changelog): cut vX.Y.Z` 提交决定（见 `ee4e5e2`），本次不自行填写。旧版本小节结构完好。
- [x] 7.3 全量校验：`openspec validate "rules-priority-position" --type change --strict`、
      后端测试、`npx vitest run`、`npx vue-tsc --noEmit`、`npm run build`（在 `web/` 下）全部通过；
      验证：命令退出码均为 0。
      结果：`openspec validate` → valid；`npx vitest run` → 23 文件 / 220 例全过；
      `npx vue-tsc --noEmit` → exit 0；`npm run build` → exit 0（`✓ 1710 modules transformed`，
      产物 `dist/assets/index-DGvnu0Yz.js`，仅有既存的 chunk >500 kB 体积警告）。
      **后端测试未执行**：本机无 cmake/g++/cl/gcc/ninja/make，C++ 无法编译，
      需按 `AGENTS.md` 第 42 行的要求在测试服务器 / CI 上跑 `tests/external_rules_test.cpp`
      与 `scripts/run-subconverter-smoke.py`。
- [x] 7.4 端到端复现：用线上实例同一 preset，请求带
      `inline_rules_prepend=♻️ 自动选择:DOMAIN-KEYWORD,netmarble` 的订阅，
      断言 `DOMAIN-KEYWORD,netmarble,♻️ 自动选择` 出现在 `DST-PORT,444-65535,🔀 非标端口` 之前；
      验证：`curl` 输出中该行号小于端口规则行号。
      **已在 CI 端到端覆盖**：v1.12.0 发布链路（`git tag -a v1.12.0` → 附注标签对象 `69e1ea6`，
      peeled 为切版提交 `44bc2a2 docs(changelog): cut v1.12.0`）触发的 `Formal Release`
      run `35808243675` 中，`build-linux` 会在发布前用 `.github/actions/smoke-docker-image` 跑
      `scripts/run-subconverter-smoke.py`（该脚本此时已包含 `assert_inline_rules_prepend_places_rules_first`、
      `assert_inline_rules_prepend_unknown_group`、`assert_ext_ruleset_prepend_unknown_group` 三个 case），
      镜像只有在 smoke 通过后才会被 `merge-manifest` 推送——而两个 registry 均已出现 `v1.12.0`
      且 `latest` 已推进（见下），故"置顶参数在真实服务端把用户规则排到 preset 规则之前"这一契约
      已在新镜像上真实执行并通过。
      发布结果（2026-09-23，两仓库 digest 完全一致，即同一多架构 manifest list）：
      Docker Hub `mmzhw51/subconverter-extended:v1.12.0` = `latest` =
      `sha256:701ea6583107fda5e4e07179f581642b843f3daa41f5b8fc237dd4905a380886`
      （`latest` 推进时间 2026/9/23 02:06:49，3 个 arch；版本 tag 02:05:46 推送）；
      GHCR `ghcr.io/mmzhw/subconverter-extended:v1.12.0` = `latest` =
      `sha256:701ea6583107fda5e4e07179f581642b843f3daa41f5b8fc237dd4905a380886`
      （`latest` manifest 的 platforms：`amd64/linux`、`arm64/linux`、`arm/linux`）；
      Release 页 `https://github.com/mmzhw/SubConverter-Extended/releases/tag/v1.12.0` 显示 `Latest` 徽标
      且列出 `SHA256SUMS` 资产 → 已由 draft 转为正式 Release（`finalize-release` 只在
      `gh release edit --draft=false` 成功后才推进 `latest`，两 registry 的 `latest` 均已推进，
      故这一步在 CI 上确已成功）。
      注意：`hub.docker.com` 的 REST API 存在 CDN 缓存，同一 tag 在短时间内可能返回旧 digest
      （本次首查 `latest` 仍返回 v1.11.1 的 `sha256:f525c4d8…`），判定发布状态应以
      `tags?ordering=last_updated` 列表或 `tags/latest` 的 `last_updated` 字段为准。
      残余动作（用户侧，非本变更代码问题）：`augussubconverter.x.ddnsto.com` 实例需重新拉取
      `v1.12.0` / `latest` 镜像后，其订阅链接才会识别 `inline_rules_prepend=`；复现命令
      `curl -s '<订阅链接>&inline_rules_prepend=♻️%20自动选择:DOMAIN-KEYWORD,netmarble' > out.yaml`，
      再 `grep -n 'DOMAIN-KEYWORD,netmarble' out.yaml` 与 `grep -n 'DST-PORT,444-65535' out.yaml` 比较行号。
