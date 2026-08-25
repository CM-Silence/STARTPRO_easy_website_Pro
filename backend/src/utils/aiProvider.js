// AI 调用共享层：默认提供商解析 + OpenAI 兼容 chat/completions 调用 + JSON 安全解析。
// 供 routes/ai.js 与 utils/aiTranslate.js 复用。
const db = require('../config/database')

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
  const timeoutId = setTimeout(() => controller.abort(), 60000)

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

/** 校验当前是否已配置可用 AI，返回默认 profile（未配置/禁用返回 null） */
const getReadyProfile = async () => {
  const profile = await getDefaultProfile()
  if (!profile || profile.enabled === 0 || !profile.model) return null
  return profile
}

module.exports = {
  getDefaultProfile,
  getReadyProfile,
  callChatCompletion,
  interpolateTemplate,
  parseJsonSafe,
  stripJsonFence
}