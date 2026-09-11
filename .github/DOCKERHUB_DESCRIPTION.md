# SubConverter-Extended

SubConverter-Extended 是一个订阅转换服务，基于 subconverter 深度演进，面向 Mihomo / Clash Meta / OpenClash 以及 Surge、Quantumult X、Loon、Stash、Surfboard、Sing-box 等客户端生成可用配置。

![SubConverter-Extended Web UI](https://raw.githubusercontent.com/mmzhw/SubConverter-Extended/master/docs/images/dockerhub-web-ui.png)

## 项目来源

- 当前定制源码：[mmzhw/SubConverter-Extended](https://github.com/mmzhw/SubConverter-Extended)
- 基于项目：[Aethersailor/SubConverter-Extended](https://github.com/Aethersailor/SubConverter-Extended)
- 上游基础：[asdlokj1qpi233/subconverter](https://github.com/asdlokj1qpi233/subconverter)

## 主要能力

- 内置 Web 配置界面，打开容器端口即可通过表单生成真实可复制的订阅 URL。
- Web 前端与转换后端共用同一个容器端口，访问该端口即可打开页面，生成的 `/sub`、`/s` 等链接也直接走同一服务地址。
- 支持远程配置预设，包含 Aethersailor Custom_OpenClash_Rules 与 ACL4SSR 常用模板入口。
- 支持 Mihomo Proxy Provider，也可关闭 Provider 模式改为后端代抓订阅并内联节点。
- 支持节点包含 / 排除正则、节点排序、废弃节点过滤、节点 Emoji、节点类型标记、规则展开等常用参数。
- 支持 GitHub Proxy 配置与延迟测试，用于改善远程配置和规则集在国内服务器上的访问。
- **内联规则**：直接录入“匹配模式 + 值 + 目标组”即可把域名、关键词或网段打到指定策略组，无需另外托管一份规则文件。控件支持**逐行编辑**与**批量编辑**两种模式：逐行编辑用下拉框逐条增删；批量编辑是一个大文本框，一行一条 `匹配模式,值,组名`（例如 `DOMAIN-SUFFIX,foo.com,Domestic`），可从别处直接粘贴，切换时当前规则自动带过去，无法识别的行会保留并计数提示。
- **额外规则集**：可把远程规则源追加到所选预设已有的策略组，组名下拉自动从预设加载，无需手写 `组名,URL` 格式。
- 支持服务端短链，把很长的 `/sub?...` 链接保存为 `/s?id=...`，并提供短链列表、复制、载入、编辑和删除管理。
- **短链内容可编辑**：短链地址保持不变即可修改其目标内容，增删规则后客户端无需重新导入订阅。
- 支持单链接 DNS 模板，Web UI 可读取默认模板、编辑保存，并通过 `dns_template=<id>` 只作用于当前链接。
- Docker 镜像默认使用 Asia/Shanghai 时区，默认对外端口为 `25500`。

## 快速启动

```bash
docker run -d \
  --name SubConverter-Extended \
  -p 25500:25500 \
  -e TZ=Asia/Shanghai \
  -e SUBCONVERTER_SHORT_LINK_PASSWORD=请改成你的管理密码 \
  -v ./short-links:/base/short-links \
  -v ./stats:/base/stats \
  -v ./dns-templates:/base/dns-templates \
  --restart unless-stopped \
  mmzhw51/subconverter-extended:latest
```

启动后访问：

```text
http://服务器IP:25500/
http://服务器IP:25500/version
http://服务器IP:25500/healthz
```

## 常用环境变量

| 变量 | 说明 |
| --- | --- |
| `WEB_PORT` | nginx 对外监听端口，默认 `25500`。 |
| `SUBCONVERTER_LISTEN_PORT` | 容器内后端监听端口，默认 `25501`。 |
| `TZ` | 容器时区，默认建议 `Asia/Shanghai`。 |
| `SUBCONVERTER_SHORT_LINK_PASSWORD` | 服务器短链管理密码。留空时会自动生成随机 token，并在启动日志中打印。 |
| `SUBCONVERTER_SHORT_LINKS_FILE` | 短链存储文件，默认 `/base/short-links/links.json`。 |
| `SUBCONVERTER_SHORT_LINK_MAX_ENTRIES` | 短链最大保存数量，默认 `500`。 |
| `SUBCONVERTER_DNS_TEMPLATES_DIR` | DNS 模板保存目录，默认 `/base/dns-templates`。 |

## 短链密码说明

`/s?id=...` 是客户端订阅更新入口，保持免密；服务器短链的管理接口需要密码：

- `GET /short/list`：查看短链列表。
- `PATCH /short?id=<code>`：原地修改短链的目标内容（短链地址不变）。
- `DELETE /short?id=<code>`：删除短链。

Web UI 会把输入的管理密码作为 `X-Short-Link-Password` 请求头发送。命令行也可以使用：

```bash
curl -H "X-Short-Link-Password: 你的密码" http://服务器IP:25500/short/list
```

如果没有设置 `SUBCONVERTER_SHORT_LINK_PASSWORD`，容器会在 `/base/short-links/admin-password` 生成随机 token，并在启动日志中明文打印当前短链管理密码。

## 镜像标签

- `latest`：最新正式 Release 的镜像，在该 Release 完成全部验证后推进。
- `vX.Y.Z`：正式版本标签，用于固定版本和回滚。
- `YYYY.MM.DD-<commit>`：早期按日期和提交号固定的构建。

## 说明

本项目只做订阅格式转换和配置生成，不提供代理节点或订阅服务。自行部署时请根据网络环境配置防火墙、反向代理、TLS 和访问控制。公开部署请务必设置短链管理密码，并妥善保护日志和持久化目录。

## 安全、合规与使用边界

- 本镜像仅发布软件本身，不运营面向公众的订阅转换服务，不提供、销售、推荐或托管任何代理节点、机场订阅或网络访问服务。
- 自行部署者需要自行管理 TLS、访问控制、防火墙、日志、备份和更新；如将服务暴露到公网，还需要自行确认备案、许可、数据保护和所在地法律法规要求。
