// 用户管理（admin 专属）
// 能力受「本地登录-创建账号」开关控制（auth_methods 表，登录管理页可调）：
//   开（默认）→ 完整本地 CRUD：新建/删除用户、分配角色、改邮箱
//   关        → 仅查看列表/活动日志、编辑姓名/语言（账号与角色归 Keycloak/运维管理）
const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const db = require('../config/database')
const {
  authenticateToken,
  requireAdmin,
  logActivity
} = require('../middleware/auth')
const {
  validateUserListQuery,
  validateAdminUpdateUser,
  validateCreateUser,
  validateIdParam,
  validateUserActivityQuery
} = require('../middleware/validation')
const authMethods = require('../utils/authMethods')

// 「本地登录-创建账号」开关（登录管理页控制）
const isLocalAutoCreateOn = async () => {
  const local = await authMethods.getMethod('local')
  return Boolean(local?.autoCreate)
}

// 用户列表安全字段（永不返回 password）
const SAFE_USER_FIELDS = 'id, username, email, first_name, last_name, role, auth_provider, language, created_at, last_login'

// 获取用户列表（搜索 + 分页）
router.get('/',
  authenticateToken,
  requireAdmin,
  validateUserListQuery,
  async (req, res) => {
    try {
      const page = req.query.page
      const limit = req.query.limit
      const search = req.query.search || ''
      const offset = (page - 1) * limit

      let where = ' WHERE 1=1'
      const params = []
      if (search) {
        where += ' AND (username LIKE ? OR email LIKE ?)'
        params.push(`%${search}%`, `%${search}%`)
      }

      const [users] = await db.execute(
        `SELECT ${SAFE_USER_FIELDS} FROM users${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        params
      )
      const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM users${where}`, params)

      res.json({
        success: true,
        data: users,
        meta: {
          current_page: page,
          per_page: limit,
          total,
          total_pages: Math.ceil(total / limit) || 1,
          has_next: page * limit < total,
          has_prev: page > 1
        },
        // 供前端控制「新建/删除」按钮显隐
        canManage: await isLocalAutoCreateOn()
      })
    } catch (error) {
      console.error('获取用户列表失败:', error)
      res.status(500).json({
        success: false,
        message: '获取用户列表失败'
      })
    }
  }
)

