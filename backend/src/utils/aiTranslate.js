// AI 多语言翻译核心：把源语言(中文)内容翻译为指定语言，并做结构安全合并。
// 规则：仅翻译面向用户的文字字段；URL/图片/图标/颜色/枚举/数字/布尔/日期/排序/id/type/链接一律保留源值。
const { getReadyProfile, callChatCompletion, parseJsonSafe } = require('./aiProvider')

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

// 既有专有名词/品牌术语一致性：出现在正文里的一律用下表英文，不随语境变换
const GLOSSARY = [
  ['电湃科技', 'Powerbell Technology'],
  ['湃联智能', 'Pailink Intelligence'],
  ['知识库', 'Wiki'],
  ['标准版', 'Standard'],
  ['专业版', 'Pro'],
  ['基础版', 'Basic'],
  ['旗舰版', 'Ultimate'],
  ['测试版', 'Beta']
]

const glossarize = (s) => {
  let out = s
  for (const [zh, en] of GLOSSARY) out = out.split(zh).join(en)
  return out
}

/** 深层遍历，对字符串字段做术语纠正（URL/图片等非文字字段不受影响——术语均为中文词）。 */
function applyGlossaryDeep(node) {
  if (typeof node === 'string') return glossarize(node)
  if (Array.isArray(node)) return node.map(applyGlossaryDeep)
  if (node && typeof node === 'object') {
    const o = {}
    for (const [k, v] of Object.entries(node)) o[k] = applyGlossaryDeep(v)
    return o
  }
  return node
}

const buildPrompt = (type, data, lang) => {
  const name = targetName(lang)
  const common =
    `你是企业官网多语言翻译编辑，把下面的中文页面内容翻译成「${name}」（语言代码 ${lang}）。\n` +
    `要求：\n` +
    `1. 品牌与术语一致性，必须使用下面固定的英文，不得改写或意译：\n` +
    `   电湃科技 = Powerbell Technology；湃联智能 = Pailink Intelligence；知识库 = Wiki。\n` +
    `2. 产品名规则：MGS- 开头的字符串（如 MGS-104、MGS-108、MGS-200）是产品型号，数字和字母原样保留、不得改动；\n` +
    `   「标准版/专业版/基础版」等后缀不用翻译“版”，跟在型号后即可，例如“MGS-104 标准版”应输出为 “MGS-104 Standard”、“MGS-108 专业版”输出为 “MGS-108 Pro”。\n` +
    `3. 符合目标语言的网页写作习惯，不要逐字直译；要简洁、地道、面向用户。导航项/栏目标题尽量用简短英文词，例如“产品中心”译为 “Product” 即可，不要译成 “Product Center”。\n` +
    `4. 严格保持 JSON 结构、键名、字段类型不变；仅翻译面向用户的文字内容。\n` +
    `5. 以下一律原样保留、不得改动：所有 URL、图片路径、图标、颜色、尺寸、枚举值、数字、布尔值、日期、排序、id、type、链接、以及 HTML/Markdown 标记。\n` +
    `只输出合法 JSON，不要 markdown 代码围栏。\n\n` +
    `源数据：\n`
  return `${common}${JSON.stringify(data)}`
}

/**
 * 翻译一个条目。
 * @param {{ type: 'page'|'doc'|'news'|'nav', source: object, targetLang: string }} args
 * @returns 规范化后的目标数据（含 lang）
 */
async function translateItem({ type, source, targetLang }) {
  const profile = await getReadyProfile()
  if (!profile) throw new Error('AI 未配置或未启用，请先在「AI 接入」配置')

  const src = buildSrc[type](source)
  const prompt = buildPrompt(type, src, targetLang)
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
      return applyGlossaryDeep({
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
      return applyGlossaryDeep({
        type, lang, slug: source.slug,
        title: typeof ai.title === 'string' ? ai.title : source.title,
        summary: typeof ai.summary === 'string' ? ai.summary : source.summary || '',
        content: typeof ai.content === 'string' ? ai.content : source.content || ''
      })
    case 'news':
      return applyGlossaryDeep({
        type, lang,
        title: typeof ai.title === 'string' ? ai.title : source.title,
        summary: typeof ai.summary === 'string' ? ai.summary : source.summary || ''
      })
    case 'nav':
      return applyGlossaryDeep({ type, lang, name: typeof ai.name === 'string' ? ai.name : source.name || '' })
    case 'settings':
      return applyGlossaryDeep({ type: 'settings', lang, data: mergeProps(source || {}, ai && typeof ai === 'object' ? ai : {}) })
    default:
      throw new Error(`不支持的翻译类型: ${type}`)
  }
}

module.exports = { translateItem, mergeProps }