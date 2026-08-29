# Pailink 在线自动部署（Gitee tag → Webhook → 自动发布）

当往 Gitee 推送一个新 **tag**（如 `v1.2.0`）时，服务器会自动拉取该版本、安装依赖、
构建前端、并用宝塔「Node 项目」（systemctl）重启前后端，实现"打完 tag 即自动发布"。

```
本地打 tag 并推送  →  Gitee Webhook (POST)  →  pailink-deploy 服务（:3005）
                                                  校验 token + refs/tags/*
                                                  后台 spawn
                                                   ▼
                                          deploy/deploy.sh <tag>
                                    git fetch --tags → git checkout -f <tag>
                                        → backend: npm ci → frontend: npm ci + build
                                        → systemctl restart 后端 / 前端 / 部署服务
```

`pailink-deploy` 是一个**独立**、很轻量的 Express 服务，作为宝塔「Node 项目」托管。
它不依赖、也不影响前端/后端 App 的生命周期，因此重启前后台都不会打断它。

---

## 一、前置条件（一次性，先确认这几点都已就绪）

| 依赖 | 用途 | 怎么确认 |
| --- | --- | --- |
| `git` | 拉代码、切 tag | `git --version` |
| `node` ≥ 18 | 跑部署服务 | `node -v` |
| `npm` | 装依赖 | `npm -v` |
| `flock` | 防并发部署（util-linux 自带） | `which flock` → 有路径即可 |
| 宝塔「Node 项目」 | 托管前后台 + 部署服务（systemd） | 面板里已建好这三个 Node 项目 |

**前台和后台必须已经用宝塔「Node 项目」管理器托管**（本方案用 `systemctl restart` 重启它们，
不是 pm2）。查一下它们的 **systemd 单元名**，这正是要填进 `.env` 的值：

```bash
systemctl list-unit-files | grep -iE 'node|pailink'
# 例如： node-pailink-backend.service / node-pailink-frontend.service ...
```

**去掉 `.service` 后缀后的名字**，就是后面 `deploy/.env` 里的
`BACKEND_APP` / `FRONTEND_APP` / `DEPLOY_SVC`（见第四节）。

---

## 二、clone 代码到服务器

任选一个目录作为**部署目录**（建议 `/var/www/pailink`），克隆 Gitee 仓库：

```bash
sudo mkdir -p /var/www && sudo chown $USER /var/www   # 确保你有写权限
git clone https://gitee.com/shenzhen-dianpai/official-website.git /var/www/pailink
cd /var/www/pailink
```

> 记住这个路径 `/var/www/pailink`，它就是下面 `DEPLOY_DIR` 的取值来源。
> 你也可以用 `pwd` 再确认一次。

---

## 三、安装部署服务的依赖

```bash
cd /var/www/pailink/deploy
npm install          # 只装一个 express + dotenv，很快
```

---

## 四、填写 `deploy/.env`（重点：每一项从哪来的，见下方表格）

```bash
cd /var/www/pailink/deploy
cp deploy.env.example .env
vi .env    # 或 nano .env
```

`.env` 已被 gitignore，**不会被提交、也不会被自动部署覆盖**，放心填。

### 逐项说明（`从哪里获取` 就是你要找的地方）

| 变量 | 必填 | 作用 | **从哪里获取 / 怎么确定** | 示例 |
| --- | --- | --- | --- | --- |
| `PORT` | 是 | 部署服务监听端口 | 任选一个**没被占用**的端口。本机已用 3001(前端)、3003(后端)、23080(管理台) + nginx 80/443，避开这些即可 | `3005` |
| `GITEE_TOKEN` | 强烈建议 | webhook 鉴权令牌 | **你自己生成一个随机串**，并把这个**同一个值**同时填到这里、以及 Gitee WebHook 的「密码」里（见第六节）。生成：`openssl rand -hex 24` | `（随机，别用示例）` |
| `DEPLOY_DIR` | 是 | 部署目录（git clone 的位置） | 第二节里 `git clone ... <路径>` 的路径，用 `pwd` 确认 | `/var/www/pailink` |
| `BACKEND_APP` | 是 | 后端 systemd 单元名 | **`systemctl list-unit-files \| grep -i node`** 里后端那条，去掉 `.service` 后缀（见第一节） | `node-pailink-backend` |
| `FRONTEND_APP` | 是 | 前端 systemd 单元名 | 同上，前端那条 | `node-pailink-frontend` |
| `DEPLOY_SVC` | 否(有默认) | 部署服务自身单元名 | 同上，部署服务那条（需先在宝塔建好该 Node 项目） | `node-pailink-deploy` |
| `NODE_BIN` | 否 | 宝塔 node 的 bin 目录 | `ls /www/server/nodejs/` 看你用的版本；填 `<目录>/bin`。留空则自动探测最新 | `/www/server/nodejs/v18.20.0/bin` |
| `DEPLOY_LOG` | 否(有默认) | 部署日志路径 | 你想放哪就放哪，**目录需存在且当前用户可写**；默认 `deploy/deploy.log` | `/var/www/pailink/deploy/deploy.log` |
| `ALLOWED_IPS` | 否 | 只允许这些来源 IP 回调，逗号分隔 | 可填写 Gitee WebHook 的**出口 IP**（Gitee 文档有公布）；留空 = 不限制来源 IP | 留空 或 `1.2.3.4,5.6.7.8` |

### 一份改好的示例（对照着填）

