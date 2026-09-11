# Tasks: inline-rules

## 1. 后端 inline_rules 解析与校验

- [x] 1.1 在 `src/handler/interfaces.cpp` 新增 `parseInlineRules` 私有函数：trim → `;` split → 每段首个 `:` split group/rules → rules 部分 `|` split → trim 过滤空 → 输出 `vector<pair<group, vector<string>>>`. 验证：本地 build 通过 + 手工喂 `Domestic:DOMAIN-SUFFIX,foo.com|DOMAIN-KEYWORD,bar;Proxy:IP-CIDR,10.0.0.0/8` 输出与 spec 一致。
- [x] 1.2 在 `src/handler/interfaces.cpp` 新增 `applyInlineRules` 私有函数：复用 `parseExternalClashRules(..., require_target=false)` 校验每条规则；目标 group 必须在传入的 `valid_groups` 集合（由现有 `collectExternalGroupNames(extconf)` 产出）；逐条 `rule + "," + group` push 到 `policy.generator.rule_append`；任何校验失败返回双语 400 文案。验证：本地 build 通过。

## 2. 后端 inline_rules 主流程接入

- [x] 2.1 在 `subconverter` 主流程（`src/handler/interfaces.cpp`，紧跟现有 `ext_ruleset=` 处理段之后）增加 inline_rules 分支：调 `getUrlArg(argument, "inline_rules")` → 若非空，先做 target ∈ {clash, clashr} 校验 → 检查 `list=true` / `script=true` 互斥 → 计算总条数 ≤ `settings.max_allowed_rulesets` → 调 `applyInlineRules`。错误路径返回 400 + 双语文案（与 ext_ruleset 文案一致风格）。验证：编译通过 + `grep -n inline_rules src/handler/interfaces.cpp` 命中。
- [x] 2.2 错误文案覆盖：缺值 / type 不合法 / MATCH / FINAL / 空 value / 未知 group / 超额 / 错误 target / list=true / script=true。验证：人工 case-by-case 走查错误码与文案。

## 3. 后端 smoke 测试

- [x] 3.1 `scripts/run-subconverter-smoke.py` 新增 `assert_inline_rules_valid`：合法 fixture + `inline_rules=Proxy:DOMAIN-SUFFIX,foo.com|DOMAIN-KEYWORD,bar;Direct:DOMAIN-SUFFIX,lan.internal` → 200，响应 YAML 含 `DOMAIN-SUFFIX,foo.com,Proxy`、`DOMAIN-KEYWORD,bar,Proxy`、`DOMAIN-SUFFIX,lan.internal,Direct` 三条；挂入 `run_checks`。验证：smoke 跑通。
- [x] 3.2 新增 `assert_inline_rules_unknown_group`：`inline_rules=NotARealGroup:DOMAIN-SUFFIX,foo.com` → 400；新增 `assert_inline_rules_unknown_type`：`inline_rules=Proxy:BOGUS,x` → 400；新增 `assert_inline_rules_match_forbidden`：`inline_rules=Proxy:MATCH,DIRECT` → 400；新增 `assert_inline_rules_with_list_true` → 400；新增 `assert_inline_rules_wrong_target`：target=surge → 400；新增 `assert_inline_rules_exceeds_quota`：65 条 → 400；挂入 `run_checks`。验证：smoke 全绿。
- [x] 3.3 新增 `assert_inline_rules_coexists_with_ext_ruleset`：`ext_ruleset=Proxy,<success_url>` + `inline_rules=Domestic:DOMAIN-SUFFIX,foo.com` → 200，响应含两边的规则（ext 在前、inline 在后）。验证：smoke 跑通。

## 4. 前端行 ↔ 字符串纯函数

