const express = require('express')

const router = express.Router()

const db = require('../config/database')

const {
  authenticateToken,
  requireAdmin,
  logActivity
} = require('../middleware/auth')
const { validateUpdateSettings } = require('../middleware/validation')
const { resolveLang } = require('../utils/resolveLang')

// 需按语言分库保存的本地化设置键；其余键（主题/字体/ICP/联系方式等）为全局共享，仅写 zh 行
const LOCALIZED_SETTINGS = [
  'site_name',
  'company_name',
  'site_description',
  'site_keywords',
  'copyright',
  'footer_layout',
  'social_links',
  'quick_links',
  'site_statement',
  'transition_main_title',
  'transition_subtitle',
  'address',
  'footer_social_title'
]

const getDefaultFooterLayout = () => ({
  brand: {
    name: '某某科技有限责任公司',
    description: '致力于为客户提供专业的数字化解决方案，助力企业完成数字化转型与业务升级。', 
    logo: ''
  },
  sections: [
    {
      id: 'about',
      title: '关于我们',
      description: '',
      links: [
        { id: 'about-company', label: '公司简介', url: '/about', target: '_self' },
        { id: 'news', label: '新闻动态', url: '/news', target: '_self' },
        { id: 'contact', label: '联系我们', url: '/contact', target: '_self' }
      ]
    },
    {
      id: 'products',
      title: '产品与服务',
      description: '',
      links: [
        { id: 'solutions', label: '解决方案', url: '/solutions', target: '_self' },
        { id: 'cases', label: '客户案例', url: '/cases', target: '_self' },
        { id: 'services', label: '定制开发', url: '/services', target: '_self' } 
      ]
    },
    {
      id: 'support',
      title: '支持中心',
      description: '',
      links: [
        { id: 'docs', label: '帮助文档', url: '/docs', target: '_self' },
        { id: 'support', label: '服务工单', url: '/support', target: '_self' },
        { id: 'faq', label: '常见问题', url: '/faq', target: '_self' }
      ]
    }
  ]
})

const getDefaultFooterSocialLinks = () => ([
  {
    id: 'wechat',
    label: '官方微信',
    icon: '/system-default/icons/wechat.svg',
    url: 'https://weixin.qq.com',
    target: '_blank'
  },
  {
    id: 'weibo',
    label: '新浪微博',
    icon: '/system-default/icons/weibo.svg',
    url: 'https://weibo.com',
    target: '_blank'
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '/system-default/icons/linkedin.svg',
    url: 'https://www.linkedin.com',
    target: '_blank'
  }
])

const sanitizeString = (value, fallback = '') => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return fallback
}

const normalizeFooterLayout = (layout) => {
  const base = getDefaultFooterLayout()
  const hasProvidedLayout = layout !== undefined && layout !== null
  const brand = layout?.brand || {}
  const normalized = {
    brand: {
      name: sanitizeString(brand.name, hasProvidedLayout ? '' : base.brand.name) || (hasProvidedLayout ? '' : base.brand.name),
      description: sanitizeString(brand.description, ''),
      logo: sanitizeString(brand.logo, '')
    },
    sections: []
  }

  const sectionsSource = Array.isArray(layout?.sections) && layout.sections.length
    ? layout.sections
    : hasProvidedLayout
      ? []
      : base.sections

  normalized.sections = sectionsSource
    .map((section, sectionIndex) => {
      const linksSource = Array.isArray(section?.links) ? section.links : []
      const links = linksSource
        .filter(link => link && (sanitizeString(link.label).trim() || sanitizeString(link.url).trim()))
        .map((link, linkIndex) => ({
          id: sanitizeString(link.id) || `link_${sectionIndex}_${linkIndex}_${Date.now()}`,
          label: sanitizeString(link.label, `链接${linkIndex + 1}`),
          url: sanitizeString(link.url, '#') || '#',
          target: ['_self', '_blank', '_parent', '_top'].includes(link.target) ? link.target : '_self',


        }))

      return {
        id: sanitizeString(section.id) || `section_${sectionIndex}_${Date.now()}`,
        title: sanitizeString(section.title, `栏目${sectionIndex + 1}`), 
        description: sanitizeString(section.description, ''),
        links
      }
    })
    .filter(section => section.title || section.links.length)

  if (!normalized.sections.length && !hasProvidedLayout) {
    normalized.sections = base.sections
  }

  return normalized
}

const normalizeFooterSocialLinks = (links) => {
  const hasProvidedLinks = links !== undefined && links !== null
  const source = Array.isArray(links) && links.length
    ? links
    : hasProvidedLinks
      ? []
      : getDefaultFooterSocialLinks()

  return source
    .filter(link => link && sanitizeString(link.label).trim())
    .map((link, index) => ({
      id: sanitizeString(link.id) || `social_${index}_${Date.now()}`,
      label: sanitizeString(link.label, `社交链接${index + 1}`),
      url: sanitizeString(link.url, '#') || '#',
      icon: sanitizeString(link.icon, ''),
      target: link.target === '_self' ? '_self' : '_blank',
      color: sanitizeString(link.color, ''),
      show_hover_image: link.show_hover_image === true,
      hover_image: sanitizeString(link.hover_image, '')
    }))
}

