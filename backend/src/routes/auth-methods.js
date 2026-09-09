// 登录管理（admin 专属，Wiki.js 风格）
// - 左列方法实例列表 + 右侧配置面板；local 固定存在不可停用/删除
// - keycloak 方法可动态新增实例，连接配置（issuer/clientId/clientSecret）在页面填写存库
const express = require('express')
const router = express.Router()
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth')
const { validateAuthMethodUpdate, validateAuthMethodCreate, validateAuthMethodKey } = require('../middleware/validation')
const authMethods = require('../utils/authMethods')

// 全量登录方法（含未启用与未配置状态，admin 管理页用）
router.get('/',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const methods = await authMethods.getAllMethods()
      res.json({ success: true, data: methods })
    } catch (error) {
      console.error('获取登录方法列表失败:', error)
      res.status(500).json({ success: false, message: '获取登录方法列表失败' })
    }
  }
)

// 新增 keycloak 方法实例（默认停用，待配置连接信息后启用）
router.post('/',
  authenticateToken,
  requireAdmin,
  logActivity('create', 'auth_method'),
  validateAuthMethodCreate,
  async (req, res) => {
    try {
      const type = req.body.type
      if (type !== 'keycloak') {
        return res.status(400).json({ success: false, message: '目前仅支持新增 Keycloak 登录方法' })
      }
      const created = await authMethods.createKeycloakMethod({ displayName: req.body.displayName })
      res.status(201).json({ success: true, message: '已新增 Keycloak 登录方法，请在配置中填写连接信息', data: created })
    } catch (error) {
      console.error('新增登录方法失败:', error)
      res.status(500).json({ success: false, message: '新增登录方法失败' })
    }
  }
)

// 更新单个登录方法配置
router.put('/:key',
  authenticateToken,
  requireAdmin,
  logActivity('update', 'auth_method'),
  validateAuthMethodKey,
  validateAuthMethodUpdate,
  async (req, res) => {
    try {
      const { key } = req.params
      const current = await authMethods.getMethod(key)
      if (!current) {
        return res.status(404).json({ success: false, message: '登录方法不存在' })
      }

      // 护栏：local 方法不可停用
      if (authMethods.isKeycloakKey(key) === false && req.body.isEnabled === false) {
        return res.status(400).json({ success: false, message: '本地登录方法不可停用' })
      }

      // 护栏：开启「自动创建账号」时必须指定角色组
      const autoCreate = req.body.autoCreate ?? current.autoCreate
      const autoCreateRole = req.body.autoCreateRole ?? current.autoCreateRole
      if (autoCreate && !autoCreateRole) {
        return res.status(400).json({ success: false, message: '开启自动创建账号时需选择自动分配的角色组' })
      }

      await authMethods.updateMethod(key, {
        displayName: req.body.displayName,
        isEnabled: req.body.isEnabled,
        sortOrder: req.body.sortOrder,
        autoCreate: req.body.autoCreate,
        autoCreateRole: req.body.autoCreateRole,
        config: req.body.config
      })

      const updated = await authMethods.getMethod(key)
      res.json({ success: true, message: '登录方法已更新', data: updated })
    } catch (error) {
      console.error('更新登录方法失败:', error)
      res.status(500).json({ success: false, message: '更新登录方法失败' })
    }
  }
)

// 删除登录方法（仅 keycloak 实例；local 不可删）
router.delete('/:key',
  authenticateToken,
  requireAdmin,
  logActivity('delete', 'auth_method'),
  validateAuthMethodKey,
  async (req, res) => {
    try {
      const { key } = req.params
      if (!authMethods.isKeycloakKey(key)) {
        return res.status(400).json({ success: false, message: '本地登录方法不可删除' })
      }
      const current = await authMethods.getMethod(key)
      if (!current) {
        return res.status(404).json({ success: false, message: '登录方法不存在' })
      }
      await authMethods.deleteMethod(key)
      res.json({ success: true, message: '登录方法已删除' })
    } catch (error) {
      console.error('删除登录方法失败:', error)
      res.status(500).json({ success: false, message: '删除登录方法失败' })
    }
  }
)

module.exports = router
