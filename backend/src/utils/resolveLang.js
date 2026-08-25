// 多语言辅助：解析并校验 lang 参数。
// 语言代码不再硬编码为 zh/en，允许任意可写入 URL 的代码（由 languages 表驱动），
// 缺省/非法值回退到默认语言 'zh'。
const SAFE_LANG = /^[a-z0-9][a-z0-9_-]{0,19}$/
const DEFAULT_LOCALE = 'zh'

const resolveLang = (value) =>
  typeof value === 'string' && SAFE_LANG.test(value) ? value : DEFAULT_LOCALE

module.exports = { resolveLang, DEFAULT_LOCALE }