// 新建本地用户（需「本地登录-创建账号」开启）
router.post('/',
  authenticateToken,
  requireAdmin,
  logActivity('create', 'user'),
  validateCreateUser,
  async (req, res) => {
    try {
      if (!(await isLocalAutoCreateOn())) {
        return res.status(403).json({
          success: false,
          message: '本地账号创建已关闭，可在「登录管理」页开启'
        })
      }

      const { username, email, password, role, firstName, lastName } = req.body

      // 查重
      const [existing] = await db.execute(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      )
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: '用户名或邮箱已存在'
        })
      }

      const hashedPassword = await bcrypt.hash(password, 12)
      const [result] = await db.execute(
        `INSERT INTO users (username, email, password, role, first_name, last_name, language, auth_provider)
         VALUES (?, ?, ?, ?, ?, ?, 'zh-CN', 'local')`,
        [username, email, hashedPassword, role, firstName || null, lastName || null]
      )

      const [created] = await db.execute(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`, [result.insertId])

      res.status(201).json({
        success: true,
        message: '用户创建成功',
        data: created[0]
      })
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: '用户名或邮箱已存在' })
      }
      console.error('创建用户失败:', error)
      res.status(500).json({
        success: false,
        message: '创建用户失败'
      })
    }
  }
)

// 更新用户
// - 「本地登录-创建账号」关闭：仅 firstName/lastName/language
// - 开启：另可改 email/role（不改密码，避免管理员侧明文经手）
router.put('/:id',
  authenticateToken,
  requireAdmin,
  logActivity('update', 'user'),
  validateIdParam,
  validateAdminUpdateUser,
  async (req, res) => {
    try {
      const { id } = req.params
      const canManage = await isLocalAutoCreateOn()
      const { firstName, lastName, language, email, role } = req.body

      const [existingUsers] = await db.execute(
        'SELECT id, role FROM users WHERE id = ?',
        [id]
      )
      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        })
      }
      const target = existingUsers[0]

      const updates = []
      const values = []

      if (firstName !== undefined) {
        updates.push('first_name = ?')
        values.push(firstName || null)
      }
      if (lastName !== undefined) {
        updates.push('last_name = ?')
        values.push(lastName || null)
      }
      if (language !== undefined) {
        updates.push('language = ?')
        values.push(language || 'zh-CN')
      }

      // 账号字段仅在本地管理开启时允许
      if (email !== undefined || role !== undefined) {
        if (!canManage) {
          return res.status(403).json({
            success: false,
            message: '本地账号管理已关闭，可在「登录管理」页开启'
          })
        }

        if (email !== undefined) {
          const [conflicts] = await db.execute(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, id]
          )
          if (conflicts.length > 0) {
            return res.status(400).json({ success: false, message: '邮箱已被其他用户使用' })
          }
          updates.push('email = ?')
          values.push(email)
        }

        if (role !== undefined && role !== target.role) {
          // 护栏：不能降级最后一个 admin
          if (target.role === 'admin' && role !== 'admin') {
            const [[{ admins }]] = await db.execute("SELECT COUNT(*) AS admins FROM users WHERE role = 'admin'")
            if (admins <= 1) {
              return res.status(400).json({ success: false, message: '系统必须保留至少一个管理员' })
            }
          }
          updates.push('role = ?')
          values.push(role)
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: '没有可更新的字段'
        })
      }

      values.push(id)
      await db.execute(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      )

      const [updatedUser] = await db.execute(`SELECT ${SAFE_USER_FIELDS} FROM users WHERE id = ?`, [id])

      res.json({
        success: true,
        message: '用户更新成功',
        data: updatedUser[0]
      })
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: '邮箱已被其他用户使用' })
      }
      console.error('更新用户失败:', error)
      res.status(500).json({
        success: false,
        message: '更新用户失败'
      })
    }
  }
)

// 删除用户（需「本地登录-创建账号」开启；Keycloak 建户开启时该用户可能在下次 SSO 登录时重建）
router.delete('/:id',
  authenticateToken,
  requireAdmin,
  logActivity('delete', 'user'),
  validateIdParam,
  async (req, res) => {
    try {
      if (!(await isLocalAutoCreateOn())) {
        return res.status(403).json({
          success: false,
          message: '本地账号管理已关闭，可在「登录管理」页开启'
        })
      }

      const { id } = req.params

      // 不能删除自己
      if (Number(id) === Number(req.user.id)) {
        return res.status(400).json({ success: false, message: '不能删除当前登录账号' })
      }

      const [existingUsers] = await db.execute(
        'SELECT id, username, role FROM users WHERE id = ?',
        [id]
      )
      if (existingUsers.length === 0) {
        return res.status(404).json({ success: false, message: '用户不存在' })
      }
      const target = existingUsers[0]

      // 护栏：不能删除最后一个 admin
      if (target.role === 'admin') {
        const [[{ admins }]] = await db.execute("SELECT COUNT(*) AS admins FROM users WHERE role = 'admin'")
        if (admins <= 1) {
          return res.status(400).json({ success: false, message: '系统必须保留至少一个管理员' })
        }
      }

      // 显式清理登录凭证（refresh_tokens 外键也有 CASCADE 兜底）；activity_logs 外键为 SET NULL，历史日志保留
      await db.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [id])
      await db.execute('DELETE FROM users WHERE id = ?', [id])

      res.json({ success: true, message: '用户删除成功' })
    } catch (error) {
      console.error('删除用户失败:', error)
      res.status(500).json({
        success: false,
        message: '删除用户失败'
      })
    }
  }
)

// 获取用户活动日志（复用 activity_logs）
router.get('/:id/activity',
  authenticateToken,
  requireAdmin,
  validateIdParam,
  validateUserActivityQuery,
  async (req, res) => {
    try {
      const { id } = req.params
      const limit = req.query.limit

      const [existingUsers] = await db.execute(
        'SELECT id FROM users WHERE id = ?',
        [id]
      )
      if (existingUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        })
      }

      const [logs] = await db.execute(
        `SELECT id, action, resource_type, resource_id, description, ip_address, created_at
         FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ${limit}`,
        [id]
      )

      res.json({
        success: true,
        data: logs
      })
    } catch (error) {
      console.error('获取用户活动日志失败:', error)
      res.status(500).json({
        success: false,
        message: '获取用户活动日志失败'
      })
    }
  }
)

module.exports = router