```dotenv
PORT=3005
GITEE_TOKEN=3f9c2a8e5b1d70c4a9e6f2b8d1a3c5e7f9a0b2c4
DEPLOY_DIR=/var/www/pailink
BACKEND_APP=node-pailink-backend        # 用 systemctl list-unit-files | grep node 确认实际值
FRONTEND_APP=node-pailink-frontend
DEPLOY_SVC=node-pailink-deploy
NODE_BIN=/www/server/nodejs/v18.20.0/bin   # ls /www/server/nodejs/ 确认实际版本
DEPLOY_LOG=/var/www/pailink/deploy/deploy.log
ALLOWED_IPS=
```

---

## 五、用宝塔「Node 项目」托管部署服务

在宝塔面板新增一个 Node 项目来跑部署服务（前台/后台你早已用 Node 项目管理，不用动）：

| 设置项 | 填什么 |
| --- | --- |
| 项目名称 | `node-pailink-deploy`（记下它，填进 `.env` 的 `DEPLOY_SVC`） |
| 运行目录 / 项目目录 | `/var/www/pailink/deploy` |
| 启动命令 | `node server.js` |
| Node 版本 | 选一个 ≥ 18 的版本（记下它，填进 `NODE_BIN`） |
| 端口 | `3005`（与 `PORT` 一致） |

面板里的 Node 项目由宝塔负责拉起与**开机自启**，无需再配置 pm2。

健康检查：

```bash
curl http://localhost:3005/health
# → {"ok":true,"deploy":{... PORT,DEPLOY_DIR,BACKEND_APP ...}}   即配置已生效
```

> 如果 `curl` 返回的是你刚填的配置，说明 `.env` 读对了。
> 若要允许 Gitee 从外网回调，需放行该端口：宝塔「安全」放行 3005，
> 或 `sudo ufw allow 3005/tcp`；若在云安全组/NAT 后，也要在云控制台放行。
> 更安全可用 `ALLOWED_IPS` 收紧。

---

## 六、在 Gitee 配置 WebHook（token 就在这里对应）

1. 打开 Gitee 仓库 → **管理** → **WebHooks**。
2. 点击 **新增 WebHook**。
3. 按下面填：

| 字段 | 填什么 |
| --- | --- |
| URL | `http://<部署服务器公网IP>:3005/webhook/gitee`（换成你的服务器 IP） |
| 密码 / 令牌 | **填成 `deploy/.env` 里 `GITEE_TOKEN` 的同一个值**（这是两端校验对应的关键） |
| 事件 | 勾选 **Push** |
| 是否启用 | 打开 |

4. 保存后，页面出现该 hook，可点 **「测试」/「推送测试」** 发送一条测试消息。

> 若测试时服务器日志（`deploy.log` 与控制台）报 `bad token`，多半是两端 token 不一致；
> 报 `not a tag push` 是正常的（测试消息走的是分支 ref，本就不触发部署）。

---

## 七、验证自动部署链路

在服务器上手动模拟一次 tag 触发（便于隔离排查，不依赖 Gitee）：

```bash
curl -X POST http://localhost:3005/webhook/gitee \
     -H "X-Gitee-Token: <你的GITEE_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"ref":"refs/tags/v-test-1"}'
# 应立即返回 202 {"ok":true,"deployed":true,"tag":"v-test-1"}
```

然后看日志：

```bash
tail -f /var/www/pailink/deploy/deploy.log
```

应依次出现：`fetch` → `checkout v-test-1` → 前后端 `npm` → `systemctl restart`。
（第一次跑 `npm ci` 会稍慢，属正常。）

---

## 八、日常发布（开发者侧）

本地打好 tag、一键推送（`push.js` 跨平台，已含可选打 tag + 推送 gitee master 与 tags）：

```bash
node push.js        # Windows / macOS / Linux 通用
# 或 ./push.sh      （macOS / Linux）
```

按提示决定是否打 tag：
- **打 tag** → 推送到 gitee → 服务器自动部署；
- **不打 tag** → 照常推送代码，但服务器不更新。

服务器侧观察：`tail -f /var/www/pailink/deploy/deploy.log`

---

## 九、常见问题 / 排障

| 现象 | 排查 |
| --- | --- |
| 没触发 | 日志 `[ignore] not a tag push` → 确认推的是 tag（`refs/tags/*`）不是分支；Gitee WebHook 是否勾选 Push、URL 可达、是否启用 |
| 401 | Gitee「密码」与 `GITEE_TOKEN` 不一致 |
| 403 | 来源 IP 不在 `ALLOWED_IPS` |
| `curl /health` 空或连不上 | 服务没起来：宝塔「Node 项目」看状态 / `systemctl status node-pailink-deploy` 看报错；`.env` 是否有误 |
| 部署脚本报错 | 看 `deploy.log`：`fetch/checkout` 失败多为 tag 未推送上 Gitee，或部署目录有本地改动；`systemctl restart` 失败多为 `BACKEND_APP`/`FRONTEND_APP` **单元名填错**或**权限不足**（非 root 需 sudo，deploy.sh 已自动处理） |
| 后台接口 401 | 自动部署**从不改动 `.env`**（被 gitignore 保护）；若轮换了 `JWT_SECRET` 属正常失效 |

## 安全注意

- 部署目录负责自动切版本：**别在其中手动修改并提交配置**（`checkout -f` 会丢弃对已跟踪文件的本地改动；未跟踪的 `.env`、`backend/uploads/` 不受影响）。
- 部署服务建议不直接暴露公网，或用防火墙 / `ALLOWED_IPS` 收紧。
- 本服务代码随 tag 更新，部署末尾会尝试 `systemctl restart` 部署服务以换上最新 webhook 代码。