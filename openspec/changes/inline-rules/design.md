## Context

- `ext_ruleset=`（`src/handler/interfaces.cpp` 行 4279–4302）已经把
  "URL 拉规则 → 解析 → `,Group` → `rule_append`" 的合并路径走通了。
- 用户痛点：要发"把 `foo.com` 走 Domestic"，必须自建并托管一份 ini。
- 前端已有 `useGroupNames(configUrl)`（`smart-ext-rulesets` 落地的
  `/getgroupnames` 接口）可直接复用。
- 后端 `parseExternalClashRules`（`src/generator/config/external_rules.cpp`）
  现成的规则类型 + `require_target=false` 校验语义，**已拒绝 MATCH/FINAL**
  （行 133–136）。

## Goals / Non-Goals

**Goals:**

- 新 URL 参数 `inline_rules=`，把 UI 行式控件的规则直接喂进同一 `rule_append`
  落点，不动 ext_ruleset、不动 fetchExternalRuleSources。
- 行 ↔ 字符串互转放纯函数（`web/src/lib/inline-rules.ts`），状态模型独立于
  `ext_ruleset` 的字符串表示。
- 校验与 ext_ruleset 对齐：group 名走 `collectExternalGroupNames`，
  规则行走 `parseExternalClashRules(require_target=false)`，
  配额走 `settings.max_allowed_rulesets`，
  target 与 list/script 互斥语义对齐。

**Non-Goals:**

- 不做规则源"超市"、不做后端托管（避开任何持久化）。
- 不合并到现有 `ext_ruleset=` UI（保持两套独立控件，并排）。
- 不实现按规则模式自动 placeholder 之外的进一步提示（如 GEOIP 国家代码补全），
  placeholder 列表已覆盖常见模式。

## Decisions

### D1: 新 URL 参数 `inline_rules=`，不复用 `ext_ruleset=`

**选这个而非"塞 data: URL 进 ext_ruleset"**：

- `fetchExternalRuleSources` 当前强制 `http://` / `https://`，要放开就要改
  HTTP-only 校验、还要小心 `data:` URL 的 base64 膨胀（≈2.3×）。
- `ext_ruleset=` 语义是"远程规则源"，内联规则是另一种东西，混用会让
  `ext_ruleset=` 的文档/校验/缓存语义更乱。
- 新参数 0 改动到现有代码路径，只在主流程并行加一段：
  ```cpp
  // 与 ext_ruleset= 共用 rule_append 落点；顺序：先 ext_ruleset，再 inline_rules
  std::string inline_error = applyInlineRules(argument, settings, ext_ruleset_valid_groups, policy, response);
  if (!inline_error.empty()) return inline_error;
  ```

### D2: Wire format `Group:TYPE,value|TYPE,value;Group2:...`

- `;` 分组分隔（与 ext_ruleset 一致；URL 安全）。
- `:` 区分组头与规则列表（避开 `,` 与规则自身的 `TYPE,value` 冲突）。
- `|` 分同组内多条规则（避开 `,` 与规则自身冲突；URL 安全）。
- 解析规则：trim 后 `;` split；每段首个 `:` split（首段是 group，剩余
  整段作 rules）；rules 部分 `|` split；每条 trim 后非空且形如
  `TYPE,value`。
- 序列化：每行 `group:rules-joined-by-|`，多组用 `;` 串；过滤 group 与
  value 都为空的行。

### D3: 校验复用 `parseExternalClashRules(require_target=false)`

每条 inline rule 单独喂进 `parseExternalClashRules`：

- 命中非空行 → 接受；命中注释/空 → 跳过；
- 校验失败（type 不在 `ClashRuleTypes` / MATCH 或 FINAL / 缺 value）
  → 整体 400 + 双语错误（与 ext_ruleset 同形式）。

**注意 MATCH/FINAL**：因为 `parseExternalClashRules` 显式拒绝这两种
terminal rule（external_rules.cpp 行 133–136），所以 inline_rules 也
跟着拒——前端下拉里**不放 MATCH/FINAL**。

