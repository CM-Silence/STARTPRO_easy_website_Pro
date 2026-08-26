// 给页面组件 props 中的「站内链接」补当前语言前缀；中文(suffix='') 时原样返回，不影响现有 UI。
// 采用集中式（数据层）处理，避免逐个修改 preview 渲染组件。
// 判定为站内链接：以单个 / 开头、无空格、且非静态资源/API 路径。

const STATIC_PREFIXES = /^\/(uploads|system-default|_next|api|ck-umd|favicon|images\/)/

const isInternalLink = (v: unknown): v is string =>
  typeof v === 'string' &&
  v.startsWith('/') &&
  !v.startsWith('//') &&
  /^\/[a-zA-Z0-9][^\s]*$/.test(v) &&
  !STATIC_PREFIXES.test(v)

/** 递归处理组件数组的 props，前缀所有站内链接字段；suffix 为空则原样返回。 */
export function applyLinkPrefix(components: unknown, suffix: string): unknown {
  if (!suffix) return components
  if (!Array.isArray(components)) return components

  const withPrefix = (s: string) => (suffix ? `/${suffix}${s}` : s)

  const walk = (node: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(node || {})) {
      if (key === 'props' && val && typeof val === 'object') {
        out[key] = walkProps(val as Record<string, unknown>)
      } else if (Array.isArray(val)) {
        out[key] = val.map((item) =>
          item && typeof item === 'object' ? walk(item as Record<string, unknown>) : item
        )
      } else {
        out[key] = val
      }
    }
    return out
  }

  const walkProps = (props: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(props || {})) {
      if (typeof val === 'string' && isInternalLink(val) && !val.startsWith(`/${suffix}/`)) {
        out[key] = withPrefix(val)
      } else if (typeof val === 'string') {
        // 普通字符串：若为 HTML（rich-text/raw-html 的 content），前缀其中 `<a href>`/`<img src>` 站内链接
        out[key] = prefixHtmlInternalLinks(val, suffix)
      } else if (Array.isArray(val)) {
        out[key] = val.map((item) => {
          if (item && typeof item === 'object') return walk(item as Record<string, unknown>)
          if (typeof item === 'string' && isInternalLink(item) && !item.startsWith(`/${suffix}/`)) {
            return withPrefix(item)
          }
          return item
        })
      } else {
        out[key] = val
      }
    }
    return out
  }

  return (components as Record<string, unknown>[]).map((c) => walk(c))
}

/** 由 locale(code) 推导 URL 前缀：中文 ''，其余即 code（本系统非默认语言 code===suffix）。 */
export function localeToSuffix(locale?: string | null): string {
  return locale && locale !== 'zh' ? locale : ''
}

/** 通用：给一个相对站内路径加当前语言前缀。 */
export function localizePath(rest: string, suffix: string): string {
  if (!rest || !suffix || typeof rest !== 'string') return rest
  if (rest === '/') return `/${suffix}`
  return `/${suffix}${rest.startsWith('/') ? rest : `/${rest}`}`
}

/** 给 HTML 字符串里 `<a href="/…">`/`<img src="/…">` 等站内链接补语言前缀；静态资源/锚点/协议相对保持。 */
export function prefixHtmlInternalLinks(html: string, suffix: string): string {
  if (!suffix || typeof html !== 'string') return html
  return html.replace(/((?:href|src)=")(\/[^"\s]*)/g, (_m, pre, path: string) => {
    if (path.startsWith('//') || STATIC_PREFIXES.test(path) || path.startsWith(`/${suffix}`)) return _m
    if (isInternalLink(path)) return `${pre}/${suffix}${path}`
    return _m
  })
}