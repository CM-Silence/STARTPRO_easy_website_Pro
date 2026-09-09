// Keycloak OIDC 授权码流程（仅后台登录；方法实例化，配置存 auth_methods 表）
// 流程：/start/:method 302 到对应 Keycloak → /callback 换 token 并桥接为本地账号 →
//       签发一次性 code → 前端 /admin/sso 页面用 code 调 /auth/sso-exchange 换取本地会话
const express = require('express')
const router = express.Router()
const db = require('../config/database')
const kc = require('../utils/keycloakClient')
const authMethods = require('../utils/authMethods')

// 项目未使用 cookie-parser，与 auth.js 一致地手工解析
const parseCookies = (req) => {
  const header = req.headers?.cookie
  if (!header) return {}
  const out = {}
  header.split(';').forEach((part) => {
    const [rawKey, ...rawValueParts] = part.trim().split('=')
    if (!rawKey) return
    out[rawKey] = decodeURIComponent(rawValueParts.join('=') || '')
  })
  return out
}

// 登录页跳转目标（相对路径，浏览器当前就在后台 origin 上）
const loginRedirect = (res, reason) => res.redirect(`/admin/login?sso=${reason}`)
// SSO 中转页跳转目标（相对路径）
const ssoRedirect = (res, params) => res.redirect(`/admin/sso?${new URLSearchParams(params).toString()}`)

// 按请求推导后台对外 origin
// 优先级：显式 env > X-Forwarded-* 头（nginx/Next 代理设置）> 原始 Host
const firstForwarded = (value) => (typeof value === 'string' ? value.split(',')[0].trim() : undefined)

const requestOrigin = (req) => {
  if (process.env.ADMIN_PANEL_ORIGIN) return process.env.ADMIN_PANEL_ORIGIN
  const proto = firstForwarded(req.headers['x-forwarded-proto']) || req.protocol
  const host = firstForwarded(req.headers['x-forwarded-host']) || req.headers['host']
  return `${proto}://${host}`
}

const stateCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth/keycloak',
  maxAge: 10 * 60 * 1000
})

// 登录页用：已启用且连接配置完整的登录方法（公开只读，不含任何连接凭证）
router.get('/methods', async (req, res) => {
  try {
    const methods = await authMethods.getEnabledMethods()
    res.json({ success: true, data: methods })
  } catch (error) {
    console.error('获取登录方法失败:', error)
    res.status(500).json({ success: false, message: '获取登录方法失败' })
  }
})

// 发起登录：302 到对应方法的 Keycloak 授权页
router.get('/start/:method', async (req, res) => {
  const methodKey = req.params.method
  if (!authMethods.isValidMethodKey(methodKey) || !authMethods.isKeycloakKey(methodKey)) {
    return loginRedirect(res, 'disabled')
  }

  const methodConfig = await authMethods.getMethod(methodKey)
  if (!methodConfig || !methodConfig.isEnabled || !methodConfig.configured) {
    return loginRedirect(res, 'disabled')
  }

  try {
    const client = await kc.getMethodClient(methodKey, methodConfig.config)
    const redirectUri = `${requestOrigin(req)}/api/auth/keycloak/${methodKey}/callback`
    const { state, nonce, codeVerifier, codeChallenge } = kc.createOidcState(methodKey)

    res.cookie('kc_oidc_state', state, stateCookieOptions())

    const authUrl = client.authorizationUrl({
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })

    res.redirect(authUrl)
  } catch (error) {
    // Keycloak 不可达：优雅降级，本地登录不受影响
    console.error('Keycloak SSO 发起失败:', error.message)
    loginRedirect(res, 'unavailable')
  }
})

// Keycloak 回调：每个方法实例有独立回调路径 /api/auth/keycloak/<methodKey>/callback
// （Keycloak 客户端的 Valid redirect URIs 填各自实例的完整回调地址）
router.get('/:method/callback', async (req, res) => {
  const methodKey = req.params.method
  if (!authMethods.isValidMethodKey(methodKey) || !authMethods.isKeycloakKey(methodKey)) {
    return ssoRedirect(res, { error: 'method_disabled' })
  }

  // 用户在 Keycloak 取消/拒绝
  if (req.query.error) {
    console.warn('Keycloak SSO 被拒绝:', req.query.error)
    return ssoRedirect(res, { error: 'access_denied' })
  }

  // 校验 state：cookie 与 query 一致、服务端存在未过期条目（防 CSRF/重放）、
  // 且 state 中记录的方法与回调路径中的方法一致（防跨方法混用）
  const state = req.query.state
  const cookieState = parseCookies(req).kc_oidc_state
  const oidcEntry = state && state === cookieState ? kc.consumeOidcState(state) : null
  res.clearCookie('kc_oidc_state', { ...stateCookieOptions(), maxAge: 0 })

  if (!oidcEntry || oidcEntry.methodKey !== methodKey) {
    console.warn('Keycloak SSO state 校验失败')
    return ssoRedirect(res, { error: 'state_mismatch' })
  }

  try {
    // 方法配置可能已在回调前被修改/停用
    const methodConfig = await authMethods.getMethod(methodKey)
    if (!methodConfig || !methodConfig.isEnabled || !methodConfig.configured) {
      return ssoRedirect(res, { error: 'method_disabled' })
    }

    const client = await kc.getMethodClient(methodKey, methodConfig.config)
    const redirectUri = `${requestOrigin(req)}/api/auth/keycloak/${methodKey}/callback`
    const tokenSet = await client.callback(redirectUri, req.query, {
      state,
      nonce: oidcEntry.nonce,
      code_verifier: oidcEntry.codeVerifier
    })

    const claims = tokenSet.claims()
    const resolved = await kc.resolveSsoUser({
      claims,
      methodKey,
      autoCreate: methodConfig.autoCreate,
      autoCreateRole: methodConfig.autoCreateRole,
      req
    })

    // 未开启自动建户且账号未登记
    if (!resolved) {
      return ssoRedirect(res, { error: 'not_registered' })
    }
    const { user } = resolved

    // 更新最后登录时间 + 登录日志
    await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id])
    await db.execute(
      'INSERT INTO activity_logs (user_id, action, resource_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [
        user.id,
        'login',
        'auth',
        `用户 ${user.username} 通过 ${methodConfig.displayName} 登录系统`,
        req.ip || req.connection?.remoteAddress || null,
        req.get('User-Agent') || null
      ]
    )

    // 签发一次性 code，交给前端中转页换取本地会话
    const code = kc.createSsoCode(user.id)
    const target = `${requestOrigin(req)}/admin/sso?${new URLSearchParams({ code }).toString()}`
    res.redirect(target)
  } catch (error) {
    console.error('Keycloak SSO 回调处理失败:', error.message)
    ssoRedirect(res, { error: 'token_exchange_failed' })
  }
})

module.exports = router
