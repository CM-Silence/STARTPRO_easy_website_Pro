# 08 应用对接 Keycloak 单点登录（SSO）通用指南

> 一份可复用的实操手册：无论你的应用是 Node、Java、PHP 还是其它后端，只要它需要一个「用户登录 + 角色」的认证层，都可以按本文接入 Keycloak（OIDC 授权码模式，服务端对接）。本文不绑定任何特定项目或框架。

## 1. 是什么、能做什么

- Keycloak 是开源身份认证（IAM）服务器，负责：登记用户、校验密码、签发/校验 token、管理角色与组、集中登出。
- 你的应用**不自己存用户密码**，而是在登录时把用户重定向到 Keycloak，登录成功后由后端用 Keycloak 签发的 token 换取「本应用自己的会话」。
- 一个应用可以对应一个或多个 Keycloak 客户端（client）；不同客户端可连到不同 realm，登录后即可区分用户归属/角色。

## 2. 推荐接入姿势

推荐**服务端 OIDC 授权码模式**（Authorization Code + PKCE），不要用纯前端隐式模式：

| 要不要 | 理由 |
| --- | --- |
| 授权码模式（后端换 token） | token 不进浏览器，避免泄漏；官方推荐 |
| PKCE（code_challenge/code_verifier） | 防授权码被拦截重放，天然配套 |
| state + nonce | 防 CSRF、防 ID Token 重放，务必校验 |
| 用现成 OIDC 客户端库（如 Node 的 openid-client、Java 的 keycloak/spring、PHP 的 oidc） | 库已完成 discovery、验签、nonce/aud 校验，别手搓 |
| 服务端「本地会话层」 | Keycloak token 转成你自己的 session/JWT，后续接口不影响 |
| 保留一份本地账号密码作为降级 | Keycloak 故障时仍可登录 |

## 3. 一次对接要准备什么

### 3.1 Keycloak 管理台（运维/管理员，一次性）

1. 建 **realm**（隔离域），如 `my-app`。
2. 建 **client**：
   | 配置项 | 值 |
   | --- | --- |
   | Client type | `OpenID Connect` |
   | Client ID | 如 `my-app-web` |
   | Client authentication | 开（confidential，会生成 client secret） |
   | Standard flow | 开（授权码流程） |
   | Valid redirect URIs | 你的应用回调地址（见 §3.2） |
   | Web origins | 你的应用前台 origin，或 `+` |
3. 建角色/组（如 `admin`、`editor`、`viewer`），分配给对应用户。
4. 给用户登记时必须保证有稳定唯一字段（通常是 **email**），用作与你应用本地账号的匹配键。

### 3.2 应用侧要落地的几个地址/配置

- **发现端点 discovery**：`https://<keycloak-host>/realms/<realm>/.well-known/openid-configuration`。OIDC 库会从这里拿到 authorize/token/jwks 等端点，你无需硬编码。
- **回调地址（callback / redirect_uri）**：Keycloak 登录成功后跳回你的地址。**推荐每个客户端/角色的回调地址独立**（形如 `https://<你的域名>/login/<client-标识>/callback`），便于维护并在 Keycloak 与代码中逐字对齐。
- **环境变量**（典型）：
  ```
  KEYCLOAK_ISSUER_URL=https://<kc-host>/realms/<realm>
  KEYCLOAK_CLIENT_ID=<client-id>
  KEYCLOAK_CLIENT_SECRET=<client-secret>
  APP_BASE_ORIGIN=https://<你的应用域名>[:端口]
  ```

### 3.3 代码里实现的三个端点

| 端点 | 逻辑 |
| --- | --- |
| `GET /start` | 生成 state + nonce + PKCE，302 到 Keycloak authorize URL |
| `GET /callback` | 校验 state（与之前存的比对）、用 code 换 token、校验 ID Token（验签/nonce/aud）→ 建本地会话 → 重定向回应用 |
| `GET /logout` | 调用 Keycloak 的 `endSession`（带 id_token_hint）完成集中登出 |

### 3.4 账号认领 / 自动建户

登录成功的用户，匹配到你的本地账号：

1. 先用 Keycloak 的用户唯一 ID（`sub`）匹配本地用户（存 `keycloak_id`）；
2. 未命中则用 **email 精确唯一** 匹配，认领已有本地账号（保留其原有字段/角色）——**建议只按 email 认领，不要按用户名认领**，避免同名冒领；
3. 都不中，若允许自动建户 → 新建本地账号并分配默认角色/角色组；若不允许 → 拒绝并提示「账号未登记」。

### 3.5 生产注意

- 后端服务器需能**出站访问** Keycloak discovery 端点。
- Keycloak 与你的应用域名要固定：回调地址在 Keycloak 两侧**逐字符一致**（协议、域名、端口、路径都不能差）。
- 想省去代理头推导的坑，就在环境变量里**显式写死应用对外 origin**（`APP_BASE_ORIGIN`），后端发送的 redirect_uri 完全确定，不依赖反向代理。

## 4. 对接之前要确认的清单

- [ ] Keycloak 版本可直接用的 realm 和 client 已建好、secret 已生成
- [ ] Client 开启 confidential + Standard flow
- [ ] **Valid redirect URIs** 与代码/环境变量里的回调地址一致（含端口、协议、路径）
- [ ] 后端可访问 `/.well-known/openid-configuration`
- [ ] 用户有稳定 email 用作认领键
- [ ] 角色映射规则定好（哪个角色组 → 应用里哪个权限）
- [ ] 决定自动建户开/关，及其默认角色

## 5. 常见问题

| 现象 | 多半原因 / 处理 |
| --- | --- |
| Keycloak 报 `Invalid parameter: redirect_uri` | 后端实际发送的 redirect_uri 与注册的不一致。看 authorize 地址栏里的 `redirect_uri=` 值，与 Keycloak 里逐字比对（端口/协议/路径/客户端路径前缀） |
| 授权码报 `invalid_grant` | code 过期（默认 60s）/ 被二次使用；或 client secret 不对、PKCE challenge 不一致 |
| 登录成功但应用没会话 | callback 校验 state 失败（CSRF 防护没对上）或 token 换取失败；查后端日志 |
| 登出没联到 Keycloak | 未调 `endSession`，或没传 `id_token_hint` |
| 回调里拿到的用户没有角色 | 客户端 scope 没包含 `roles`/claim 名，或没做 realm role → 本地角色映射 |

## 6. 常用命令 / 手工验证

```bash
# 用 curl 走一遍发现端点，确认可访问
curl https://<kc-host>/realms/<realm>/.well-known/openid-configuration

# 浏览器直接打开 authorize 地址（拼好参数）可快速验证 Keycloak 端配置是否正确
https://<kc-host>/realms/<realm>/protocol/openid-connect/auth?client_id=<cid>&response_type=code&scope=openid%20profile%20email&redirect_uri=<你的回调>&...
```

> 本文聚焦「对接 Keycloak 的通用流程与常见坑」；具体某个语言/框架的库用法，以该库文档为准（openid-client / Spring Security / Passport 等）。