- [x] 4.1 新建 `web/src/lib/inline-rules.ts`：`InlineRuleRow`、`parseInlineRuleRows`、`serializeInlineRuleRows`（按 D2 语义：trim、`;`/`:`/`|` 切分、空过滤、`#` 注释忽略）；新建 `web/src/lib/inline-rules.test.ts` 覆盖多行互转、空行过滤、`#` 注释忽略、缺字段行忽略、round-trip、`|`/`;` 边界。验证：`npx vitest run inline-rules` 全绿。
- [x] 4.2 `web/src/lib/url-builder.ts`：把 `inline_rules` 加入参数表（非空时 emit），复用 `URLSearchParams`；`web/src/lib/url-parser.ts`：把 `inline_rules` 加入 `knownOptionKeys`，从 query 反向回填。验证：`npx vitest run url-builder url-parser` 全绿 + `npx vitest run inline-rules` round-trip case 命中。

## 5. 前端 OptionDef + 行式控件

- [x] 5.1 `web/src/config/options.ts` 新增 `inline_rules` OptionDef：`type: 'string'`、`group: 'rule'`、label/description 中英文、`placeholder` 给一行示例；新增 `web/src/lib/inline-rules.ts` 导出 `MATCH_TYPE_OPTIONS`（9 项，不含 MATCH/FINAL）；新增 `MATCH_TYPE_PLACEHOLDERS`（按 match type 给 placeholder）。验证：`npx tsc --noEmit` 通过。
- [x] 5.2 新建 `web/src/components/InlineRulesControl.vue`：props `{modelValue, configUrl, backendBase}`，emit `update:modelValue`；内部 `rows` 派生 + watch 外部 modelValue 变化（导入回填）；每行 = match type `el-select`（filterable，preset 9 项）+ value `el-input`（placeholder 按 match type 切换）+ group `el-select`（filterable + allow-create + loading，复用 `useGroupNames`）+ 删除按钮（行数 > 1 时删；= 1 时清空）；底部"＋ 添加规则"；configUrl 为空时引导提示 + fallback 组；组名加载失败行内提示。验证：`npm run build` 通过。
- [x] 5.3 `web/src/components/ConfigForm.vue` 新增 `<InlineRulesControl>` 渲染分支：复用 ExtraRulesetsControl 旁的 OptionDef 渲染模式（`def.type === 'string' && def.key === 'inline_rules'`），传入 `optionValue('config')` 与 `form.state.backendBase`。验证：`npm run build` 通过 + 手工 dev 走查：填两行 → 生成 URL → 回填 → 行内容一致。

## 6. i18n / 描述文案

- [x] 6.1 更新 `web/src/i18n/locales/zh-CN.ts` 与 `en.ts`：新增 `form.inlineRules` label + description 文案，与 `extRulesets` 区分明确；新增控件内提示（"组名加载失败，可手动输入"等，沿用 ExtraRulesetsControl 已有 i18n 键或新增）。验证：`npx tsc --noEmit` 通过。

## 7. 文档与验收

- [x] 7.1 README "额外规则集" 章节后补"内联规则"小节：示例（输 DOMAIN-SUFFIX → 选 Proxy）、与 ext_ruleset 的差异、wire format 一句话、`max_allowed_rulesets` 限额提示。验证：`grep -n "inline_rules" README.md` 命中。
- [x] 7.2 端到端验收：测试服务器容器重建后 → `/sub?target=clash&config=<preset>&inline_rules=...` 200 且 YAML 含正确规则；前端 dev 走查两组控件并存；既有 smoke 全量通过。验证：smoke exit 0。
  - 实际结果：服务器 sce-test 重建后 10/10 inline_rules smoke case 通过；整 smoke 套件 `smoke checks passed`；手测 `inline_rules=Domestic:DOMAIN-SUFFIX,foo.com|DOMAIN-KEYWORD,bar;Proxy:IP-CIDR,10.0.0.0/8` 在响应 rules: 节下严格按提交顺序生成三条。
- [x] 7.3 OpenSpec change 归档（按项目 archive 流程）。
