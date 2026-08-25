const express = require('express')
const router = express.Router()
const db = require('../config/database')
const { authenticateToken, requireAdmin, logActivity } = require('../middleware/auth')
const { validateId } = require('../middleware/validation')

// URL 后缀校验：小写字母/数字开头，仅含小写字母、数字、下划线、中划线
const SUFFIX_RE = /^[a-z0-9][a-z0-9_-]{0,49}$/

/** suffix → 内部 lang 代码：空后缀（中文）归为 'zh'，其余即后缀本身 */
const codeOf = (suffix) => (suffix === '' || suffix == null ? 'zh' : String(suffix).toLowerCase())

/** 获取全部语言（公开：前台切换器与后台语言筛选共用） */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, display_name, suffix, is_enabled, is_system FROM languages ORDER BY is_system DESC, id ASC'
    )
    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, code: codeOf(r.suffix) }))
    })
  } catch (error) {
    console.error('获取语言列表失败', error)
    res.status(500).json({ success: false, message: '获取语言列表失败' })
  }
})

/** 获取已启用语言（前台切换器） */
router.get('/enabled', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, display_name, suffix, is_system FROM languages WHERE is_enabled = 1 ORDER BY is_system DESC, id ASC'
    )
    res.json({
      success: true,
      data: rows.map((r) => ({ ...r, code: codeOf(r.suffix) }))
    })
  } catch (error) {
    console.error('获取已启用语言失败', error)
    res.status(500).json({ success: false, message: '获取已启用语言失败' })
  }
})

/** 新增语言（admin）。新增语言后缀不允许为空（空后缀保留给系统默认中文） */
router.post('/', authenticateToken, requireAdmin, logActivity('create', 'language'), async (req, res) => {
  try {
    const display_name = String(req.body.display_name || '').trim()
    const suffix = String(req.body.suffix || '').trim().toLowerCase()
    const is_enabled = req.body.is_enabled === false || req.body.is_enabled === 0 ? 0 : 1

    if (!display_name) {
      return res.status(400).json({ success: false, message: '显示名不能为空' })
    }
    if (!SUFFIX_RE.test(suffix)) {
      return res.status(400).json({ success: false, message: '后缀需以小写字母/数字开头，仅含小写字母、数字、下划线、中划线' })
    }

    const [dup] = await db.execute('SELECT id FROM languages WHERE suffix = ?', [suffix])
    if (dup.length > 0) {
      return res.status(400).json({ success: false, message: '该后缀已存在' })
    }

    const [result] = await db.execute(
      'INSERT INTO languages (display_name, suffix, is_enabled, is_system) VALUES (?, ?, ?, 0)',
      [display_name, suffix, is_enabled]
    )

    res.status(201).json({
      success: true,
      message: '语言创建成功',
      data: { id: result.insertId, display_name, suffix, is_enabled, is_system: 0, code: suffix }
    })
  } catch (error) {
    console.error('创建语言失败', error)
    res.status(500).json({ success: false, message: '创建语言失败' })
  }
})

/** 更新语言（admin，系统默认中文不可编辑） */
router.put('/:id', authenticateToken, requireAdmin, validateId, logActivity('update', 'language'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [rows] = await db.execute('SELECT * FROM languages WHERE id = ?', [id])
    if (rows.length === 0) return res.status(404).json({ success: false, message: '语言不存在' })
    if (rows[0].is_system === 1) return res.status(403).json({ success: false, message: '系统默认语言不可编辑' })

    const display_name = req.body.display_name !== undefined ? String(req.body.display_name).trim() : rows[0].display_name
    const suffix = req.body.suffix !== undefined ? String(req.body.suffix).trim().toLowerCase() : rows[0].suffix
    const is_enabled = req.body.is_enabled !== undefined ? (req.body.is_enabled ? 1 : 0) : rows[0].is_enabled

    if (!display_name) return res.status(400).json({ success: false, message: '显示名不能为空' })
    if (!SUFFIX_RE.test(suffix)) {
      return res.status(400).json({ success: false, message: '后缀需以小写字母/数字开头，仅含小写字母、数字、下划线、中划线' })
    }

    const [dup] = await db.execute('SELECT id FROM languages WHERE suffix = ? AND id != ?', [suffix, id])
    if (dup.length > 0) return res.status(400).json({ success: false, message: '该后缀已存在' })

    await db.execute('UPDATE languages SET display_name = ?, suffix = ?, is_enabled = ? WHERE id = ?', [
      display_name,
      suffix,
      is_enabled,
      id
    ])

    res.json({ success: true, message: '语言更新成功' })
  } catch (error) {
    console.error('更新语言失败', error)
    res.status(500).json({ success: false, message: '更新语言失败' })
  }
})

/** 删除语言（admin，系统默认中文不可删除） */
router.delete('/:id', authenticateToken, requireAdmin, validateId, logActivity('delete', 'language'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const [rows] = await db.execute('SELECT * FROM languages WHERE id = ?', [id])
    if (rows.length === 0) return res.status(404).json({ success: false, message: '语言不存在' })
    if (rows[0].is_system === 1) return res.status(403).json({ success: false, message: '系统默认语言不可删除' })

    await db.execute('DELETE FROM languages WHERE id = ?', [id])
    res.json({ success: true, message: '语言删除成功' })
  } catch (error) {
    console.error('删除语言失败', error)
    res.status(500).json({ success: false, message: '删除语言失败' })
  }
})

module.exports = router