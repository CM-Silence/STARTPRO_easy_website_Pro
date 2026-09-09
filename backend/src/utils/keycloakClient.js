// Keycloak SSO 客户端封装（方法实例化：每个方法的连接配置存 auth_methods.config）
// - 每实例独立 issuer discovery 懒加载单例 + 失败熔断（5 分钟内不再重试）
// - 配置变更（签名比对）时自动重建 client
// - auto_create 开启时：keycloak_id 命中 / email 认领 / 建新户（撞名加后缀），新户角色 = 方法配置的角色组
//   auto_create 关闭时：仅匹配已有账号（keycloak_id / email），不建户、不改角色
const { Issuer, generators } = require('openid-client')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const db = require('../config/database')

const BREAKER_MS = 5 * 60 * 1000

// 每实例独立缓存：key → { signature, client, discoveryPromise, breakerUntil }
const methodClients = new Map()

const configSignature = (config) => JSON.stringify(config || {})

// 用实例配置创建（或复用缓存的）OIDC client
const getMethodClient = async (methodKey, config) => {
  if (!config || !config.issuer || !config.clientId || !config.clientSecret) {
    throw new Error(`登录方法 ${methodKey} 连接配置不完整`)
  }

  const signature = configSignature(config)
  let entry = methodClients.get(methodKey)
  if (entry && entry.signature !== signature) {
    // 配置已变更：丢弃缓存（保留熔断状态防止配置错误时反复 discovery）
    entry = { ...entry, signature, client: null, discoveryPromise: null }
    methodClients.set(methodKey, entry)
  }
  if (!entry) {
    entry = { signature, client: null, discoveryPromise: null, breakerUntil: 0 }
    methodClients.set(methodKey, entry)
  }
  if (Date.now() < entry.breakerUntil) {
    throw new Error('Keycloak 暂不可用（熔断中）')
  }
  if (entry.client) return entry.client

  if (!entry.discoveryPromise) {
    entry.discoveryPromise = (async () => {
      const issuer = await Issuer.discover(config.issuer)
      return new issuer.Client({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        response_types: ['code']
      })
    })()
    try {
      entry.client = await entry.discoveryPromise
    } catch (error) {
      // 熔断：一段时间内直接走降级分支
      entry.breakerUntil = Date.now() + BREAKER_MS
      entry.discoveryPromise = null
      throw error
    }
  } else {
    entry.client = await entry.discoveryPromise
  }
  return entry.client
}

// 实例是否可用（未熔断）——用于状态提示
const isMethodAvailable = (methodKey) => {
  const entry = methodClients.get(methodKey)
  return !entry || Date.now() >= entry.breakerUntil
}

const extractClaims = (claims) => ({
  sub: claims.sub,
  preferredUsername: claims.preferred_username || claims.sub,
  email: claims.email || null,
  givenName: claims.given_name || '',
  familyName: claims.family_name || ''
})

const logActivity = async ({ userId, action, description, req }) => {
  await db.execute(
    'INSERT INTO activity_logs (user_id, action, resource_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, action, 'auth', description, req.ip || req.connection?.remoteAddress || null, req.get('User-Agent') || null]
  ).catch(() => {})
}

// 认领/建户并返回本地用户行（含 role）；autoCreate=false 且无匹配时返回 null
const resolveSsoUser = async ({ claims, methodKey, autoCreate, autoCreateRole, req }) => {
  const { sub, preferredUsername, email, givenName, familyName } = extractClaims(claims)

  // 1. keycloak_id 命中 → 直接登录（角色在创建时已定，后续不覆盖）
  let [rows] = await db.execute(
    'SELECT id, username, email, role FROM users WHERE keycloak_id = ? LIMIT 1',
    [sub]
  )
  if (rows.length > 0) {
    return { user: rows[0], created: false, claimed: false }
  }

  // 2. email 精确唯一命中 → 认领现有账号（保留本地密码与本地角色）
  if (email) {
    [rows] = await db.execute(
      'SELECT id, username, email, role FROM users WHERE email = ? LIMIT 2',
      [email]
    )
    if (rows.length === 1) {
      const user = rows[0]
      await db.execute(
        "UPDATE users SET keycloak_id = ?, auth_provider = 'keycloak', updated_at = NOW() WHERE id = ?",
        [sub, user.id]
      )
      return { user, created: false, claimed: true }
    }
    // email 命中多个（理论不应发生，email 有唯一约束）或为空 → 走建户
  }

  // 3. 未开启自动建户：拒绝未登记的账号
  if (!autoCreate) {
    return null
  }

  // 4. 新建用户，角色 = 方法配置的角色组；username 冲突时自动加数字后缀
  const role = ['admin', 'editor', 'viewer'].includes(autoCreateRole) ? autoCreateRole : 'viewer'
  let username = preferredUsername
  let suffix = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    [rows] = await db.execute('SELECT id FROM users WHERE username = ? LIMIT 1', [username])
    if (rows.length === 0) break
    suffix += 1
    username = `${preferredUsername}${suffix}`
  }

  // 列 NOT NULL：塞不可用的随机哈希，使本地密码登录不可能成功
  const unusablePassword = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), 12)
  const [result] = await db.execute(
    `INSERT INTO users (username, email, password, role, first_name, last_name, language, keycloak_id, auth_provider, last_login)
     VALUES (?, ?, ?, ?, ?, ?, 'zh-CN', ?, 'keycloak', NOW())`,
    [username, email, unusablePassword, role, givenName || null, familyName || null, sub]
  )

  await logActivity({ userId: result.insertId, action: 'create', description: `[Keycloak] SSO 首次登录创建账号 ${username}（角色 ${role}）`, req })
  return { user: { id: result.insertId, username, email, role }, created: true, claimed: false }
}

// OIDC 一次性 state / 一次性 exchange code 的内存存储（单实例部署）
const oidcStates = new Map()
const ssoCodes = new Map()

const TTL_STATE = 10 * 60 * 1000
const TTL_CODE = 60 * 1000

// 定时清理过期条目
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of oidcStates) {
    if (val.expiresAt <= now) oidcStates.delete(key)
  }
  for (const [key, val] of ssoCodes) {
    if (val.expiresAt <= now) ssoCodes.delete(key)
  }
}, 5 * 60 * 1000).unref()

const createOidcState = (methodKey) => {
  const state = generators.state()
  const codeVerifier = generators.codeVerifier()
  const entry = {
    methodKey,
    nonce: generators.nonce(),
    codeVerifier,
    codeChallenge: generators.codeChallenge(codeVerifier),
    expiresAt: Date.now() + TTL_STATE
  }
  oidcStates.set(state, entry)
  return { state, ...entry }
}

const consumeOidcState = (state) => {
  const entry = oidcStates.get(state)
  // 无论成败立即删除，防重放
  oidcStates.delete(state)
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry
}

const createSsoCode = (userId) => {
  const code = crypto.randomBytes(32).toString('base64url')
  ssoCodes.set(code, { userId, expiresAt: Date.now() + TTL_CODE, used: false })
  return code
}

// 一次性核销 exchange code（Node 单线程下「检查并置 used」原子安全）
const consumeSsoCode = (code) => {
  const entry = ssoCodes.get(code)
  ssoCodes.delete(code)
  if (!entry || entry.used || entry.expiresAt <= Date.now()) return null
  entry.used = true
  return entry.userId
}

module.exports = {
  isMethodAvailable,
  getMethodClient,
  extractClaims,
  resolveSsoUser,
  createOidcState,
  consumeOidcState,
  createSsoCode,
  consumeSsoCode
}
