// AI 多语言翻译核心：把源语言(中文)内容翻译为指定语言，并做结构安全合并。
// 规则：仅翻译面向用户的文字字段；URL/图片/图标/颜色/枚举/数字/布尔/日期/排序/id/type/链接一律保留源值。
const { getReadyProfile, callChatCompletion, parseJsonSafe, interpolateTemplate } = require('./aiProvider')
const db = require('../config/database')

// 这些 props 键即使出现在 AI 返回中也一律保留源值（结构/枚举/媒体字段）。
// 注意：不要把用户可见的文字字段（label/title/description/status/date(时间轴)等）放进来——它们应被翻译。
const NON_TEXT = new Set([
  'id', 'key', 'type', 'src', 'srcs', 'srcset', 'image', 'images', 'media', 'icon', 'icons',
  'avatar', 'logo', 'thumbnail', 'cover', 'poster', 'video', 'videos', 'backgroundImage',
  'backgroundColor', 'backgroundColorOption', 'featured_image', 'featuredImage',
  'hover_image', 'hoverImage', 'width', 'height', 'widthOption', 'sort_order', 'target',
  'href', 'buttonLink', 'link', 'url', 'color', 'iconColor', 'iconColorMode', 'cardsPerRow',
  'autoPlay', 'interval', 'alignment', 'align', 'layout', 'imagePosition', 'overlayPosition',
  'shape', 'scrollSpeed', 'theme_id', 'template_id', 'external', 'frame', 'gap', 'ratio',
  'min', 'max', 'highlightHeader', 'highlightFirstRow', 'highlightFirstColumn',
  'recommended', 'pinned', 'required'
])

