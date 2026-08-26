const express = require('express')
const db = require('../config/database')
const { authenticateToken, requireAdmin, requireEditor, logActivity } = require('../middleware/auth')
const { validateId } = require('../middleware/validation')
const { translateItem } = require('../utils/aiTranslate')

const router = express.Router()

const DEFAULT_BASE_URLS = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  xinference: 'http://localhost:9997/v1'
}

const getDefaultProfile = async () => {
  const [rows] = await db.execute(
    'SELECT * FROM ai_provider_settings WHERE is_default = 1 ORDER BY id ASC LIMIT 1'
  )
  if (rows.length > 0) return rows[0]
  const [fallback] = await db.execute('SELECT * FROM ai_provider_settings ORDER BY id ASC LIMIT 1')
  return fallback[0] || null
}

const getProfileById = async (id) => {
  const [rows] = await db.execute('SELECT * FROM ai_provider_settings WHERE id = ?', [id])
  return rows[0] || null
}

const listProfiles = async () => {
  const [rows] = await db.execute(
    'SELECT * FROM ai_provider_settings ORDER BY is_default DESC, provider ASC, id ASC'
  )
  return rows
}

const createProfile = async (payload) => {
  const {
    profile_name,
    provider,
    api_base,
    api_key,
    model,
    temperature,
    max_tokens,
    top_p,
    enabled,
    is_default
  } = payload

  await db.execute(
    `
      INSERT INTO ai_provider_settings
        (profile_name, provider, api_base, api_key, model, temperature, max_tokens, top_p, enabled, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      profile_name,
      provider,
      api_base,
      api_key,
      model,
      temperature,
      max_tokens,
      top_p,
      enabled ? 1 : 0,
      is_default ? 1 : 0
    ]
  )
}

const updateProfile = async (id, payload) => {
  const {
    profile_name,
    provider,
    api_base,
    api_key,
    model,
    temperature,
    max_tokens,
    top_p,
    enabled
  } = payload

  await db.execute(
    `
      UPDATE ai_provider_settings
      SET profile_name = ?, provider = ?, api_base = ?, api_key = ?, model = ?,
          temperature = ?, max_tokens = ?, top_p = ?, enabled = ?
      WHERE id = ?
    `,
    [
      profile_name,
      provider,
      api_base,
      api_key,
      model,
      temperature,
      max_tokens,
      top_p,
      enabled ? 1 : 0,
      id
    ]
  )
}

const setDefaultProfile = async (id) => {
  await db.execute('UPDATE ai_provider_settings SET is_default = 0')
  await db.execute('UPDATE ai_provider_settings SET is_default = 1 WHERE id = ?', [id])
}

const resolveApiBase = (provider, api_base) => {
  if (api_base && typeof api_base === 'string' && api_base.trim()) return api_base.trim()
  return DEFAULT_BASE_URLS[provider] || DEFAULT_BASE_URLS.openai
}

const ensureFetch = () => {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available; please use Node 18+ or add a fetch polyfill.')
  }
}

const callChatCompletion = async (settings, prompt) => {
  ensureFetch()
  const apiBase = resolveApiBase(settings.provider, settings.api_base)
  const url = `${apiBase.replace(/\/$/, '')}/chat/completions`
  const payload = {
    model: settings.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: Number(settings.temperature ?? 0.7),
    max_tokens: Number(settings.max_tokens ?? 800),
    top_p: Number(settings.top_p ?? 1.0)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: settings.api_key ? `Bearer ${settings.api_key}` : undefined
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI request failed (${response.status}): ${errorText}`)
    }

    return response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

const interpolateTemplate = (template, vars) => {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = vars[key]
    return value === undefined || value === null ? '' : String(value)
  })
}

const stripJsonFence = (raw) => {
  if (typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

const parseJsonSafe = (raw) => {
  try {
    const normalized = stripJsonFence(raw)
    return { ok: true, value: JSON.parse(normalized) }
  } catch (error) {
    return { ok: false, error }
  }
}

// AI settings
router.get('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const row = await getDefaultProfile()
    res.json({ success: true, data: row || null })
  } catch (error) {
    console.error('Failed to fetch AI settings:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch AI settings' })
  }
})

