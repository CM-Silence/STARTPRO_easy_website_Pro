// 登录方法管理（Wiki.js 风格）
// - local 方法固定存在、不可停用、不可删除；auto_create 控制后台用户增删能力
// - keycloak 方法为可动态新增的实例：method_key 为随机 id，连接配置（issuer/clientId/clientSecret）
//   存 DB config 列（后台「登录管理」页填写），auto_create 开启时可用 auto_create_role 指定自动分配的角色组
const crypto = require('crypto')
const db = require('../config/database')

const LOCAL_KEY = 'local'

// local 缺省行（DB 无行时以此兜底）
const LOCAL_DEFAULTS = {
  display_name: '账号密码登录',
  is_enabled: 1,
  sort_order: 0,
  auto_create: 1
}

const isValidMethodKey = (key) =>
  typeof key === 'string' && (key === LOCAL_KEY || /^[a-z0-9-]{6,32}$/.test(key))

const isKeycloakKey = (key) => key !== LOCAL_KEY

// config 完整性：keycloak 方法需要三项连接配置
const isConfigComplete = (row) => {
  const cfg = row.config || {}
  return Boolean(cfg.issuer && cfg.clientId && cfg.clientSecret)
}

// 行 → 前端/业务视图
const toView = (row) => ({
  key: row.method_key,
  type: row.method_key === LOCAL_KEY ? 'local' : 'keycloak',
  displayName: row.display_name,
  isEnabled: Boolean(row.is_enabled),
  sortOrder: row.sort_order,
  autoCreate: Boolean(row.auto_create),
  autoCreateRole: row.auto_create_role || null,
  config: row.config || { issuer: '', clientId: '', clientSecret: '' },
  configured: row.method_key === LOCAL_KEY ? true : isConfigComplete(row)
})

const getAllMethods = async () => {
  const [rows] = await db.execute(
    'SELECT method_key, display_name, is_enabled, sort_order, auto_create, config, auto_create_role FROM auth_methods'
  )
  // local 行缺失时以默认值兜底（不落库，首次保存时才写入）
  if (!rows.some((r) => r.method_key === LOCAL_KEY)) {
    rows.push({
      method_key: LOCAL_KEY,
      display_name: LOCAL_DEFAULTS.display_name,
      is_enabled: LOCAL_DEFAULTS.is_enabled,
      sort_order: LOCAL_DEFAULTS.sort_order,
      auto_create: LOCAL_DEFAULTS.auto_create,
      config: null,
      auto_create_role: null
    })
  }
  return rows
    .map(toView)
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.key === LOCAL_KEY ? -1 : 1))
}

const getMethod = async (key) => {
  const all = await getAllMethods()
  return all.find((m) => m.key === key) || null
}

// 登录页用：已启用且配置完整的方法
const getEnabledMethods = async () => {
  const all = await getAllMethods()
  return all
    .filter((m) => m.isEnabled && m.configured)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ key, type, displayName, autoCreate, autoCreateRole }) => ({
      key,
      type,
      displayName,
      autoCreate,
      autoCreateRole
    }))
}

const updateMethod = async (key, { displayName, isEnabled, sortOrder, autoCreate, autoCreateRole, config }) => {
  const sets = []
  const values = []
  if (displayName !== undefined) {
    sets.push('display_name = ?')
    values.push(displayName)
  }
  if (isEnabled !== undefined) {
    sets.push('is_enabled = ?')
    values.push(isEnabled ? 1 : 0)
  }
  if (sortOrder !== undefined) {
    sets.push('sort_order = ?')
    values.push(sortOrder)
  }
  if (autoCreate !== undefined) {
    sets.push('auto_create = ?')
    values.push(autoCreate ? 1 : 0)
  }
  if (autoCreateRole !== undefined) {
    sets.push('auto_create_role = ?')
    values.push(autoCreateRole || null)
  }
  if (config !== undefined) {
    sets.push('config = ?')
    values.push(JSON.stringify(config))
  }
  if (sets.length === 0) return

  // 参数顺序：先 INSERT 的 7 个值，再 ON DUPLICATE KEY UPDATE 的 SET 值
  const insertValues = [
    key,
    displayName ?? LOCAL_DEFAULTS.display_name,
    isEnabled === undefined ? LOCAL_DEFAULTS.is_enabled : isEnabled ? 1 : 0,
    sortOrder ?? LOCAL_DEFAULTS.sort_order,
    autoCreate === undefined ? LOCAL_DEFAULTS.auto_create : autoCreate ? 1 : 0,
    JSON.stringify(config ?? { issuer: '', clientId: '', clientSecret: '' }),
    autoCreateRole ?? null
  ]
  await db.execute(
    `INSERT INTO auth_methods (method_key, display_name, is_enabled, sort_order, auto_create, config, auto_create_role)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE ${sets.join(', ')}`,
    [...insertValues, ...values]
  )
}

// 新增 keycloak 方法实例（默认停用，待配置后启用）
const createKeycloakMethod = async ({ displayName }) => {
  const key = `kc-${crypto.randomBytes(8).toString('hex')}`
  const [rows] = await db.execute('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM auth_methods')
  await db.execute(
    `INSERT INTO auth_methods (method_key, display_name, is_enabled, sort_order, auto_create, config, auto_create_role)
     VALUES (?, ?, 0, ?, 0, ?, ?)`,
    [key, displayName || 'Keycloak 登录', rows[0].next, JSON.stringify({ issuer: '', clientId: '', clientSecret: '' }), null]
  )
  return getMethod(key)
}

const deleteMethod = async (key) => {
  await db.execute('DELETE FROM auth_methods WHERE method_key = ?', [key])
}

module.exports = {
  LOCAL_KEY,
  isValidMethodKey,
  isKeycloakKey,
  getAllMethods,
  getMethod,
  getEnabledMethods,
  updateMethod,
  createKeycloakMethod,
  deleteMethod
}
