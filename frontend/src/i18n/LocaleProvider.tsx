import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/router'
import i18n, { type Locale } from './index'
import { languagesApi } from '@/utils/api'
import { getCachedData, onCacheChanged, registerSource, unregisterSource } from '@/utils/dataCache'

interface EnabledLang {
  id: number
  display_name: string
  suffix: string
  code: string
  is_enabled?: number
}

interface LocaleContextValue {
  locale: Locale
  /** 当前语言的 URL 前缀（中文为空字符串） */
  suffix: string
  /** 给站内相对链接加当前语言前缀；中文下原样返回 */
  localize: (rest: string) => string
  /** 已启用语言列表（缓存驱动，供语言切换器） */
  languages: EnabledLang[]
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'zh',
  suffix: '',
  localize: (r: string) => r,
  languages: []
})

const CACHE_KEY = 'languages'

export function LocaleProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [allLanguages, setAllLanguages] = useState<EnabledLang[]>([])

  // 已启用语言：供切换器与从 URL 推导当前语言
  const enabledLanguages = useMemo(() => allLanguages.filter((l) => l.is_enabled === 1), [allLanguages])

  // 读取并缓存语言表（用 getAll 以保留 is_enabled，供下面「拦截已禁用语言」判断）。
  // 有缓存立即出缓存渲染，后台再校验版本；内容变化/刷新按钮触发后经 onCacheChanged 自动更新。
  useEffect(() => {
    let mounted = true

    registerSource({
      key: CACHE_KEY,
      entity: 'languages',
      lang: 'zh',
      fetcher: () => languagesApi.getAll()
    })

    const load = () => {
      getCachedData({
        key: CACHE_KEY,
        entity: 'languages',
        lang: 'zh',
        fetcher: () => languagesApi.getAll()
      })
        .then((res) => {
          if (mounted && res.success) setAllLanguages(res.data || [])
        })
        .catch(() => {})
    }
    load()

    const unsub = onCacheChanged(CACHE_KEY, (entry) => {
      const d = entry.data as { success?: boolean; data?: EnabledLang[] }
      if (d && d.success) setAllLanguages(d.data || [])
    })

    return () => {
      mounted = false
      unsub()
      unregisterSource(CACHE_KEY)
    }
  }, [])

  const path = useMemo(() => {
    if (typeof window !== 'undefined') return window.location.pathname
    return router.asPath
  }, [router.asPath])

  const { locale, suffix } = useMemo(() => {
    const suffixMap: Record<string, string> = {}
    for (const l of enabledLanguages) if (l.suffix) suffixMap[l.suffix] = l.code
    const segs = path.split('/')
    const first = segs[1] || ''
    if (first && suffixMap[first]) {
      return { locale: suffixMap[first] as Locale, suffix: first }
    }
    return { locale: 'zh' as Locale, suffix: '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabledLanguages])

  // 拦截已禁用语言的界面路由：当 URL 首段是一个「已知语言后缀但已被禁用」时，
  // 跳到去掉该前缀的中文路径，避免有人经由旧缓存停留在已禁用语言的界面。
  // 只依据已经确认（缓存/后台刷新到）的语言表触发；离线无法确认时不动，交给弱网横幅提示。
  useEffect(() => {
    if (!allLanguages.length) return
    const segs = path.split('/')
    const first = segs[1] || ''
    if (!first) return
    const known = allLanguages.find((l) => l.suffix === first)
    if (known && known.is_enabled !== 1) {
      const rest = segs.slice(2).join('/')
      const to = rest ? `/${rest}` : '/'
      if (to !== path) router.replace(to)
    }
  }, [path, allLanguages, router])

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

  const value = useMemo(
    () => ({ locale, suffix, localize, languages: enabledLanguages }),
    [locale, suffix, localize, enabledLanguages]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext)
}