router.put('/settings', authenticateToken, requireAdmin, logActivity('update', 'ai_provider_settings'), async (req, res) => {
  try {
    const {
      profile_name = '默认配置',
      provider,
      api_base,
      api_key,
      model,
      temperature = 0.7,
      max_tokens = 800,
      top_p = 1.0,
      enabled = true
    } = req.body || {}

    if (!provider || !model) {
      return res.status(400).json({ success: false, message: 'provider and model are required' })
    }

    const existing = await getDefaultProfile()
    if (existing) {
      await updateProfile(existing.id, {
        profile_name,
        provider,
        api_base,
        api_key,
        model,
        temperature,
        max_tokens,
        top_p,
        enabled
      })
      const row = await getProfileById(existing.id)
      res.json({ success: true, data: row })
      return
    }

    await createProfile({
      profile_name,
      provider,
      api_base,
      api_key,
      model,
      temperature,
      max_tokens,
      top_p,
      enabled,
      is_default: 1
    })
    const row = await getDefaultProfile()
    res.json({ success: true, data: row })
  } catch (error) {
    console.error('Failed to update AI settings:', error)
    res.status(500).json({ success: false, message: 'Failed to update AI settings' })
  }
})

router.get('/settings/profiles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await listProfiles()
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('Failed to fetch AI profiles:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch AI profiles' })
  }
})

router.post('/settings/profiles', authenticateToken, requireAdmin, logActivity('create', 'ai_provider_settings'), async (req, res) => {
  try {
    const {
      profile_name,
      provider,
      api_base,
      api_key,
      model,
      temperature = 0.7,
      max_tokens = 800,
      top_p = 1.0,
      enabled = true
    } = req.body || {}

    if (!profile_name || !provider || !model) {
      return res.status(400).json({ success: false, message: 'profile_name, provider and model are required' })
    }

    await createProfile({
      profile_name,
      provider,
      api_base,
      api_key,
      model,
      temperature,
      max_tokens,
      top_p,
      enabled,
      is_default: 0
    })

    const rows = await listProfiles()
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('Failed to create AI profile:', error)
    res.status(500).json({ success: false, message: 'Failed to create AI profile' })
  }
})

router.put('/settings/profiles/:id', authenticateToken, requireAdmin, logActivity('update', 'ai_provider_settings'), async (req, res) => {
  try {
    const { id } = req.params
    const {
      profile_name,
      provider,
      api_base,
      api_key,
      model,
      temperature = 0.7,
      max_tokens = 800,
      top_p = 1.0,
      enabled = true
    } = req.body || {}

    if (!profile_name || !provider || !model) {
      return res.status(400).json({ success: false, message: 'profile_name, provider and model are required' })
    }

    await updateProfile(id, {
      profile_name,
      provider,
      api_base,
      api_key,
      model,
      temperature,
      max_tokens,
      top_p,
      enabled
    })

    const row = await getProfileById(id)
    res.json({ success: true, data: row })
  } catch (error) {
    console.error('Failed to update AI profile:', error)
    res.status(500).json({ success: false, message: 'Failed to update AI profile' })
  }
})

router.delete('/settings/profiles/:id', authenticateToken, requireAdmin, logActivity('delete', 'ai_provider_settings'), async (req, res) => {
  try {
    const { id } = req.params
    await db.execute('DELETE FROM ai_provider_settings WHERE id = ?', [id])
    const rows = await listProfiles()
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('Failed to delete AI profile:', error)
    res.status(500).json({ success: false, message: 'Failed to delete AI profile' })
  }
})

router.put('/settings/default/:id', authenticateToken, requireAdmin, logActivity('update', 'ai_provider_settings'), async (req, res) => {
  try {
    const { id } = req.params
    await setDefaultProfile(id)
    const row = await getProfileById(id)
    res.json({ success: true, data: row })
  } catch (error) {
    console.error('Failed to set default AI profile:', error)
    res.status(500).json({ success: false, message: 'Failed to set default AI profile' })
  }
})

