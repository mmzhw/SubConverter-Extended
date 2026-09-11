# Tasks: preset-with-custom-rulesets

## 1. 后端 URL 参数解析

- [ ] 1.1 在 `src/parser/subparser.h` 的 `ParsedSubRequest` struct 中新增 `std::vector<std::pair<std::string,std::string>> ext_rulesets` 字段（含头文件依赖 `<utility>` `<vector>`），保持其它字段顺序不变；验证：编译通过、其它 struct 字段引用无破坏
- [ ] 1.2 在 `src/parser/subparser.cpp` 新增 `parseExtRuleset(const std::string& raw)` helper：split(';') → 每条按首个 ',' 拆 → URL decode → trim → 写入 `parsed.ext_rulesets`；空字符串 / 注释行 / 空白行忽略；验证：vitest-equivalent 的 C++ unit test 或通过 smoke 脚本 round-trip 覆盖 `%2C` 解码、空行、注释、空白

## 2. 后端校验与合并

- [ ] 2.1 在 `src/handler/interfaces.cpp` 新增 `static std::set<std::string> collectExternalGroupNames(const ExternalConfig& extconf)`：从 `extconf.custom_proxy_group` 解析的 group 名 + 模板内置 fallback 组（`Proxy` / `Direct` / `REJECT` / `GLOBAL`）合并去重；验证：fixture 包含至少 1 个 `custom_proxy_group` 时输出包含该 group + 全部 4 个 fallback；不重复；大小写敏感
- [ ] 2.2 在 `buildExternalConfigFetchPlan`（`src/handler/interfaces.cpp`）现有 `fetchExternalRuleSources` 调用附近新增 `ext_ruleset` 处理段：①遍历 `parsed.ext_rulesets` 校验 group ∈ `valid_groups`；②复用 `fetchExternalRuleSources` 逐条抓取（atomic 失败语义）；③把 `destination` 追加到 `base_rule["rules` 末尾；验证：smoke 覆盖合法组合 / 未知组 / 抓取失败 / target 非 clash 四类 case
- [ ] 2.3 在 `ext_ruleset` 校验段前置加入目标 / 配额限制：①`parsed.target != "clash"` → 400；②`parsed.generate_node_list.get(false)` → 400；③`parsed.script.get(false)` → 400；④`parsed.ext_rulesets.size() > settings.maxAllowedRulesets` → 400；错误文案与 `ruleprepend` / `ruleappend` 对齐（"Invalid request: ext_ruleset ..." 中英文）；验证：smoke 覆盖四类 400 case

## 3. 前端 OptionDef 扩展

- [ ] 3.1 在 `web/src/config/options.ts` 的 `OptionDef` interface 增加 `multiline?: boolean` 字段；验证：`tsc --noEmit` 通过、其它选项不受影响
- [ ] 3.2 在同一文件的 `OPTION_DEFS` 数组中 `Remote config` 条目之后插入 `ext_ruleset` 条目（`type: 'string'`、`multiline: true`、`group: 'rule'`、默认空字符串、placeholder 按 i18n）；验证：vitest 断言 `OPTION_DEFS` 含该 key 且字段齐全
- [ ] 3.3 在 `web/src/i18n/locales/zh-CN.ts` 与 `en.ts` 补 `form.options.ext_ruleset.label` / `description` / `placeholder` 文案（与现有 OptionDef 其它字段模式一致）；验证：i18n 文件结构通过现有 i18n 测试

## 4. 前端控件渲染

- [ ] 4.1 在 `web/src/components/ConfigForm.vue` 现有 `def.type === 'string'` 渲染分支按 `def.multiline` 切换 `el-input` 的 `type` 与 `rows`（multiline 时 `type="textarea" :rows="5"`）；验证：dev server 中"额外规则集"显示为 5 行 textarea、其它 string 字段保持单行

## 5. 前端 URL 拼装与解析

- [ ] 5.1 在 `web/src/composables/useGenerateSubscription.ts` 的 `buildSubUrl` 函数中新增 `ext_ruleset` 拼装分支：读取 `form.state.extRulesets`（trim）、split('\n') → 过滤空行 / `#` 注释 → `join(';')` → `params.set('ext_ruleset', value)`；验证：vitest 覆盖空值、多行、注释、单行、含空格
- [ ] 5.2 在 `web/src/composables/useFormState.ts` 的 `parseSubUrl` 函数中新增 `ext_ruleset` 反向解析：从 URL query 取 `ext_ruleset` → split(';') → 每条按首个 ',' split → 写回 `form.state.extRulesets`（用 `\n` join）；验证：vitest round-trip + 含 `%2C` 解码（`URLSearchParams` 自动）

## 6. 测试

- [ ] 6.1 `web/src/composables/useGenerateSubscription.test.ts` 新增 `ext_ruleset` 多行 round-trip case：①多行 + 空行 + 注释 → 期望输出拼接正确；②build → parse → build round-trip 等价
- [ ] 6.2 `web/src/composables/useFormState.test.ts` 新增对应 `parseSubUrl` 含 `ext_ruleset=` 反向解析 case
- [ ] 6.3 `scripts/run-subconverter-smoke.py` 新增 4 类 case：合法组合、未知组、抓取失败、target 非 clash；验证：脚本通过、所有 case 退出码符合预期
- [ ] 6.4 端到端手测：用真实 Aethersailor preset + 自托管 1–2 条 `https://` 规则 URL 走通 `npm run dev` + 后端本地实例，确认生成 YAML 末尾追加了用户规则

## 7. 文档

- [ ] 7.1 README「规则和外部配置还支持」段（在 README.md 大约第 213 行附近）新增 `ext_ruleset=` 子项：URL 语法示例、合法组名约束、与 `ruleprepend` / `ruleappend` 差异、错误信息解读（指向 spec 中的"未知组" / "抓取失败"两种典型错误）；验证：grep 确认新增段落存在且锚点正确
- [ ] 7.2 i18n 文案同步 README 文档中 `ext_ruleset=` 的英文说明（如 README 含双语段）

## 8. 整体验收

- [ ] 8.1 后端编译通过：`cmake --build build` 无新增 warning
- [ ] 8.2 前端 `npm run build` + `npm run test:unit` 通过；i18n 无遗漏 key
- [ ] 8.3 spec 场景整体走查：spec.md 中 8 类 Scenario 逐项对照实现逐项通过
- [ ] 8.4 与现有 `ruleprepend` / `ruleappend` 不冲突：smoke 同时含两者的 case 输出规则顺序符合"prepend 在前 / append 在后 / ext_ruleset 在末尾"