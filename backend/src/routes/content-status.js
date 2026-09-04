const express = require('express')

const router = express.Router()

const db = require('../config/database')
const { resolveLang } = require('../utils/resolveLang')

// 内容状态/版本接口（无需鉴权）
// 供前端浏览器缓存做「条件更新」比对：返回各缓存数据源最近的 updated_at，
// 若与缓存中记录的版本一致则直接命中缓存，否则重新拉取全量数据。
router.get('/status', async (req, res) => {
  try {
    const lang = resolveLang(req.query.lang)

    const [[row]] = await db.execute(
      `SELECT
        (SELECT MAX(n.updated_at) FROM navigation n WHERE n.is_active = 1 AND n.lang = ?) AS navigation,
        (SELECT MAX(s.updated_at) FROM settings s WHERE s.lang IN ('zh', ?))          AS settings,
        (SELECT MAX(nw.updated_at) FROM news nw WHERE nw.published = 1 AND nw.lang = ?) AS news,
        (SELECT MAX(l.updated_at) FROM languages l)                                   AS languages`,
      [lang, lang, lang]
    )

    res.json({
      success: true,
      data: row
    })
  } catch (error) {
    console.error('获取内容状态失败:', error)
    res.status(500).json({
      success: false,
      message: '获取内容状态失败'
    })
  }
})

module.exports = router