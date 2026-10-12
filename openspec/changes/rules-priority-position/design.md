## Context

见 `proposal.md` - Why。实现相关的现状约束（均已核对到行号）：

- 合并顺序由 `src/generator/config/external_rules.cpp:272-295` 的
  `mergeClashRules(prepend, original, generated, append)` 决定，调用点两处：
  - Clash 主路径 `src/generator/config/subexport.cpp:2079-2097`（lambda `merge_external_rules`）
  - Stash 路径 `src/generator/config/subexport.cpp:3710-3725`
- 用户贡献当前全部进 `ExtConfig::rule_append`（`src/generator/config/subexport.h:123`）：
  ext_ruleset 在 `src/handler/interfaces.cpp:4386-4388`，内联规则在
  `src/handler/interfaces.cpp:4474-4478`。
- `rule_prepend` / `rule_append` 只由远程配置 ini 的 `[ruleprepend]` / `[ruleappend]`
  填充（`src/handler/interfaces.cpp:4117-4118` → `src/handler/settings.cpp:2283-2284`），
  URL 参数无法注入；UI 也没暴露（`web/src/config/options.ts` 只有 `config` / `ext_ruleset` /
  `inline_rules` 三个规则项）。
- 上线实例的实测规则表（用户订阅 `/s?id=bUSkNwzQ`）：preset 的 `[ruleprepend]` 贡献位于
  `rules:` 首段（`GEOSITE,private` / `GEOIP,private` / `DST-PORT,7844` / `SRC-PORT,41641` /
  若干 `IP-CIDR`），用户内联规则在末尾（第 4300-4312 行），其间是 preset generated 规则，
  第 4297-4299 行的 `DST-PORT,1-79|81-442|444-65535,🔀 非标端口` 抢先命中非标端口。

## Goals / Non-Goals

**Goals**

- 用户规则可选落点，且"置顶"是一个**可解释、可断言的位置**：整张规则表的第一条，
  早于 preset 的 `[ruleprepend]`。
- 新旧链接语义完全兼容：不出现 `_prepend` 参数时输出逐字节不变。
- 复用既有解析 / 校验 / 限额代码，落点是唯一分叉点。

**Non-Goals**

- 不做"插到 preset 某条规则之间/某个 ruleset 之前"的任意锚点定位。
- 不做规则去重、冲突检测或排序优化。
- 不改 `inline_rules=` / `ext_ruleset=` 的线格式，不改 `/getgroupnames`，不改短链存储格式。
- 不动非 Clash/clashr 目标的规则生成（Stash 的 `rule_user_prepend` 永远为空，见 Decisions 3）。

## Decisions

### 1. 新增第 7 个合并槽位，而不是复用 `rule_prepend`

`ExtConfig` 新增 `string_array rule_user_prepend;`，`mergeClashRules` 变为 5 参数：

```cpp
string_array mergeClashRules(const string_array &user_prepend,
                             const string_array &prepend,
                             const string_array &original,
                             const string_array &generated,
                             const string_array &append);
```

顺序：`user_prepend → prepend → original(非终结) → generated → append → original(终结) → generated(终结)`。

- **为什么**：`rule_prepend` 是"远程配置作者声明的前置规则"（内网直连、`DST-PORT,7844` 等
  系统级豁免）。把用户规则直接插进去，会让两个来源在同一数组里无法区分，未来想加
  "用户前置的可见性/统计"或二次校验时无从下手；而独立槽位让"用户前置"成为一个可测试的具名位置。
- **备选被否**：复用 `rule_prepend` 并在组装阶段把用户规则 unshift 进去——最省事，但槽位语义混同，
  且 `subexport.cpp` 两处调用点都得各自处理顺序，反而更容易漏。
- 兼容性：`user_prepend` 为空时输出与旧行为逐字节一致（由单元测试锁死）。

### 2. 两个独立 URL 参数，而不是"落点开关参数"

新增 `inline_rules_prepend=` 与 `ext_ruleset_prepend=`，线格式各自与原参数相同。

- **为什么**：解析、组名校验、单条规则校验、target/list/script gating、限额全部可以复用现有
  代码路径，只在 `push_back` 的目标数组上分叉；不需要在解析器里传递"落点"状态。
  且每个控件可独立选落点（用户可能想让域名规则置顶、但让规则集追加）。
- **备选被否**：`rules_position=prepend` 单一开关——一个值同时作用于两个控件，无法表达
  "内联置顶 + 规则集追加"；且会污染所有链接（老链接缺该参数时的默认值语义要额外定义）。