// 获取所有设置
router.get('/', async (req, res) => {
  try {
    const lang = resolveLang(req.query.lang)
    const [settings] = await db.execute(
      'SELECT setting_key, setting_value, setting_type, lang FROM settings'
    )

    const parse = (setting) => {
      let value = setting.setting_value

      switch (setting.setting_type) {
        case 'boolean':
          value = value === 'true' || value === '1'
          break
        case 'number':
          value = parseFloat(value)
          break
        case 'json':
          try {
            value = JSON.parse(value)
          } catch (e) {
            value = {}
          }
          break
      }
      return value
    }

    // 先以 zh 行作全局兜底（共享键只存 zh 行，自动落到各语言），
    // 再以目标语言行覆盖本地化键；目标语言缺省时回退 zh
    const settingsObject = {}
    const applyLang = (targetLang) => {
      settings.forEach((setting) => {
        if (setting.lang === targetLang) {
          settingsObject[setting.setting_key] = parse(setting)
        }
      })
    }
    applyLang('zh')
    if (lang !== 'zh') applyLang(lang)

    settingsObject.footer_layout = normalizeFooterLayout(settingsObject.footer_layout)
    settingsObject.footer_social_links = normalizeFooterSocialLinks(settingsObject.footer_social_links)

    res.json({
      success: true,
      data: settingsObject
    })
  } catch (error) {
    console.error('获取设置失败:', error)
    res.status(500).json({
      success: false,
      message: '获取设置失败'
    })
  }
})

// 获取单个设置
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params
    const lang = resolveLang(req.query.lang)

    // 目标语言优先，缺失回退 zh（共享键仅存 zh 行）
    const [settings] = await db.execute(
      `SELECT setting_key, setting_value, setting_type, description, lang FROM settings
       WHERE setting_key = ? AND lang IN (?, 'zh')
       ORDER BY (lang = ?) DESC
       LIMIT 1`,
      [key, lang, lang]
    )

    if (settings.length === 0) {
      return res.status(404).json({
        success: false,
        message: '设置项不存在'
      })
    }

    const setting = settings[0]
    let value = setting.setting_value

    switch (setting.setting_type) {
      case 'boolean':
        value = value === 'true' || value === '1'
        break
      case 'number':
        value = parseFloat(value)
        break
      case 'json':
        try {
          value = JSON.parse(value)
        } catch (e) {
          value = {}
        }
        break
    }

    res.json({
      success: true,
      data: {
        key: setting.setting_key,
        value,
        type: setting.setting_type,
        description: setting.description,
        lang: setting.lang
      }
    })
  } catch (error) {
    console.error('获取设置失败:', error)
    res.status(500).json({
      success: false,
      message: '获取设置失败'
    })
  }
})

// 更新设置
router.put('/',
  authenticateToken,
  requireAdmin,
  validateUpdateSettings,
  logActivity('update', 'settings'),
  async (req, res) => {
    try {
      const settingsData = req.body
      const editLang = resolveLang(req.body.lang || req.query.lang)

      for (const [key, value] of Object.entries(settingsData)) {
        if (key === 'lang') continue
        let normalizedValue = value

        if (key === 'footer_layout') {
          normalizedValue = normalizeFooterLayout(value)
        } else if (key === 'footer_social_links') {
          normalizedValue = normalizeFooterSocialLinks(value)
        }

        let settingValue = normalizedValue

        if (typeof normalizedValue === 'object' && normalizedValue !== null) {
          settingValue = JSON.stringify(normalizedValue)
        } else if (typeof normalizedValue === 'boolean') {
          settingValue = normalizedValue ? 'true' : 'false'
        } else {
          settingValue = String(normalizedValue)
        }

        let settingType = 'string'
        if (typeof normalizedValue === 'object' && normalizedValue !== null) {
          settingType = 'json'
        } else if (typeof normalizedValue === 'boolean') {
          settingType = 'boolean'
        } else if (typeof normalizedValue === 'number') {
          settingType = 'number'
        }

        // 本地化键写当前语言行；共享键（主题/ICP/联系方式/…）写 zh 行
        const targetLang = LOCALIZED_SETTINGS.includes(key) ? editLang : 'zh'

        await db.execute(`
          INSERT INTO settings (setting_key, setting_value, setting_type, lang, updated_at)
          VALUES (?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value),
          setting_type = VALUES(setting_type),
          lang = VALUES(lang),
          updated_at = NOW()
        `, [key, settingValue, settingType, targetLang])
      }

      res.json({
        success: true,
        message: '设置更新成功'
      })
    } catch (error) {
      console.error('更新设置失败:', error)
      res.status(500).json({
        success: false,
        message: '更新设置失败: ' + error.message
      })
    }
  }
)