// 值类型判定：像 URL/路径/锚点/颜色/数字/日期/布尔这类非文字，即便字段名不在黑名单也保留源值。
const isNonTextValue = (s) => {
  if (typeof s !== 'string') return false
  const t = s.trim()
  if (!t) return false
  if (/^(https?:|mailto:|tel:|data:|#|\.{0,2}\/)/i.test(t)) return true // URL/锚点/路径
  if (/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t) || /^(rgba?|hsla?|var)\(/i.test(t)) return true // 颜色
  if (/^(true|false)$/i.test(t)) return true // 布尔
  if (/^-?\d+([.,]\d+)?([%¥$￥]|元)?$/.test(t)) return true // 数字（可带单位）
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(t)) return true // 日期（YYYY-MM-DD）
  return false
}

/** 结构安全合并 props：以源为准；文字字段用 AI 翻译值，非文字（黑名单或值特征）保留源值。 */
function mergeProps(src, ai) {
  const out = {}
  for (const [k, sv] of Object.entries(src || {})) {
    const av = ai && Object.prototype.hasOwnProperty.call(ai, k) ? ai[k] : undefined
    if (NON_TEXT.has(k)) { out[k] = sv; continue }
    if (Array.isArray(sv)) {
      if (Array.isArray(av)) {
        out[k] = av.map((aitem, i) => {
          const srcItem = sv[i]
          if (srcItem && typeof srcItem === 'object' && aitem && typeof aitem === 'object') {
            return mergeProps(srcItem, aitem)
          }
          if (typeof srcItem === 'string' && typeof aitem === 'string' && !isNonTextValue(srcItem)) return aitem
          return srcItem
        })
      } else {
        out[k] = sv
      }
    } else if (sv && typeof sv === 'object') {
      out[k] = av && typeof av === 'object' ? mergeProps(sv, av) : sv
    } else if (typeof sv === 'string') {
      out[k] = typeof av === 'string' && !isNonTextValue(sv) ? av : sv
    } else {
      out[k] = sv
    }
  }
  return out
}

const LANG_NAME = {
  zh: '中文', en: 'English', ja: '日语', ko: '韩语', fr: '法语', de: '德语', es: '西班牙语', ru: '俄语'
}
const targetName = (code) => LANG_NAME[code] || code

const buildSrc = {
  page: (src) => ({
    title: src.title,
    excerpt: src.excerpt || '',
    meta_title: src.meta_title || '',
    meta_description: src.meta_description || '',
    components: src.components || []
  }),
  doc: (src) => ({ title: src.title, summary: src.summary || '', content: src.content || '' }),
  news: (src) => ({ title: src.title, summary: src.summary || '' }),
  nav: (src) => ({ name: src.name || '', url: src.url || '' }),
  // settings：源即为本地化设置键值映射（含可能嵌套的 footer_layout/quick_links/social_links）
  settings: (src) => src || {}
}

// 由 DB 词条（ai_glossary，按目标语言配置）做确定性纠正：先把 `from_term` 替换为 `to_term`。
function applyGlossaryDeep(node, terms = []) {
  if (typeof node === 'string') {
    let out = node
    for (const t of terms) out = out.split(t.from_term).join(t.to_term)
    return out
  }
  if (Array.isArray(node)) return node.map((n) => applyGlossaryDeep(n, terms))
  if (node && typeof node === 'object') {
    const o = {}
    for (const [k, v] of Object.entries(node)) o[k] = applyGlossaryDeep(v, terms)
    return o
  }
  return node
}

// 默认翻译提示词（当 ai_prompt_templates 中 __translate__/translate 模板缺失时的兜底）
const defaultTranslatePrompt =
  '你是企业官网多语言翻译编辑，把下面的中文页面内容翻译成「{{lang_name}}」（语言代码 {{lang}}）。\n' +
  '要求：\n' +
  '1. 术语/专有名词保持一致性{{terms}}' +
  '2. 产品名规则：MGS- 开头的字符串（如 MGS-104、MGS-108、MGS-200）是产品型号，数字和字母原样保留、不得改动；\n' +
  '   「标准版/专业版/基础版」等后缀不用翻译“版”，跟在型号后即可，例如“MGS-104 标准版”应输出为 “MGS-104 Standard”、“MGS-108 专业版”输出为 “MGS-108 Pro”。\n' +
  '3. 符合目标语言的网页写作习惯，不要逐字直译；要简洁、地道、面向用户。导航项/栏目标题尽量用简短英文词，例如“产品中心”译为 “Product” 即可，不要译成 “Product Center”。\n' +
  '4. 严格保持 JSON 结构、键名、字段类型不变；仅翻译面向用户的文字内容。\n' +
  '5. 以下一律原样保留、不得改动：所有 URL、图片路径、图标、颜色、尺寸、枚举值、数字、布尔值、日期、排序、id、type、链接、以及 HTML/Markdown 标记。\n' +
  '只输出合法 JSON，不要 markdown 代码围栏。\n\n' +
  '源数据：\n{{data}}'

const termsSection = (terms) =>
  terms.length
    ? `，必须使用以下固定映射、不得改写或意译：\n${terms.map((t) => `   ${t.from_term} = ${t.to_term}`).join('\n')}\n`
    : '，公司名/商标等专有名词沿用通用译法。\n'

// 翻译提示词：优先取 ai_prompt_templates 中的「AI 多语言翻译」模板（可编辑，含输出结构提示可填），缺失回退默认
async function resolvePrompt(data, lang, terms) {
  let tmpl = null
  let schema = null
  try {
    const [rows] = await db.execute(
      "SELECT prompt_template, output_schema FROM ai_prompt_templates WHERE component_type = '__translate__' AND template_type = 'translate' AND enabled = 1 ORDER BY id ASC LIMIT 1"
    )
    if (rows.length) {
      tmpl = rows[0].prompt_template
      schema = rows[0].output_schema
    }
  } catch (e) {
    tmpl = null
  }
  const text = tmpl && typeof tmpl === 'string' ? tmpl : defaultTranslatePrompt
  const prompt = interpolateTemplate(text, {
    lang_name: targetName(lang),
    lang,
    terms: termsSection(terms),
    data: JSON.stringify(data)
  })
  // 若模板填了「输出结构 JSON」，把它作为输出结构要求附加到提示词（不强制校验，仅作引导）
  if (schema && String(schema).trim()) {
    const s = typeof schema === 'object' ? JSON.stringify(schema) : String(schema)
    return `${prompt}\n\n输出结构要求（保持结构/键名/类型一致）：\n${s}`
  }
  return prompt
}

/**
 * 翻译一个条目。
 * @param {{ type: 'page'|'doc'|'news'|'nav', source: object, targetLang: string }} args
 * @returns 规范化后的目标数据（含 lang）
 */
async function translateItem({ type, source, targetLang }) {
  const profile = await getReadyProfile()
  if (!profile) throw new Error('AI 未配置或未启用，请先在「AI 接入」配置')

  // 词条按目标语言从数据库读取（管理员在「AI 接入」配置）
  const [grows] = await db.execute(
    'SELECT from_term, to_term FROM ai_glossary WHERE lang = ? AND is_enabled = 1',
    [targetLang]
  )
  const terms = grows || []
  const gloss = (node) => applyGlossaryDeep(node, terms)

  const src = buildSrc[type](source)
  const prompt = await resolvePrompt(src, targetLang, terms)
  const result = await callChatCompletion(profile, prompt)
  const content = result?.choices?.[0]?.message?.content || ''
  const parsed = parseJsonSafe(content.trim())
  if (!parsed.ok) {
    throw new Error('AI 返回内容无法解析为 JSON，请重试或手动编辑')
  }
  const ai = parsed.value || {}

  const lang = targetLang
  switch (type) {
    case 'page': {
      const mergedComponents = (source.components || []).map((comp, i) => {
        const aiComp = Array.isArray(ai.components) ? ai.components[i] : undefined
        return {
          id: comp.id,
          type: comp.type,
          props: mergeProps(comp.props || {}, aiComp?.props || {})
        }
      })
      return gloss({
        type,
        lang,
        slug: source.slug,
        title: typeof ai.title === 'string' ? ai.title : source.title,
        excerpt: typeof ai.excerpt === 'string' ? ai.excerpt : source.excerpt || '',
        meta_title: typeof ai.meta_title === 'string' ? ai.meta_title : source.meta_title || '',
        meta_description: typeof ai.meta_description === 'string' ? ai.meta_description : source.meta_description || '',
        template_data: { ...(source.template_data || {}), components: mergedComponents }
      })
    }
    case 'doc':
      return gloss({
        type, lang, slug: source.slug,
        title: typeof ai.title === 'string' ? ai.title : source.title,
        summary: typeof ai.summary === 'string' ? ai.summary : source.summary || '',
        content: typeof ai.content === 'string' ? ai.content : source.content || ''
      })
    case 'news':
      return gloss({
        type, lang,
        title: typeof ai.title === 'string' ? ai.title : source.title,
        summary: typeof ai.summary === 'string' ? ai.summary : source.summary || ''
      })
    case 'nav':
      return gloss({ type, lang, name: typeof ai.name === 'string' ? ai.name : source.name || '' })
    case 'settings':
      return gloss({ type: 'settings', lang, data: mergeProps(source || {}, ai && typeof ai === 'object' ? ai : {}) })
    default:
      throw new Error(`不支持的翻译类型: ${type}`)
  }
}

module.exports = { translateItem, mergeProps }