const express = require('express')
const router = express.Router()
const db = require('../config/database')
const { authenticateToken, requireEditor, logActivity } = require('../middleware/auth')
const {
  validateCreateNews,
  validateUpdateNews,
  validateId
} = require('../middleware/validation')
const { resolveLang } = require('../utils/resolveLang')
const { computeMissing } = require('../utils/syncStatus')

// 归一化：date 空置 null，pinned 布尔 → 0/1
// 归一化：date 空置 null，pinned 布尔 → 0/1；date 只接受 YYYY-MM-DD(字符串或 Date 均转成该格式)，否则置 null
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const toDateStr = (v) => {
  if (!v) return null
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  }
  const s = String(v)
  return DATE_RE.test(s) ? s : null
}
const normalize = (body = {}) => ({
  title: String(body.title || '').trim(),
  date: toDateStr(body.date),
  summary: body.summary ? String(body.summary) : '',
  link: body.link ? String(body.link) : '',
  image: body.image ? String(body.image) : '',
  pinned: body.pinned ? 1 : 0,
  published: body.published === false || body.published === 0 ? 0 : 1,
  lang: resolveLang(body.lang)
})

// 管理端分页列表 + 搜索（editor）
router.get('/', authenticateToken, requireEditor, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100)
    const offset = (page - 1) * limit
    const search = (req.query.search || '').trim()
    const lang = resolveLang(req.query.lang)

    let where = 'WHERE lang = ?'
    let params = [lang]
    if (search) {
      where += ' AND (title LIKE ? OR summary LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    const onlyPublished = req.query.published === 'true' || req.query.published === '1' || req.query.published === true
    if (onlyPublished) {
      where += ' AND published = 1'
    }
    // 排序：默认创建时间倒序；可选日期正序 / 倒序
    const sort = String(req.query.sort || 'created')
    let order = 'created_at DESC, id DESC'
    if (sort === 'date_asc') order = 'date IS NULL, date ASC, created_at DESC'
    else if (sort === 'date_desc') order = 'date IS NULL, date DESC, created_at DESC'

    const [rows] = await db.execute(
      `SELECT id, title, DATE_FORMAT(date, "%Y-%m-%d") AS date, summary, link, image, pinned, published, is_synced, created_at, updated_at
       FROM news ${where} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`,
      params
    )
    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM news ${where}`, params)

    if (lang === 'zh' && rows.length) {
      try {
        const missing = await computeMissing({ table: 'news', by: 'source', ids: rows.map((r) => r.id) })
        rows.forEach((r) => {
          const miss = missing.get(String(r.id)) || []
          r.syncStatus = { missing: miss, synced: miss.length === 0 }
        })
      } catch (e) {
        console.error('计算新闻同步状态失败', e)
      }
    }

    res.json({
      success: true,
      data: rows,
      meta: {
        current_page: page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
        has_next: page * limit < total,
        has_prev: page > 1
      }
    })
  } catch (error) {
    console.error('获取新闻列表失败:', error)
    res.status(500).json({ success: false, message: '获取新闻列表失败' })
  }
})

// 「最新」模式：置顶优先（可选），再按日期倒序
router.get('/latest', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100)
    const pinFirst = String(req.query.pinFirst) === 'true' || req.query.pinFirst === '1'
    const order = pinFirst ? 'pinned DESC, date DESC, id DESC' : 'date DESC, id DESC'
    const lang = resolveLang(req.query.lang)
    const [rows] = await db.execute(
      `SELECT id, title, DATE_FORMAT(date, "%Y-%m-%d") AS date, summary, link, image, pinned, published, created_at, updated_at
       FROM news WHERE published = 1 AND lang = ? ORDER BY ${order} LIMIT ${limit}`,
      [lang]
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('获取最新新闻失败:', error)
    res.status(500).json({ success: false, message: '获取最新新闻失败' })
  }
})

// 公开分页列表（前端「新闻列表」组件用）：已发布、按语言、搜索、置顶→日期排序、屏蔽前 N 条、翻页
router.get('/index', async (req, res) => {
  try {
    const lang = resolveLang(req.query.lang)
    const page = Math.max(parseInt(req.query.page) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100)
    const search = (req.query.search || '').trim()

    // 默认视图屏蔽前 N 条（供上方新闻卡片复用不重复展示）；搜索时忽略该屏蔽，应搜索全部
    const skip = search ? 0 : Math.max(parseInt(req.query.skip) || 0, 0)

    let where = 'WHERE published = 1 AND lang = ?'
    const params = [lang]
    if (search) {
      where += ' AND (title LIKE ? OR summary LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM news ${where}`, params)
    const offset = (page - 1) * limit + skip

    const [rows] = await db.execute(
      `SELECT id, title, DATE_FORMAT(date, "%Y-%m-%d") AS date, summary, link, image, pinned, published, created_at, updated_at
       FROM news ${where}
       ORDER BY pinned DESC, date DESC, created_at DESC, id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    )

    res.json({
      success: true,
      data: rows,
      meta: {
        current_page: page,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
        has_next: page * limit < total,
        has_prev: page > 1
      }
    })
  } catch (error) {
    console.error('获取新闻分页列表失败:', error)
    res.status(500).json({ success: false, message: '获取新闻列表失败' })
  }
})

// 自定义模式：按 id 批量取
router.get('/batch', async (req, res) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isFinite(n) && n > 0)
    if (ids.length === 0) {
      return res.json({ success: true, data: [] })
    }
    const placeholders = ids.map(() => '?').join(',')
    const lang = resolveLang(req.query.lang)
    const [rows] = await db.execute(
      `SELECT id, title, DATE_FORMAT(date, "%Y-%m-%d") AS date, summary, link, image, pinned, published, created_at, updated_at
       FROM news WHERE published = 1 AND lang = ? AND id IN (${placeholders})`,
      [lang, ...ids]
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('批量获取新闻失败:', error)
    res.status(500).json({ success: false, message: '批量获取新闻失败' })
  }
})

// 单条
router.get('/id/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, title, DATE_FORMAT(date, "%Y-%m-%d") AS date, summary, link, image, pinned, published, created_at, updated_at FROM news WHERE id = ?',
      [req.params.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '新闻不存在' })
    }
    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('获取新闻失败:', error)
    res.status(500).json({ success: false, message: '获取新闻失败' })
  }
})

// 创建
router.post('/', authenticateToken, requireEditor, validateCreateNews, logActivity('create', 'news'), async (req, res) => {
  try {
    const n = normalize(req.body)
    const [result] = await db.execute(
      `INSERT INTO news (title, date, summary, link, image, pinned, published, lang) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [n.title, n.date, n.summary, n.link, n.image, n.pinned, n.published, n.lang]
    )
    const [[row]] = await db.execute(
      'SELECT id, title, DATE_FORMAT(date, "%Y-%m-%d") AS date, summary, link, image, pinned, published, created_at, updated_at FROM news WHERE id = ?',
      [result.insertId]
    )
    res.status(201).json({ success: true, message: '新闻创建成功', data: row })
  } catch (error) {
    console.error('创建新闻失败:', error)
    res.status(500).json({ success: false, message: '创建新闻失败' })
  }
})

