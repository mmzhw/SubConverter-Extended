# SubConverter-Extended

SubConverter-Extended 是面向多种代理客户端的订阅转换后端增强版，重点完善 Mihomo 节点解析、Proxy Provider、多客户端远程资源、请求诊断和公网部署边界。

![SubConverter-Extended Web 配置界面](https://raw.githubusercontent.com/mmzhw/SubConverter-Extended/master/docs/images/dockerhub-web-ui.jpg)

## Web 配置界面

镜像内置 Vue 3 可视化工作台：打开发布端口根路径即可组装真实可复制的订阅 URL。界面使用显式“生成”按钮，避免输入一个字符就更新链接；生成后可复制长链接、生成二维码，也可创建服务端短链。

- **内联规则**：直接录入“匹配模式 + 值 + 目标组”，无需另外托管一份规则文件。例如把某个域名走指定策略组时，填一次即可。
- **额外规则集**：需要共享的远程规则源可追加到所选预设的已有策略组，组名下拉自动从预设加载。
- **短链内容可编辑**：短链地址（`/s?id=...`）保持不变即可修改其目标内容，增删规则后客户端无需重新导入订阅。
- **生成历史与服务端短链**：本地历史可回显，服务端短链可刷新、复制、载入、编辑和删除。

## 支持范围

- 为 Mihomo/Clash 生成 Proxy Provider，并使用 Mihomo 解析桥处理节点链接。
- 为 Surge、Quantumult X、Loon、Surfboard 和 Stash 生成客户端原生远程资源或兼容输出。
- 支持 Sing-box、Quantumult 以及多种传统订阅和分享链接目标。
- 提供 `explain=true`、`/inspect`、`X-Request-ID`、安全档位和可选运行统计。

不同目标格式的能力和限制不同。完整范围见 [Wiki 的客户端与目标格式](https://github.com/Aethersailor/SubConverter-Extended/wiki/Compatibility)。

## 快速启动

> [!WARNING]
> 下方命令只用于本机首次检查，不会持久化自定义配置或统计数据，并且只把端口绑定到宿主机回环地址。需要让局域网或公网访问时，请先阅读 [Docker 部署文档](https://github.com/Aethersailor/SubConverter-Extended/wiki/Docker-Deployment)，再配置持久化、安全档位、访问控制和 TLS。

```bash
docker run -d \
  --name SubConverter-Extended \
  -p 127.0.0.1:25500:25500 \
  --restart unless-stopped \
  mmzhw51/subconverter-extended:latest
```

然后访问：

```text
http://localhost:25500/version
http://localhost:25500/healthz
```

`latest` 对应已验证的最新正式 Release；`vX.Y.Z` 标签用于固定版本和回滚。

不要把宿主机整个 `base` 目录挂载到容器的 `/base`；这会遮盖镜像内的模板、规则和 snippets。需要持久化时，请按 Docker 部署文档只挂载需要修改的配置文件和数据目录。

## 文档

- [README](https://github.com/mmzhw/SubConverter-Extended)
- [完整 Wiki](https://github.com/Aethersailor/SubConverter-Extended/wiki)
- [最新 Release](https://github.com/mmzhw/SubConverter-Extended/releases/latest)
- [安全与隐私](https://github.com/Aethersailor/SubConverter-Extended/wiki/Security-and-Privacy)
- [故障排查](https://github.com/Aethersailor/SubConverter-Extended/wiki/Troubleshooting)

## 许可证

SubConverter-Extended 按 [GNU General Public License v3.0](https://github.com/mmzhw/SubConverter-Extended/blob/master/LICENSE) 发布。Mihomo 解析桥所使用的 Mihomo 依赖同样遵循 GPL-3.0。