- **备选被否**：在参数值里加前缀（如 `inline_rules=!prepend!...`）——破坏既有值语法，
  且 `!` 需转义，得不偿失。

### 3. Stash 路径保持"用户前置永远为空"

`addStashRules` 里 `mergeClashRulesWithinLimit` 的第一个实参传 `{}`；其守卫条件改为
`!user_prepend.empty() || !prepend.empty() || !append.empty()`。

- **为什么**：`inline_rules` 与 `ext_ruleset` 都 gating 在 `target=clash`/`clashr`
  （`src/handler/interfaces.cpp:4398-4402`、`4306-4311`），Stash 请求不可能有用户前置规则；
  传 `{}` 是"显式表达这个槽位在此路径为空"，同时守卫条件扩展避免未来有人给 Stash 打开该参数时
  出现"有规则但守卫不触发、规则被静默丢弃"的隐患。

### 4. 前端用共享工具模块 + 影子状态承载落点

新增 `web/src/lib/rule-target.ts`，导出两个纯函数：

```ts
export type RulePlacement = 'prepend' | 'append';
export function ruleParamFor(key: string, placement: RulePlacement): string;
export function placementOf(params: URLSearchParams, key: string): RulePlacement;
```

- 表单状态里落点存为 `options[`${key}_mode`]`（`'prepend' | 'append'`，缺省 `append`）。
- `buildSubUrl` 主循环遇到 `inline_rules` / `ext_ruleset`（以及它们的 `_prepend` 变体）时，
  按 `${key}_mode` 选择参数名写出；`${key}_mode` 自身 MUST NOT 被写进 URL。
- `parseSubUrl` 对 `def.key` 及其 `${key}_prepend` 都归一到 `options[key]`，并按读到的是哪个
  参数写入 `${key}_mode`；两者同时存在时以 `_prepend` 为准，同时保留 `append` 侧的值到
  `unknown`（不静默丢弃用户输入）。
- **为什么**：`options` 的类型是 `Record<string, string|number|boolean|undefined>`，
  加影子键不需要改 `FormState` 结构，也不需要新增 OptionDef（落点不是后端参数，
  不该出现在 `OPTION_DEFS` 里被渲染成独立字段）。两个控件共用同一模块，避免各写一套。

### 5. 限额按参数族求和

`inline_rules` + `inline_rules_prepend` 的条数之和、`ext_ruleset` + `ext_ruleset_prepend`
的来源条数之和分别与 `settings.maxAllowedRulesets` 比较。

- **为什么**：限额的目的是限制"单次请求的额外工作量"，落点不改变工作量；
  分别计数会让上限实际翻倍，产生新的滥用面。

## Risks / Trade-offs

- [用户在 UI 里同时填了两个落点的同一控件，或手改 URL 造成两参数并存] → 后端两者都处理
  （都生效、顺序固定），前端导入时以 `_prepend` 为准并保住 `prepend` 落点，另一侧值留在
  `unknown` 里不丢；这是明确定义的行为而非错误。
- [置顶会让用户规则越过 preset 的内网直连 / 私有地址豁免规则，可能把本该直连的流量送进代理] →
  这是置顶语义的必然取舍；UI 在选中"置顶"时显示提示，README 与 spec 明确记录该取舍。
- [用户把 `MATCH` 写进置顶参数，会把整张规则表截断] → 校验层复用 `parseExternalClashRules`
  的终结规则拒绝逻辑（`MATCH`/`FINAL` → 400），并在 spec 场景里锁死。
- [`rule_user_prepend` 加入后忘记扩展 Stash 守卫条件 → 规则静默丢失] → 守卫条件与调用点
  一起改，并由"未使用置顶时顺序不变"的回归断言兜住。
- [老链接被意外改写] → 前端只在用户显式切换落点时才用 `_prepend` 参数；后端不设置该参数时
  行为不变；前端测试断言"默认落点生成的链接不含 `_prepend`"。

## Migration Plan

- 纯增量：无数据迁移，无存储格式变化，无配置项变化。
- 部署顺序无约束（前端与后端各自向后兼容：旧前端不产生 `_prepend` 参数，新前端打到旧后端时
  该参数被当作未知参数忽略，规则静默不生效——因此**前端与后端需同时发布**，这是唯一的协同要求）。
- 回滚：撤销后端与前端即可；已生成的置顶链接在旧后端上退化为"规则不生效"（不报错），
  用户可切回落点"末尾"恢复。
- 短链（`editable-short-links`）无需改动：短链保存的是完整查询参数集合。
