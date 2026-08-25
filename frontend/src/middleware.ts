import { NextRequest, NextResponse } from 'next/server'

/**
 * 完全动态语言前缀路由（替代 Next 内置 i18n）：
 * - 中文（suffix 空）无前缀，原路径/原路由不动。
 * - 其它已启用语言以 `/<suffix>/...` 前缀访问；
 *   middleware 剥掉前缀、注入 `x-locale` 头，重写到原路径，现有页面按原路径渲染。
 * - 语言列表来自后端 `/api/languages`（Edge 无 mysql，走 fetch + 内存缓存）。
 */

type LangMap = Record<string, string> // suffix(non-empty) -> code

const TTL = 60_000
const g = globalThis as unknown as { __langCache?: { map: LangMap; ts: number } }

const EXCLUDED_PREFIXES = [
  '/api',
  '/_next',
  '/static',
  '/uploads',
  '/system-default',
  '/ck-umd',
  '/favicon.ico'
]

async function getLangs(origin: string): Promise<LangMap> {
  const cached = g.__langCache
  if (cached && Date.now() - cached.ts < TTL) return cached.map
  const fallback: LangMap = {}
  try {
    // Edge 运行时无 mysql；经同域 /api 读取后端（dev 走 rewrite，生产走 nginx 反代），无需额外 env。
    const res = await fetch(new URL('/api/languages', origin).toString(), { cache: 'no-store' })
    if (!res.ok) throw new Error(`languages ${res.status}`)
    const json = await res.json()
    for (const l of json?.data || []) {
      if ((l.is_enabled === 1 || l.is_enabled === true) && l.suffix) fallback[l.suffix] = l.code
    }
  } catch (e) {
    console.warn('[middleware] 读取语言表失败，回退仅中文前缀:', (e as Error)?.message)
  }
  g.__langCache = { map: fallback, ts: Date.now() }
  return fallback
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // 静态/API 资源不处理
  if (EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const segs = pathname.slice(1).split('/')
  const first = segs[0] || ''
  const langs = await getLangs(req.nextUrl.origin)

  let code = 'zh'
  let rest = pathname
  if (first && langs[first]) {
    code = langs[first]
    const tail = segs.slice(1).join('/')
    rest = tail ? `/${tail}` : '/'
  }

  const headers = new Headers(req.headers)
  headers.set('x-locale', code)
  return NextResponse.rewrite(new URL(rest + req.nextUrl.search, req.url), {
    request: { headers }
  })
}

export const config = {
  matcher: ['/((?!api|_next|static|uploads|system-default|ck-umd|favicon.ico).*)']
}