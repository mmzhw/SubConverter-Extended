# Tasks: smart-ext-rulesets

## 1. 后端 `/getgroupnames` 接口

- [ ] 1.1 在 `src/handler/interfaces.cpp` 新增 `std::string getGroupNames(RESPONSE_CALLBACK_ARGS)`：校验 `config` 参数 → 复用 config 拉取（PublicRequest 上下文、代理策略、GitHub 代理前缀）→ 解析 `ExternalConfig` → `collectExternalGroupNames` → 排序 → 写 JSON `{"groups":[...]}`；错误路径返回 400 + 双语文案（config 缺失 / 拉取失败 / 解析失败）；验证：编译通过
- [ ] 1.2 在 `src/handler/interfaces.h` 声明 `getGroupNames`；在 `src/server` 路由注册表登记 `/getgroupnames`（与 `/getruleset` 同方式）；验证：`grep -n getgroupnames src/server/ src/handler/interfaces.h` 均有登记
- [ ] 1.3 `docker/nginx/subconverter-paths.txt` 补 `getgroupnames`；验证：`grep -n getgroupnames docker/nginx/subconverter-paths.txt` 命中

## 2. 后端 smoke 测试

- [ ] 2.1 `scripts/run-subconverter-smoke.py` 新增 `assert_getgroupnames_ok`：fixture config（`data:` URI，含 `custom_proxy_group=MyGroup`）→ 200、JSON 含 `Direct`/`GLOBAL`/`MyGroup`/`Proxy`/`REJECT`、字母序、无重复；新增 `assert_getgroupnames_bad_url`：`https://nonexistent-host-1234567890.invalid/x.ini` → 400；挂入 `run_checks`；验证：服务器容器上 smoke 通过

## 3. 前端行 ↔ 字符串纯函数

- [ ] 3.1 新建 `web/src/lib/ext-rulesets.ts`：`ExtRulesetRow`、`parseExtRulesetRows`、`serializeExtRulesetRows`（语义见 spec）；新建 `web/src/lib/ext-rulesets.test.ts` 覆盖多行互转、空行过滤、`#` 注释忽略、无 `,` 条目忽略、round-trip；验证：`npx vitest run ext-rulesets`
- [ ] 3.2 `web/src/lib/url-parser.ts` 的 `ext_ruleset` 反向解析改用 `parseExtRulesetRows` + `\n` join（行为等价，删重复逻辑）；验证：既有 `url-parser.test.ts` 全绿

## 4. 前端组名加载 composable

- [ ] 4.1 新建 `web/src/composables/useGroupNames.ts`：空 configUrl → fallback 组不发请求；300ms 防抖；按 configUrl 内存 Map 缓存；暴露 `{groups, loading, error}`；失败保留上次值；新建 `web/src/composables/useGroupNames.test.ts`（mock fetch）覆盖：空 config、防抖合并、缓存命中只请求一次、失败置 error；验证：`npx vitest run useGroupNames`

## 5. 前端行式控件

- [ ] 5.1 新建 `web/src/components/ExtraRulesetsControl.vue`：props `{modelValue, configUrl, backendBase}`，emit `update:modelValue`；内部 rows 派生 + watch 外部变化；每行 = 组名 `el-select`（`filterable` + `allow-create` + loading）+ URL `el-input` + 删除按钮（单行清空、多行删除）；"＋ 添加规则"；configUrl 为空时引导提示 + fallback 组；加载失败行内提示；验证：`npm run build` 通过
- [ ] 5.2 `web/src/components/ConfigForm.vue`：`ext_ruleset` 字段渲染分支替换为 `<ExtraRulesetsControl>`（传入 `optionValue('config')` 与 backendBase）；验证：dev server 手工走查——选 Aethersailor 预设 → 组名自动加载 → 加两行 → 生成 URL 与 textarea 时代等价
- [ ] 5.3 `web/src/config/options.ts` 的 `ext_ruleset` 描述文案更新（行式控件语义）；验证：`npx tsc --noEmit`

## 6. 文档与验收

- [ ] 6.1 README "额外规则集" 更新：行式控件行为 + `/getgroupnames` 一句话；验证：grep 命中
- [ ] 6.2 端到端验收（测试服务器容器重建后）：`/getgroupnames` 200 JSON；前端行式控件加载组名；生成订阅 URL 含正确 `ext_ruleset=`；既有 smoke 全量通过；验证：smoke exit 0
- [ ] 6.3 OpenSpec change 归档（按项目 archive 流程）