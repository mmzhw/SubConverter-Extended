## Why

用户报了一个真实的坏配置：选了远程配置后，把内联规则的组名填成 `Direct`，
后端放行（HTTP 200），但生成的 Clash 配置里根本没有这个组，客户端（Mihomo/nikki）
直接拒绝加载整个配置：

```
rules[95] [DOMAIN-KEYWORD,was.ink,Direct] error: proxy [Direct] not found
configuration file /etc/nikki/run/config.yaml test failed
```

实测复现并定位到 `src/handler/interfaces.cpp` 的 `collectExternalGroupNames`：
它**无条件**把 `Proxy` / `Direct` / `REJECT` / `GLOBAL` 四个名字并入合法组集合，
注释说是"内置 Clash 模板的兜底组名"。但：

- `Proxy` 只在 **Stash** 输出里被自动补（`subexport.cpp:3655`）
- `GLOBAL` 只在 **Sing-box** 输出里被添加（`subexport.cpp:8222`）

而 `inline_rules=` / `ext_ruleset=` **只对 Clash/ClashR 生效**
（`interfaces.cpp:4292`、`:4384` 的 target 门控）。也就是说，这两个名字在 Clash
输出里**根本不会存在**，却通过了校验 → 必然产出坏配置。

`Direct`（首字母大写）同理：实测无论选不选远程配置，Clash 输出的组名都是
`🚀 手动选择`、`🎯 全球直连` 这类，`Direct` 从未出现。

同时还存在**反向**缺陷：Clash 真正的内置策略名是 **`DIRECT`（全大写）**，
而白名单里只有 `Direct` —— 真正合法的写法被 **HTTP 400 拒绝**。

现有规格把这个行为写死了（`inline-rules` 的 "Group validation"：

> the union of `custom_proxy_group` names ... and the four fallback groups
> (`Proxy`, `Direct`, `REJECT`, `GLOBAL`)
>
> **Scenario: Fallback group accepted** — ... succeeds ... *even if the remote
> config does not declare `Direct` explicitly*.

即"宽容"被当成了特性，但它宽容到会生成客户端加载不了的配置）。

前端还有一个放大问题：`useGroupNames` 的 `catch` 分支只置 `error`，
**保留上一次的组名数组**，而初始值正是那四个兜底名。于是"选了远程配置但拉取失败"
时，下拉框依然推荐 `Direct`/`Proxy`/`GLOBAL`/`REJECT`，用户很容易选中。

## What Changes

- **后端**（`src/handler/interfaces.cpp`）：`collectExternalGroupNames` 改为
  - 远程配置**声明了**组名时：合法集 = 配置声明的组名 ∪ {`DIRECT`, `REJECT`}；
    **不再**并入 `Proxy` / `Direct` / `GLOBAL`；
  - 远程配置**没有**声明任何组名时：维持原有宽容（`Proxy`/`Direct`/`GLOBAL`）+ 新增
    `DIRECT`/`REJECT`。此时没有任何真实组名可校验，收紧会把该形态下的所有组名
    全部拒掉；
  - 无论哪种情况都接受 Clash 内置策略名 `DIRECT` / `REJECT`。
- **前端**（`web/src/composables/useGroupNames.ts`）：选择远程配置但组名**未能加载**
  （请求失败、或服务端返回空列表）时，不再回落到四个兜底名，而是给出空列表，
  由 `allow-create` 让用户手输。兜底名只在**未选远程配置**时出现 —— 这也正是
  `inline-rules` 规格里已经写明的行为，此前实现与规格不一致。
- 两个错误路径的报错文案保持"列出合法组名"，让用户能直接看到该填什么。

## Capabilities

### New Capabilities

<!-- 无：修正既有校验语义，不引入新能力 -->

### Modified Capabilities

- `inline-rules`：重写 "Group validation" 需求 —— 合法组集合改为"配置真实声明的组
  ∪ Clash 内置策略名"，并替换 `Fallback group accepted` 场景（该场景描述的正是
  本次要修掉的行为）。

## Impact

- 后端：`src/handler/interfaces.cpp`（`collectExternalGroupNames`）。该函数被
  `inline_rules=`（L4413）与 `ext_ruleset=`（L4320、L4413）共用，**两者的校验语义
  同时改变**：使用远程预设时，过去能被接受但不存在的 `Direct`/`Proxy`/`GLOBAL`
  现在会被拒绝并列出可用组名。这是**有意的破坏性收紧**，会让一部分历史链接
  由"生成坏配置"变为"明确报错"。
- 前端：`web/src/composables/useGroupNames.ts`、其单测，以及
  `InlineRulesControl.vue` / `ExtraRulesetsControl.vue` 的下拉选项来源
  （两个控件共用该 composable）。
- 不改变 wire format、URL 参数语法与生成逻辑；`DIRECT`/`REJECT` 的支持是纯新增。
- 未选远程配置的形态行为基本不变（仅新增两个内置策略名）。
- 需要重建镜像验证（C++ 改动本地无法编译）。
