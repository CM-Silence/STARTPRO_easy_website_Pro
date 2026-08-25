import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/router'
import i18n, { LOCALES, type Locale } from './index'
import { languagesApi } from '@/utils/api'

interface EnabledLang {
  id: number
  display_name: string
  suffix: string
  code: string
}

interface LocaleContextValue {
  locale: Locale
  /** 当前语言的 URL 前缀（中文为空字符串） */
  suffix: string
  /** 给站内相对链接加当前语言前缀；中文下原样返回 */
  localize: (rest: string) => string
  languages: EnabledLang[]
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'zh',
  suffix: '',
  localize: (r: string) => r,
  languages: []
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [languages, setLanguages] = useState<EnabledLang[]>([])

  // 读取已启用语言（suffix -> code），用于从 URL 推导当前语言
  useEffect(() => {
    let mounted = true
    languagesApi
      .getEnabled()
      .then((res) => {
        if (mounted && res.success) setLanguages(res.data || [])
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  const path = useMemo(() => {
    if (typeof window !== 'undefined') return window.location.pathname
    return router.asPath
  }, [router.asPath])

  const { locale, suffix } = useMemo(() => {
    const suffixMap: Record<string, string> = {}
    for (const l of languages) if (l.suffix) suffixMap[l.suffix] = l.code
    const segs = path.split('/')
    const first = segs[1] || ''
    if (first && suffixMap[first] && (LOCALES as readonly string[]).includes(suffixMap[first])) {
      return { locale: suffixMap[first] as Locale, suffix: first }
    }
    return { locale: 'zh' as Locale, suffix: '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, languages])

  const localize = useMemo(() => (rest: string) => {
    if (!rest || typeof rest !== 'string' || !suffix) return rest
    // 绝对 URL / 锚点 / 协议相对(//) / 静态资源：保持原样，不加语言前缀
    if (/^(https?:|mailto:|tel:|data:|#|\/\/)/i.test(rest)) return rest
    if (/^\/(uploads|system-default|_next|api|ck-umd|favicon)/.test(rest)) return rest
    if (rest === '/') return `/${suffix}`
    const p = rest.startsWith('/') ? rest : `/${rest}`
    if (p.startsWith(`/${suffix}/`)) return p // 已带当前语言前缀
    return `/${suffix}${p}`
  }, [suffix])

  // 同步 i18next 实例语言（切换界面文案）
  useEffect(() => {
    if (i18n.language !== locale && i18n.hasResourceBundle(locale, 'common')) {
      i18n.changeLanguage(locale)
    }
  }, [locale])

  const value = useMemo(() => ({ locale, suffix, localize, languages }), [locale, suffix, localize, languages])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext)
}