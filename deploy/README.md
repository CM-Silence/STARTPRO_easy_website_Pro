# Pailink 在线自动部署（Git tag → Gitee Webhook → 自动发布）

当往 Gitee 推送一个新 **tag**（如 `v1.2.0`）时，服务器会自动拉取该版本、安装依赖、
构建前端、并用 PM2 重载前后端，实现"打完 tag 即自动发布"。

## 原理

```
本地打 tag 并推送  →  Gitee Webhook (POST)  →  pailink-deploy 服务（:3005）
                                                  │ 校验 token + refs/tags/*
                                                  │ spawn
                                                  ▼
                                          deploy/deploy.sh <tag>
                                    git fetch --tags → git checkout -f <tag>
                                        → backend: npm ci → frontend: npm ci + build
                                        → pm2 reload 前端 / 后端 / 部署服务
```

`pailink-deploy` 是一个**独立**的、很轻量的 Express 服务，由 PM2 单独托管。
它不依赖、也不影响前端/后端 App 的生命周期。

## 目录内容

| 文件 | 作用 |
| --- | --- |
| `server.js` | Webhook 接收（`POST /webhook/gitee`）、鉴权、后台触发部署 |
| `deploy.sh` | 实际部署动作（拉取/构建/重载），带锁防并发 |
| `pm2.deploy.config.js` | 用 PM2 托管本服务的配置 |
| `deploy.env.example` | 配置模板，复制为 `deploy/.env`（已被 gitignore） |

## 一次性服务器初始化

前置：服务器已装好 `git`、`node`、`npm`、`pm2`、`flock`(util-linux 自带)。

1. **首次拉取代码**（若尚未部署）：
   ```bash
   git clone https://gitee.com/shenzhen-dianpai/official-website.git /var/www/pailink
   ```
2. **安装部署服务依赖**：
   ```bash
   cd /var/www/pailink/deploy && npm install
   ```
3. **填写配置**：
   ```bash
   cp deploy.env.example .env   # 编辑：PORT/GITEE_TOKEN/DEPLOY_DIR/BACKEND_APP/FRONTEND_APP
   ```
   - `BACKEND_APP` / `FRONTEND_APP` 要与服务器上 `pm2 list` 的进程名一致。
4. **用 PM2 托管部署服务**：
   ```bash
   cd /var/www/pailink/deploy
   pm2 start pm2.deploy.config.js
   pm2 save
   ```
5. **在 Gitee 配置 Webhook**：
   - Gitee 仓库 → 管理 → WebHooks → 新增 WebHook
   - **URL**：`http://<部署服务器IP>:3005/webhook/gitee`
   - 勾选 **Push** 事件
   - 若设了令牌/密码，填成与 `.env` 中 `GITEE_TOKEN` 一致
   - 建议只允许 Gitee Webhook 出口 IP 回调（在 `.env` 的 `ALLOWED_IPS` 中配置）

## 发布流程（一键）

本地打完 tag 后，运行仓库根目录的 `push-all.ps1`（已包含推送到 Gitee）：
```bash
git tag v1.2.0
./push-all.ps1          # 同时推 forgejo / github / gitee(master + tags)
```
Gitee 收到 tag 推送后自动回调，服务器侧自动部署。观察结果：
```bash
tail -f /var/www/pailink/deploy/deploy.log
```

## 排查

| 现象 | 排查 |
| --- | --- |
| 没触发 | 日志 `[ignore] not a tag push` → 确认 push 的是 tag 而非分支；Webhook 是否勾选 Push、URL 可达、token 是否一致 |
| 401 | Gitee 令牌与 `GITEE_TOKEN` 不一致 |
| 403 | 来源 IP 不在 `ALLOWED_IPS` |
| 部署脚本报错 | 看 `deploy.log`：`git fetch`/`checkout` 失败多为 tag 未推送或本地工作区不一致；`pm2 reload` 失败确认进程名 |
| 后台接口 401 | 部署从未改 `.env`（gitignore 保护）；若轮换了 `JWT_SECRET` 属正常失效 |

## 安全注意事项

- 部署目录负责自动切换版本：请勿在其中手动修改并提交配置文件（`git checkout -f` 会丢弃对已跟踪文件的本地改动；未跟踪的 `.env`、`uploads/` 不受影响）。
- 部署服务端口建议不直接暴露公网，或通过防火墙/`ALLOWED_IPS` 收紧。
- 本服务自身代码随 tag 更新，部署末尾会尝试 `pm2 reload pailink-deploy` 换上新代码。