### D4: 行 ↔ 字符串互转纯函数 `web/src/lib/inline-rules.ts`

```ts
export interface InlineRuleRow { type: string; value: string; group: string }
export function parseInlineRuleRows(value: string): InlineRuleRow[]
export function serializeInlineRuleRows(rows: InlineRuleRow[]): string
```

- 与 `ext-rulesets.ts` 同结构（`{group,url}` vs `{type,value,group}`）。
- 内部多回空格 trim、忽略空行、`#` 注释忽略、round-trip 等价。
- `url-builder.ts` 与 `url-parser.ts` 把 `inline_rules` 加入参数表（独立于
  `ext_ruleset`）。

### D5: 组件 `InlineRulesControl.vue`

- Props：`modelValue: string`、`configUrl: string`、`backendBase: string`。
- 内部：`rows = ref(parseInlineRuleRows(modelValue))`，`watch modelValue`
  外部变化（导入链接回填）→ 重新解析（同 ExtraRulesetsControl 套路）。
- 每行布局：
  - match type `el-select`（filterable；preset 9 项；MATCH/FINAL 不放）；
    placeholder 随类型切换。
  - value `el-input`，placeholder 按 match type 给（DOMAIN-SUFFIX→
    `example.com`、GEOIP→`CN`、IP-CIDR→`192.168.0.0/16`、DOMAIN-KEYWORD→
    `keyword` 等）。
  - group `el-select`（filterable + allow-create + loading），
    复用 `useGroupNames(configUrl)`。
  - 删除按钮（行数 > 1 时删除该行；行数 = 1 时清空该行）。
- "＋ 添加规则"按钮 append 空行；空行序列化时过滤。
- 三字段全填的行才计入 emit（与后端 parse 行为一致：缺 type/value/group
  的行进不到规则列表）。

### D6: 与 `ext_ruleset=` 在 UI 里并排，不合并

- "规则"分组下两个独立 OptionDef：`ext_ruleset`（已有）、`inline_rules`（新增）。
- 用户按需选用其一、混用、都不填。

### D7: 限额与互斥语义对齐 ext_ruleset

- 仅 `target ∈ {clash, clashr}` 生效。
- 拒绝 `list=true` / `script=true`。
- 总条数 ≤ `settings.max_allowed_rulesets`（沿用现有上限，默认 64）。
- 与 `ext_ruleset=` 共存 → `rule_append` 先 ext_ruleset 后 inline_rules，
  顺序即参数顺序；任一参数错误都立即 400（fail-fast）。

## Risks / Trade-offs

- [URL 长度膨胀] 单条规则约 25 字节，64 条 ≈ 1.6KB，再加上 base/preset
  query；通常远低于 nginx/反代 8KB 上限。**Mitigation**：复用
  `max_allowed_rulesets` 上限（默认 64）。
- [复用 `parseExternalClashRules` 可能引入与 ext_ruleset 不一致的错误文案]
  → 接受：用户看到的格式已经一致（来自同一函数）。
- [MATCH/FINAL 不支持] 是 `parseExternalClashRules` 的固有约束，前端
  下拉不放这两个，避免用户填完才发现后端拒绝。
- [URL 解析边界] 用户在 value 里写 `;` 或 `|` 会被切错。**Mitigation**：
  当前 `parseExternalClashRules` 用 `splitTopLevelCommas` 已经处理括号
  /引号转义；UI 端文档提示「value 中避免 `|` 与 `;`」即可。

## Migration Plan

- 无破坏性变更：`inline_rules` 是新增参数，旧请求不受影响。
- 后端：本地 build 跑通 + `scripts/run-subconverter-smoke.py` 全量绿。
- 前端：`npx vitest run` 全量绿 + `npm run build` 通过。
- 镜像：`pnpm run build:web` 后 nginx 清单无需新增路径（GET `/sub?inline_rules=`）。
- README 补一段"内联规则 vs 额外规则集"说明。

## Open Questions

<!-- 无 -->
