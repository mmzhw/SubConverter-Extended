## Why

用户自定义规则目前只有"追加"一种落点（`rule_append`），在最终 Clash `rules:` 里位于所有
preset 规则之后、兜底 `MATCH` 之前。而 Clash 是**首次匹配即停**，所以当 preset 里存在
更早命中的通用规则时，用户规则就是死代码。

线上实例已复现（`/s?id=bUSkNwzQ` 的 200 响应，4313 行）：用户写了
`DOMAIN-KEYWORD,netmarble,♻️ 自动选择`（第 4300 行），但 preset 的
`DST-PORT,444-65535,🔀 非标端口`（第 4299 行）先把 `...:41004` 这个非标端口截走了——
域名规则写得完全正确，却永远轮不到执行。用户只能靠"自建规则文件挂 preset 的
`[ruleprepend]`"绕路，而这正是 `inline-rules` 当初要消灭的四步流程。

用户诉求（m00134）：**"我自定义的规则应该在最前面，或者加个开关控制放最前面还是最后面？"**

## What Changes

- **后端新增 2 个 URL 参数**（线格式与各自的原参数**逐字节相同**）：
  - `inline_rules_prepend=` —— 内联规则置顶
  - `ext_ruleset_prepend=` —— 额外规则集置顶
  两者解析、组名校验（`collectExternalGroupNames`）、规则校验
  （`parseExternalClashRules`）、target/list/script gating、`max_allowed_rulesets` 限额
  全部复用现有逻辑，**只在落点上分叉**。
- **后端新增第 7 个合并槽位** `ExtConfig::rule_user_prepend`（"用户前置"），
  `mergeClashRules` 顺序变为：
  `rule_user_prepend → rule_prepend（preset 的）→ original 非终结 → generated → rule_append → 原始终结 → 生成终结`。
  即"置顶"= 排在 **preset 的 `[ruleprepend]` 之前**，是真正的最高优先级；
  用户自己的前置贡献之间保持既有相对顺序（`ext_ruleset_prepend` 先、`inline_rules_prepend` 后），
  与 append 侧一致。
- **前端两个控件各加一个"落点"开关**（`InlineRulesControl.vue` + `ExtraRulesetsControl.vue`）：
  「置顶（最高优先级）」/「末尾（默认）」二选一，切换时把值搬到对应参数。
  组名下拉、行/文本双模式、半填行过滤等既有行为一律不变。
- **URL round-trip**：`buildSubUrl` 按落点写出对应参数；`parseSubUrl` 反向还原落点（读到
  `*_prepend` 即置顶）。**未显式设置落点的旧链接行为完全不变**（仍为追加），因此非 BREAKING。
- **not-fixed / 已知取舍**：置顶意味着用户规则会排在 preset 的"内网直连 / 私有地址直连 /
  `DST-PORT,7844` 直连"之前——这是置顶语义的必然结果（要赢过通用端口规则就必须更靠前），
  UI 必须显著提示，README 同步说明。
- **文档 + 测试**：README 两个控件章节补"落点"说明；后端单元测试（`tests/external_rules_test.cpp`）
  覆盖新槽位顺序；smoke（`scripts/run-subconverter-smoke.py`）覆盖置顶参数的正反路径；
  前端 vitest 覆盖落点 round-trip 与两控件渲染。

## Capabilities

### New Capabilities

- `rule-priority-position`: 让用户自定义规则（内联规则 / 额外规则集）可以在"置顶（最高优先级）"
  与"末尾（默认）"之间选择落点。定义两个新 URL 参数 `inline_rules_prepend=` /
  `ext_ruleset_prepend=`、新的合并槽位语义、以及前端"落点"开关的往返行为。

### Modified Capabilities

- `inline-rules`: 新增"落点选择"要求——`inline_rules_prepend=` 参数、置顶时的合并位置，
  以及 `InlineRulesControl` 的落点开关与 URL round-trip。
- `preset-with-custom-rulesets`: 新增 `ext_ruleset_prepend=` 参数与置顶语义；同时修正现有
  "追加到 `rules` 段末尾"的表述——实际落点是"generated 之后、兜底 `MATCH` 之前"，本 change
  把两种落点的精确位置写进 spec。

## Impact

- 后端：`src/generator/config/external_rules.cpp` / `.h`（`mergeClashRules` 增槽位）、
  `src/generator/config/subexport.h`（`ExtConfig::rule_user_prepend`）、
  `src/generator/config/subexport.cpp:2079-2097`（把新槽位传入 merge）、
  `src/handler/interfaces.cpp`（新参数解析 + 校验 + 落点分叉，紧邻现有
  ext_ruleset/inline_rules 分支）。
- 前端：`web/src/config/options.ts`、`web/src/components/ConfigForm.vue`、
  `web/src/components/InlineRulesControl.vue`、`web/src/components/ExtraRulesetsControl.vue`、
  `web/src/lib/url-builder.ts`、`web/src/lib/url-parser.ts`、新增共享落点工具模块、
  `web/src/i18n/locales/{zh-CN,en}.ts`。
- 测试/文档：`tests/external_rules_test.cpp`、`scripts/run-subconverter-smoke.py`、
  `web/src/lib/*.test.ts`、`web/src/components/*`、README、`CHANGELOG.md`。
- 不改 `parseInlineRules` / `parseExtRuleset` 线格式，不改 `useGroupNames`，
  不改 `/getgroupnames`，不动短链存储格式（`editable-short-links` 路径自动跟随，
  因为短链保存的是整条 URL 的查询参数）。不引入新依赖。