// 更新
router.put('/:id', authenticateToken, requireEditor, validateId, validateUpdateNews, logActivity('update', 'news'), async (req, res) => {
  try {
    const n = normalize(req.body)
    const [result] = await db.execute(
      `UPDATE news SET title = ?, date = ?, summary = ?, link = ?, image = ?, pinned = ?, published = ?, is_synced = 0, updated_at = NOW() WHERE id = ?`,
      [n.title, n.date, n.summary, n.link, n.image, n.pinned, n.published, req.params.id]
    )
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '新闻不存在' })
    }
    const [[row]] = await db.execute(
      'SELECT id, title, DATE_FORMAT(date, "%Y-%m-%d") AS date, summary, link, image, pinned, published, created_at, updated_at FROM news WHERE id = ?',
      [req.params.id]
    )
    res.json({ success: true, message: '新闻更新成功', data: row })
  } catch (error) {
    console.error('更新新闻失败:', error)
    res.status(500).json({ success: false, message: '更新新闻失败' })
  }
})

// 删除
router.delete('/:id', authenticateToken, requireEditor, validateId, logActivity('delete', 'news'), async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM news WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '新闻不存在' })
    }
    res.json({ success: true, message: '新闻删除成功' })
  } catch (error) {
    console.error('删除新闻失败:', error)
    res.status(500).json({ success: false, message: '删除新闻失败' })
  }
})

module.exports = router