// 更新单个设置
router.put('/:key',
  authenticateToken,
  requireAdmin,
  logActivity('update', 'settings'),
  async (req, res) => {
    try {
      const { key } = req.params
      const { value, type } = req.body
      const lang = resolveLang(req.body.lang || req.query.lang)

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          message: '设置值不能为空'
        })
      }

      let settingValue = value
      let settingType = type || 'string'

      if (typeof value === 'object') {
        settingValue = JSON.stringify(value)
        settingType = 'json'
      } else if (typeof value === 'boolean') {
        settingValue = value ? 'true' : 'false'
        settingType = 'boolean'
      } else if (typeof value === 'number') {
        settingValue = String(value)
        settingType = 'number'
      } else {
        settingValue = String(value)
      }

      const targetLang = LOCALIZED_SETTINGS.includes(key) ? lang : 'zh'

      await db.execute(`
        INSERT INTO settings (setting_key, setting_value, setting_type, lang, updated_at)
        VALUES (?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        setting_type = VALUES(setting_type),
        lang = VALUES(lang),
        updated_at = NOW()
      `, [key, settingValue, settingType, targetLang])

      res.json({
        success: true,
        message: '设置更新成功'
      })
    } catch (error) {
      console.error('更新设置失败:', error)
      res.status(500).json({
        success: false,
        message: '更新设置失败'
      })
    }
  }
)

// 删除设置 
router.delete('/:key',
  authenticateToken,
  requireAdmin,
  logActivity('delete', 'settings'),
  async (req, res) => {
    try {
      const { key } = req.params
      const lang = resolveLang(req.query.lang)

      const [existing] = await db.execute(
        'SELECT setting_key FROM settings WHERE setting_key = ? AND lang = ?',
        [key, lang]
      )

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: '设置项不存在'
        })
      }

      await db.execute('DELETE FROM settings WHERE setting_key = ? AND lang = ?', [key, lang])

      res.json({
        success: true,
        message: '设置删除成功'
      })
    } catch (error) {
      console.error('删除设置失败:', error) 
      res.status(500).json({
        success: false,
        message: '删除设置失败'
      })
    }
  }
)

// 重置为默认设置 
router.post('/reset',
  authenticateToken,
  requireAdmin,
  logActivity('reset', 'settings'),
  async (req, res) => {
    try {
      const defaultSettings = [
        { key: 'site_keywords', value: '绉戞妧,鎶€鏈?,鏈嶅姟,瀹樼綉,鍏徃', type: 'string' },
        { key: 'site_name', value: '科技公司官网', type: 'string' },
        { key: 'site_description', value: '现代化科技公司官网，提供专业的技术服务', type: 'text' },
        { key: 'company_name', value: '科技公司', type: 'string' },
        { key: 'site_logo', value: '/logo.png', type: 'string' },
        { key: 'site_favicon', value: '/favicon.ico', type: 'string' },
        { key: 'contact_email', value: 'contact@example.com', type: 'string' },
        { key: 'contact_phone', value: '400-123-4567', type: 'string' },
        { key: 'address', value: '北京市朝阳区科技园', type: 'string' },
        { key: 'icp_number', value: '京ICP备xxxxxxx号', type: 'string' },
        { key: 'social_links', value: '{}', type: 'json' },
        { key: 'quick_links', value: '[{"label":"关于我们","href":"/about"},{"label":"产品服务","href":"/services"},{"label":"解决方案","href":"/solutions"},{"label":"联系我们","href":"/contact"},{"label":"隐私政策","href":"/privacy"},{"label":"服务条款","href":"/terms"}]', type: 'json' },
        { key: 'site_theme', value: 'classic-blue', type: 'string' },
        { key: 'footer_layout', value: JSON.stringify(getDefaultFooterLayout()), type: 'json' },
        { key: 'footer_social_links', value: JSON.stringify(getDefaultFooterSocialLinks()), type: 'json' }
      ]

      await db.execute('DELETE FROM settings')

      for (const setting of defaultSettings) {
        await db.execute(
          'INSERT INTO settings (setting_key, setting_value, setting_type, lang) VALUES (?, ?, ?, ?)',
          [setting.key, setting.value, setting.type, 'zh']
        )
      }

      res.json({
        success: true,
        message: '设置已重置为默认值'
      })
    } catch (error) {
      console.error('重置设置失败:', error)
      res.status(500).json({
        success: false,
        message: '重置设置失败'
      })
    }
  }
)

// 导出设置
router.get('/export/json', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [settings] = await db.execute(
      'SELECT setting_key, setting_value, setting_type, description FROM settings ORDER BY setting_key'
    )

    res.setHeader('Content-Disposition', 'attachment; filename=settings.json')
    res.setHeader('Content-Type', 'application/json')
    res.json({
      exported_at: new Date().toISOString(),
      settings: settings.reduce((acc, setting) => {
        let value = setting.setting_value

        switch (setting.setting_type) {
          case 'boolean':
            value = value === 'true' || value === '1'
            break
          case 'number':
            value = parseFloat(value)
            break
          case 'json':
            try {
              value = JSON.parse(value)
            } catch (e) {
              value = {}
            }
            break
        }

        acc[setting.setting_key] = {
          value,
          type: setting.setting_type,
          description: setting.description
        }
        return acc
      }, {})
    })
  } catch (error) {
    console.error('导出设置失败:', error)
    res.status(500).json({
      success: false,
      message: '导出设置失败'
    })
  }
})

module.exports = router
