## Purpose

本能力定义 Docker 镜像内置 nginx 与 subconverter 双进程的部署形态：仅一个端口对外发布，前端静态资源由 nginx 托管，订阅转换 API 反向代理到容器内部回环地址上的 subconverter 服务。

## ADDED Requirements

### Requirement: 单镜像单端口部署

容器镜像 SHALL 在同一容器内运行 subconverter 服务与 HTTP 前端服务器，仅发布一个对外端口（默认 8080）；subconverter SHALL 仅监听容器内回环地址，默认不对外发布。

#### Scenario: 容器启动

- **WHEN** 使用默认配置启动容器
- **THEN** 前端配置界面与订阅转换 API 均通过同一个发布端口可访问

#### Scenario: 后端端口不可外部访问

- **WHEN** 容器正常运行
- **THEN** subconverter 监听端口只绑定回环地址，无法从容器外部直接访问

### Requirement: 反向代理转换接口

前端服务器 SHALL 将订阅转换相关请求（`/sub`、`/getprofile`、`/getruleset` 等）转发给内部 subconverter 服务，保持请求方法与查询参数不变，并通过 X-Forwarded-For 传递原始客户端地址。

#### Scenario: 转换请求转发

- **WHEN** 客户端向发布端口请求 `/sub?target=clash&url=...`
- **THEN** 请求被转发到内部 subconverter 并返回生成的配置

#### Scenario: 客户端地址传递

- **WHEN** 客户端访问被代理的 subconverter 页面（如 `/dashboard`）
- **THEN** subconverter 侧识别到的客户端地址为原始客户端 IP，而非代理自身地址

### Requirement: 前端托管与 SPA 路由回退

前端服务器 SHALL 在根路径托管配置界面静态资源；不存在的非 API 路径 SHALL 回退到界面入口页面，保证刷新与深链接可用；静态资源 SHALL 携带合理的缓存策略。

#### Scenario: 首页访问

- **WHEN** 客户端请求发布端口的根路径
- **THEN** 返回配置界面页面

#### Scenario: 深链接刷新

- **WHEN** 客户端直接打开界面的子路径并刷新
- **THEN** 页面正常加载而不返回 404

### Requirement: subconverter 自有页面兼容

subconverter 原生的 `/dashboard`、`/inspect`、`/version` 页面与相关 API SHALL 通过同一发布端口保持可访问，路径与行为不变。

#### Scenario: 原生页面可达

- **WHEN** 客户端访问 `/dashboard` 或 `/version`
- **THEN** 页面正常返回，行为与直连 subconverter 时一致

### Requirement: 进程监督与健康检查

镜像 SHALL 保证两个进程随容器启动自动运行，任一进程退出 SHALL 导致容器停止或被标记为不健康；镜像 SHALL 提供健康检查方式反映整体可用性。

#### Scenario: 进程崩溃处理

- **WHEN** 任一服务进程异常退出
- **THEN** 容器被标记为不健康或退出，可被编排系统重启

#### Scenario: 健康检查

- **WHEN** 两个服务均正常运行时对容器执行健康检查
- **THEN** 检查结果通过，且该检查同时验证前端与 subconverter 服务的可达性

### Requirement: 发布端口可配置

对外发布端口 SHALL 可通过环境变量配置（默认 8080）。

#### Scenario: 自定义端口

- **WHEN** 使用环境变量指定端口启动容器
- **THEN** 前端与 API 通过该端口对外提供服务