router.post('/settings/test', authenticateToken, requireAdmin, logActivity('test', 'ai_provider_settings'), async (req, res) => {
  try {
    const { profileId } = req.body || {}
    const settings = profileId ? await getProfileById(profileId) : await getDefaultProfile()
    if (!settings || settings.enabled === 0) {
      return res.status(400).json({ success: false, message: 'AI settings not configured or disabled' })
    }
    if (!settings.model) {
      return res.status(400).json({ success: false, message: 'AI model is required' })
    }
    if (settings.provider !== 'xinference' && !settings.api_key) {
      return res.status(400).json({ success: false, message: 'API key is required for this provider' })
    }

    const result = await callChatCompletion(settings, 'Say OK.')
    const content = result?.choices?.[0]?.message?.content || ''
    res.json({ success: true, data: { message: content } })
  } catch (error) {
    console.error('Failed to test AI settings:', error)
    res.status(500).json({ success: false, message: error.message || 'Failed to test AI settings' })
  }
})

// Templates
router.get('/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM ai_prompt_templates ORDER BY component_type, template_name')
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('Failed to fetch AI templates:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch AI templates' })
  }
})

router.post('/templates', authenticateToken, requireAdmin, logActivity('create', 'ai_prompt_templates'), async (req, res) => {
  try {
    const {
      component_type,
      template_name,
      template_type,
      prompt_template,
      output_schema,
      is_default = 0,
      enabled = 1
    } = req.body || {}

    if (!component_type || !template_name || !template_type || !prompt_template) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    await db.execute(
      `
        INSERT INTO ai_prompt_templates
          (component_type, template_name, template_type, prompt_template, output_schema, is_default, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        component_type,
        template_name,
        template_type,
        prompt_template,
        output_schema ? JSON.stringify(output_schema) : null,
        is_default ? 1 : 0,
        enabled ? 1 : 0
      ]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to create AI template:', error)
    res.status(500).json({ success: false, message: 'Failed to create AI template' })
  }
})

router.put('/templates/:id', authenticateToken, requireAdmin, logActivity('update', 'ai_prompt_templates'), async (req, res) => {
  try {
    const { id } = req.params
    const {
      component_type,
      template_name,
      template_type,
      prompt_template,
      output_schema,
      is_default,
      enabled
    } = req.body || {}

    await db.execute(
      `
        UPDATE ai_prompt_templates
        SET component_type = ?, template_name = ?, template_type = ?, prompt_template = ?,
            output_schema = ?, is_default = ?, enabled = ?
        WHERE id = ?
      `,
      [
        component_type,
        template_name,
        template_type,
        prompt_template,
        output_schema ? JSON.stringify(output_schema) : null,
        is_default ? 1 : 0,
        enabled ? 1 : 0,
        id
      ]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Failed to update AI template:', error)
    res.status(500).json({ success: false, message: 'Failed to update AI template' })
  }
})

router.delete('/templates/:id', authenticateToken, requireAdmin, logActivity('delete', 'ai_prompt_templates'), async (req, res) => {
  try {
    const { id } = req.params
    await db.execute('DELETE FROM ai_prompt_templates WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete AI template:', error)
    res.status(500).json({ success: false, message: 'Failed to delete AI template' })
  }
})

// Generate
router.post('/generate', authenticateToken, requireEditor, logActivity('generate', 'ai'), async (req, res) => {
  try {
    const { componentType, templateType, userPrompt, currentProps } = req.body || {}

    if (!componentType || !templateType || !userPrompt) {
      return res.status(400).json({ success: false, message: 'componentType, templateType, userPrompt are required' })
    }

    const settings = await getDefaultProfile()
    if (!settings || settings.enabled === 0) {
      return res.status(400).json({ success: false, message: 'AI settings not configured or disabled' })
    }

    const [templates] = await db.execute(
      `
        SELECT * FROM ai_prompt_templates
        WHERE component_type = ? AND template_type = ? AND enabled = 1
        ORDER BY is_default DESC, id ASC
        LIMIT 1
      `,
      [componentType, templateType]
    )

    if (templates.length === 0) {
      return res.status(404).json({ success: false, message: 'No template found for this component' })
    }

    const template = templates[0]
    const prompt = interpolateTemplate(template.prompt_template, {
      component_type: componentType,
      user_prompt: userPrompt,
      current_props: JSON.stringify(currentProps || {})
    })

    const result = await callChatCompletion(settings, prompt)
    const content = result?.choices?.[0]?.message?.content || ''

    const parsed = parseJsonSafe(content.trim())
    if (parsed.ok) {
      return res.json({ success: true, data: { props: parsed.value, raw: content } })
    }

    return res.json({ success: true, data: { text: content } })
  } catch (error) {
    console.error('Failed to generate AI content:', error)
    res.status(500).json({ success: false, message: error.message || 'Failed to generate AI content' })
  }
})

// 多语言 AI 同步/生成：把源语言(中文)内容翻译为指定语言并 upsert 到目标语言。
// body: { type: 'page'|'doc'|'news'|'nav', ids: number[], targetLangs: string[] }
router.post('/sync', authenticateToken, requireEditor, logActivity('sync', 'ai'), async (req, res) => {
  try {
    const { type, ids, targetLangs } = req.body || {}
    if (!['page', 'doc', 'news', 'nav'].includes(type)) {
      return res.status(400).json({ success: false, message: '不支持的同步类型' })
    }
    const idList = (Array.isArray(ids) ? ids : [ids]).map(Number).filter((n) => Number.isInteger(n) && n > 0)
    const langs = (Array.isArray(targetLangs) ? targetLangs : [targetLangs]).filter(Boolean)
    if (idList.length === 0 || langs.length === 0) {
      return res.status(400).json({ success: false, message: '请提供要同步的记录与目标语言' })
    }

    const results = []
    for (const srcId of idList) {
      for (const lang of langs) {
        const out = await syncOne({ type, srcId, lang, userId: req.user?.id || null })
        results.push(out)
      }
    }
    res.json({ success: true, message: 'AI 同步完成', data: results })
  } catch (error) {
    console.error('AI sync failed:', error)
    res.status(500).json({ success: false, message: error.message || 'AI 同步失败' })
  }
})

async function syncOne({ type, srcId, lang, userId }) {
  let source
  if (type === 'page') {
    const [rows] = await db.execute("SELECT * FROM pages WHERE id = ? AND lang = 'zh'", [srcId])
    source = rows[0]
  } else if (type === 'doc') {
    const [rows] = await db.execute("SELECT * FROM docs WHERE id = ? AND lang = 'zh'", [srcId])
    source = rows[0]
  } else if (type === 'news') {
    const [rows] = await db.execute("SELECT * FROM news WHERE id = ? AND lang = 'zh'", [srcId])
    source = rows[0]
  } else if (type === 'nav') {
    const [rows] = await db.execute("SELECT * FROM navigation WHERE id = ? AND lang = 'zh'", [srcId])
    source = rows[0]
  }
  if (!source) throw new Error(`未找到 lang=zh 的 ${type} 记录 id=${srcId}`)

  const translated = type === 'page' ? null : await translateItem({ type, source, targetLang: lang })

  let targetId = null
  if (type === 'page') {
    // template_data 为 MySQL json 列，mysql2 可能已返回对象；兼容字符串与对象
    const rawTd = source.template_data
    const td =
      rawTd && typeof rawTd === 'object'
        ? rawTd
        : (() => { try { return JSON.parse(rawTd) } catch { return { components: [] } } })()
    const srcWithComponents = { ...source, components: (td && td.components) || [], template_data: td || {} }
    const tr = await translateItem({ type, source: srcWithComponents, targetLang: lang })
    const [exist] = await db.execute('SELECT id FROM pages WHERE lang = ? AND slug = ?', [lang, source.slug])
    const payloadTr = {
      title: tr.title, excerpt: source.excerpt || null, meta_title: tr.meta_title || null,
      meta_description: tr.meta_description || null, published: source.published,
      sort_order: source.sort_order || 0, featured_image: source.featured_image || null,
      template_data: JSON.stringify(tr.template_data || {})
    }
    if (exist.length > 0) {
      targetId = exist[0].id
      await db.execute(
        `UPDATE pages SET title=?, excerpt=?, meta_title=?, meta_description=?, template_data=?, updated_at=NOW() WHERE id=?`,
        [payloadTr.title, payloadTr.excerpt, payloadTr.meta_title, payloadTr.meta_description, payloadTr.template_data, targetId]
      )
    } else {
      const [r] = await db.execute(
        `INSERT INTO pages (title, slug, lang, content, excerpt, featured_image, meta_title, meta_description, published, sort_order, template_data, created_by)
         VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [payloadTr.title, source.slug, lang, payloadTr.excerpt, payloadTr.featured_image,
         payloadTr.meta_title, payloadTr.meta_description, payloadTr.published, payloadTr.sort_order,
         payloadTr.template_data, userId]
      )
      targetId = r.insertId
    }
  } else if (type === 'doc') {
    const [exist] = await db.execute('SELECT id FROM docs WHERE lang = ? AND slug = ?', [lang, source.slug])
    let contentFormat = source.content_format || 'markdown'
    let status = source.status || 'draft'
    if (exist.length > 0) {
      targetId = exist[0].id
      await db.execute(
        `UPDATE docs SET title=?, summary=?, content=?, updated_at=NOW() WHERE id=?`,
        [translated.title, translated.summary || null, translated.content || '', targetId]
      )
    } else {
      const [r] = await db.execute(
        `INSERT INTO docs (title, slug, lang, parent_id, sort_order, status, type, content_format, content, summary, created_by, updated_by)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [translated.title, source.slug, lang, source.sort_order || 0, status, source.type || 'doc',
         contentFormat, translated.content || '', translated.summary || null, userId, userId]
      )
      targetId = r.insertId
    }
  } else if (type === 'news') {
    const [exist] = await db.execute('SELECT id FROM news WHERE lang = ? AND source_id = ?', [lang, srcId])
    if (exist.length > 0) {
      targetId = exist[0].id
      await db.execute('UPDATE news SET title=?, summary=? WHERE id=?', [translated.title, translated.summary || '', targetId])
    } else {
      const [r] = await db.execute(
        `INSERT INTO news (title, date, summary, link, image, pinned, published, lang, source_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [translated.title, source.date || null, translated.summary || '', source.link || '', source.image || '',
         source.pinned ? 1 : 0, source.published, lang, srcId]
      )
      targetId = r.insertId
    }
  } else if (type === 'nav') {
    const [exist] = await db.execute('SELECT id FROM navigation WHERE lang = ? AND source_id = ?', [lang, srcId])
    const parentId = source.parent_id ? await mapNavParent(source.parent_id, lang) : null
    if (exist.length > 0) {
      targetId = exist[0].id
      await db.execute('UPDATE navigation SET name=?, url=?, parent_id=?, sort_order=?, is_active=? WHERE id=?',
        [translated.name, source.url, parentId, source.sort_order || 0, source.is_active, targetId])
    } else {
      const [r] = await db.execute(
        `INSERT INTO navigation (name, url, target, parent_id, sort_order, is_active, lang, source_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [translated.name, source.url, source.target || '_self', parentId, source.sort_order || 0, source.is_active, lang, srcId]
      )
      targetId = r.insertId
    }
  }

  return { type, srcId, lang, targetId }
}

async function mapNavParent(zhParentId, lang) {
  const [rows] = await db.execute(
    'SELECT id FROM navigation WHERE lang = ? AND source_id = ? LIMIT 1', [lang, zhParentId]
  )
  return rows.length ? rows[0].id : null
}

// 系统设置 AI 一键转换：把中文的本地化设置键翻译并写为所选语言版本（共享键保持 zh）
const LOCALIZED_SETTINGS = [
  'site_name', 'company_name', 'site_description', 'site_keywords',
  'copyright', 'site_statement', 'footer_layout', 'social_links', 'quick_links',
  'transition_main_title', 'transition_subtitle', 'address', 'footer_social_title'
]
router.post('/sync-settings', authenticateToken, requireEditor, logActivity('sync', 'ai'), async (req, res) => {
  try {
    const targetLangs = (Array.isArray(req.body?.targetLangs) ? req.body.targetLangs : [req.body?.targetLangs]).filter(Boolean)
    if (targetLangs.length === 0) return res.status(400).json({ success: false, message: '请选择目标语言' })

    const ph = LOCALIZED_SETTINGS.map(() => '?').join(',')
    const [rows] = await db.execute(
      `SELECT setting_key, setting_value, setting_type FROM settings WHERE lang = 'zh' AND setting_key IN (${ph})`,
      LOCALIZED_SETTINGS
    )
    const zhMap = {}
    for (const r of rows) {
      let v = r.setting_value
      if (r.setting_type === 'json') { try { v = JSON.parse(v) } catch { v = {} } }
      else if (r.setting_type === 'boolean') v = v === 'true' || v === '1'
      else if (r.setting_type === 'number') v = parseFloat(v)
      zhMap[r.setting_key] = v
    }

    const results = []
    for (const lang of targetLangs) {
      const tr = await translateItem({ type: 'settings', source: zhMap, targetLang: lang })
      const data = (tr && tr.data) || {}
      for (const [key, value] of Object.entries(data)) {
        if (!LOCALIZED_SETTINGS.includes(key)) continue
        const isObj = value && typeof value === 'object'
        const sv = isObj ? JSON.stringify(value) : String(value)
        const st = isObj ? 'json' : typeof value === 'boolean' ? 'boolean' : 'string'
        await db.execute(
          `INSERT INTO settings (setting_key, setting_value, setting_type, lang) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), setting_type = VALUES(setting_type), lang = VALUES(lang)`,
          [key, sv, st, lang]
        )
      }
      results.push({ lang })
    }
    res.json({ success: true, message: '设置已转换到所选语言', data: results })
  } catch (error) {
    console.error('AI sync-settings failed:', error)
    res.status(500).json({ success: false, message: error.message || '设置 AI 转换失败' })
  }
})

// AI 翻译词条（管理员在「AI 接入」配置；lang 为语言表代码，非中文）
router.get('/glossary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM ai_glossary ORDER BY lang, id')
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('获取 AI 词条失败', error)
    res.status(500).json({ success: false, message: '获取 AI 词条失败' })
  }
})

router.post('/glossary', authenticateToken, requireAdmin, logActivity('create', 'ai_glossary'), async (req, res) => {
  try {
    const from_term = String(req.body?.from_term || '').trim()
    const to_term = String(req.body?.to_term || '').trim()
    const lang = String(req.body?.lang || '').trim()
    const is_enabled = req.body?.is_enabled === false ? 0 : 1
    if (!from_term || !to_term || !lang) {
      return res.status(400).json({ success: false, message: 'from_term / to_term / lang 必填' })
    }
    const [r] = await db.execute(
      'INSERT INTO ai_glossary (from_term, to_term, lang, is_enabled) VALUES (?, ?, ?, ?)',
      [from_term, to_term, lang, is_enabled]
    )
    res.status(201).json({ success: true, data: { id: r.insertId, from_term, to_term, lang, is_enabled } })
  } catch (error) {
    console.error('新增 AI 词条失败', error)
    res.status(500).json({ success: false, message: '新增 AI 词条失败' })
  }
})

router.put('/glossary/:id', authenticateToken, requireAdmin, validateId, logActivity('update', 'ai_glossary'), async (req, res) => {
  try {
    const id = Number(req.params.id)
    const from_term = String(req.body?.from_term ?? '').trim()
    const to_term = String(req.body?.to_term ?? '').trim()
    const lang = String(req.body?.lang ?? '').trim()
    const is_enabled = req.body?.is_enabled === false ? 0 : 1
    await db.execute(
      'UPDATE ai_glossary SET from_term = ?, to_term = ?, lang = ?, is_enabled = ? WHERE id = ?',
      [from_term, to_term, lang, is_enabled, id]
    )
    res.json({ success: true })
  } catch (error) {
    console.error('更新 AI 词条失败', error)
    res.status(500).json({ success: false, message: '更新 AI 词条失败' })
  }
})

router.delete('/glossary/:id', authenticateToken, requireAdmin, validateId, logActivity('delete', 'ai_glossary'), async (req, res) => {
  try {
    await db.execute('DELETE FROM ai_glossary WHERE id = ?', [Number(req.params.id)])
    res.json({ success: true })
  } catch (error) {
    console.error('删除 AI 词条失败', error)
    res.status(500).json({ success: false, message: '删除 AI 词条失败' })
  }
})

module.exports = router
