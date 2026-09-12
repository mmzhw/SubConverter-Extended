## Context

`collectExternalGroupNames`（`src/handler/interfaces.cpp:165`）是
`inline_rules=` 与 `ext_ruleset=` 共用的合法组集合来源：

```cpp
std::set<std::string> collectExternalGroupNames(const ExternalConfig &ext) {
  std::set<std::string> names;
  for (const auto &group : ext.custom_proxy_group)
    if (!group.Name.empty()) names.insert(group.Name);
  // Keep this list in sync with the hardcoded fallback group names
  // used by the built-in Clash template.
  names.insert("Proxy");
  names.insert("Direct");
  names.insert("REJECT");
  names.insert("GLOBAL");
  return names;
}
```

两个调用点的 target 门控决定了它只服务于 Clash/ClashR：

- `interfaces.cpp:4292` → `parsed.target != "clash"` ⇒ `ext_ruleset` 报错
- `interfaces.cpp:4384` → `parsed.target != "clash" && != "clashr"` ⇒ `inline_rules` 报错

## 实测证据

在测试服务器上对 `target=clash` 实测（预设 `Custom_Clash.ini`）：

| 组名 | 后端 | 生成的配置里有这个组吗 |
| --- | --- | --- |
| `Direct` | **HTTP 200** | **否** ⇒ 客户端报 `proxy [Direct] not found` |
| `Proxy` | **HTTP 200** | **否** |
| `GLOBAL` | 200 | 否 |
| **`DIRECT`** | **HTTP 400** | —（真正合法的内置写法被拒） |
| `🎯 全球直连` | HTTP 200 | 是 ✓ |

不选远程配置时（`config` 缺省）生成的 35 个组名全部是 `🚀 手动选择`、
`🎯 全球直连` 这类，`Proxy` / `Direct` / `GLOBAL` **一个都没有**。

代码层面这两个名字的来源也已定位，且都**不属于 Clash 目标**：

- `Proxy`：`subexport.cpp:3640-3660`，仅当生成 **Stash** 输出且缺该组时自动补一个
- `GLOBAL`：`subexport.cpp:8219-8231`，仅当 `add_clash_modes` 时给 **Sing-box**
  输出追加一个 `GLOBAL` outbound

即：白名单把**其他输出格式的组名**混进了 Clash 的校验里。

### D3: `ext.custom_proxy_group` 为空时的宽容分支是**安全网**,不是漏洞

实测发现：**不传 `config=` 时,后端照样知道内置默认配置声明的组名**。
`inline_rules=Direct` 在没有 `config=` 的情况下被拒,报错列出的是内置默认配置
的真实组（`Ⓜ️ 微软服务`、`♻️ 自动选择`、`🇬 谷歌服务` …）：

```
Invalid request: inline_rules references unknown group 'Direct'.
The chosen preset defines these groups: DIRECT, REJECT, Ⓜ️ 微软服务, ♻️ 自动选择, ...
```

也就是说内置默认配置的 `custom_proxy_group` **会**被填进 `ext`，`names.empty()`
分支在实践中几乎不会命中。因此本次收紧对「未选配置」形态同样生效，D3 原先担心的
"该形态无法校验"并不成立；保留该分支只是防止"配置确实不声明任何组"时把**所有**
组名都拒掉的兜底。

## Goals / Non-Goals

**Goals:**

- 用远程预设时，不再接受预设未声明、且 Clash 不会生成的组名。
- 让 Clash 内置策略名 `DIRECT` / `REJECT` 可被接受。
- 前端不再在"已选预设但组名未加载"时推荐兜底名。
- 报错信息继续列出可用组名，把"生成坏配置"变成"生成前明确报错"。

**Non-Goals:**

- 不改变 URL 语法、wire format 或生成逻辑。
- 不新增「按 target 动态收集合法组」的机制（见 D3）。
- 不处理 Surge/Loon/Quantumult 等其它 target 的组校验 —— 本参数对其本就不可用。

## Decisions

### D1: 只在"配置声明了组名"时收紧

```cpp
if (names.empty()) {
  names.insert("Proxy");
  names.insert("Direct");
  names.insert("GLOBAL");
}
names.insert("DIRECT");
names.insert("REJECT");
```

**理由**：`ext.custom_proxy_group` 为空时（未选远程配置，或预设未声明组），
后端手上**没有任何真实组名**可校验。此时若只留 `DIRECT`/`REJECT`，会把该形态下
所有合法组名（实测是 35 个 emoji 组）全部拒掉 —— 把一个"放行错名字"的 bug
换成"拒绝所有对名字"的 bug。

保留原宽容 + 新增两个内置名，是这一形态下**不回归**的最小改动。该形态的
"放行但不存在"问题作为已知限制记录在 D3。

### D2: 无条件接受 `DIRECT` / `REJECT`

这是 Clash/Mihomo 的内置策略名，不需要 `proxy-groups` 声明即可作为规则目标。
当前白名单只有 `Direct`（错误拼写），导致正确写法被 400 拒绝 —— 属于反直觉的
假阴性，必须修。

### D3: 已知限制 —— `ext.custom_proxy_group` 为空时仍是宽容的

该形态下后端没有可校验的真实组名。彻底修法是让它去取内置默认配置
（SubConverter 的 built-in ini）的 `custom_proxy_group`，但那需要把默认配置的
解析结果接进校验路径，属于独立改动。本次显式记录，不顺手扩大范围。

### D4: 前端"加载失败即清空"，而不是回落到兜底名

`useGroupNames` 当前：

- L32 初始值 = `FALLBACK_GROUP_NAMES`
- L79-81 服务端返回空列表时回落兜底名
- L85-86 `catch` 只置 `error`，**保留旧数组**（即初始的兜底名）

于是"选了预设但拉取失败"时下拉框推荐四个错名字。

改为：选了配置却拿不到列表 ⇒ `groups.value = []`。理由：

- 用户已经能从界面看到"组名加载失败，可手动输入"，下拉为空与提示一致；
- `allow-create` 仍可手输，功能不丢；
- 这本来就是 `inline-rules` 规格写明的行为（"MUST show the four fallback
  groups when no remote config is chosen"）—— 是此前**实现与规格不一致**。

### D5: 兼容性影响是有意的

收紧后，历史链接里用 `Direct`/`Proxy`/`GLOBAL` 指向远程预设的会从
"200 + 坏配置"变成"400 + 可用组名列表"。用户会立刻知道要改什么，
且这正是本次要解决的症状。CHANGELOG 需写明。

## Risks / Trade-offs

- [有意破坏既有链接] → 这些链接本来产出的是客户端无法加载的配置，报错是改善；
  CHANGELOG 与 release notes 写明，并在错误信息里直接列出可用组名。
- [D3 的残留宽容] → 显式记录为已知限制；该形态下无法校验，属于设计边界。
- [前端清空列表后用户不知道填什么] → 已选预设时下拉为空，但用户可先修好远程配置
  再回来；这也是"不要凭空猜测"的正确取舍。
- [C++ 本地不可编译] → 必须在测试服务器重建镜像并逐场景验证（含未选配置的回归）。

## Migration Plan

- 无数据迁移：wire format 与存储格式不变。
- 用户侧：若历史链接用了 `Direct`/`Proxy`/`GLOBAL` 且选了远程预设，重新生成时
  会收到 400 并看到可用组名，按提示改成真实组名即可。
- 发布：C++ + 前端改动，需重建镜像。

## Open Questions

<!-- 无：收紧范围已由用户确认（"解决问题"），D3 作为已知限制记录 -->
