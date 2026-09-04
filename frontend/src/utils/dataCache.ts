// 界面信息浏览器缓存 —— 条件更新式缓存 + 弱网回退。
//
// 设计：
// 1. 数据在 localStorage 按 cacheKey 持久化（如 navigation:zh / settings:zh / news-latest:zh）。
// 2. 每次取数先看缓存：
//    - 无缓存 → 全量拉取，并尽力记录一份「内容版本」作为基线，写缓存后返回；
//    - 有缓存 → 先调轻量的 /api/content/status 比对版本：
//        版本一致 → 直接用缓存，不再发全量请求；
//        版本落后 → 重新拉取并刷新缓存；
//    - 连 /api/content/status 都请求失败（弱网）→ 用旧缓存，并标记「弱网」，
//        由全局 StaleDataBanner 提示「拉取最新数据失败，请尝试刷新」。
// 3. 提供数据源注册表 + refreshAllSources()：「刷新」按钮据此强制绕过缓存全量重拉。

export interface ContentStatus {
  navigation?: string | null
  settings?: string | null
  news?: string | null
  languages?: string | null
}

export interface CacheEntry<T = unknown> {
  data: T
  version: string | null
  cachedAt: number
}

interface Source<T = unknown> {
  key: string
  entity: keyof ContentStatus
  lang: string
  fetcher: () => Promise<T>
  /** 刷新成功后触发的回调（供自管 state 的消费点，如 SettingsContext。可选） */
  onFresh?: () => void
}

const STORE_KEY = 'pailink-ui-cache'

type Store = Record<string, CacheEntry>

// ---------- 持久化 ----------

const isBrowser = typeof window !== 'undefined'

function readStore(): Store {
  if (!isBrowser) return {}
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Store) {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch (e) {
    // QuotaExceeded / 隐私模式等：静默降级为不持久化，不影响主流程
    console.warn('[dataCache] 写入缓存失败', e)
  }
}

export function readCacheKey<T>(key: string): CacheEntry<T> | null {
  return (readStore()[key] as CacheEntry<T> | undefined) ?? null
}

function writeCacheKey<T>(key: string, entry: CacheEntry<T>) {
  const store = readStore()
  store[key] = entry as unknown as CacheEntry
  writeStore(store)
  emitCacheChanged(key, entry)
}

// ---------- 内容版本接口 ----------

function getContentStatus(lang: string): Promise<ContentStatus> {
  // 用 fetch 而非 api：该接口公开、无鉴权；弱网失败时不触发全局错误 toast（交给 StaleDataBanner 提示）
  return fetch(`/api/content/status?lang=${encodeURIComponent(lang)}`)
    .then((res) => {
      if (!res.ok) throw new Error(`内容状态请求失败: ${res.status}`)
      return res.json()
    })
    .then((json) => (json && json.data) || {})
}

// ---------- 核心取数 ----------

const inFlight = new Map<string, Promise<unknown>>()
const revalidating = new Set<string>()

interface GetCachedDataOptions<T> {
  key: string
  entity: keyof ContentStatus
  lang: string
  fetcher: () => Promise<T>
}

/**
 * 后台校验版本（stale-while-revalidate）：
 * 有缓存时先立即返回缓存渲染，本函数在后台比对 /content/status；
 * 内容未变则不动；已变则重拉全量并刷新缓存（写缓存会触发 cache-changed，消费点据此自动上屏新数据）。
 * 网络失败标记弱网（给出「拉取最新数据失败」横幅）；永不抛出，避免未处理 Promise。
 */
function backgroundRevalidate<T>(options: GetCachedDataOptions<T>, initialVersion: string | null) {
  const { key, entity, lang, fetcher } = options
  if (revalidating.has(key)) return
  revalidating.add(key)

  void (async () => {
    let status: ContentStatus | null
    try {
      status = await getContentStatus(lang)
    } catch {
      markStale()
      return
    }
    // 内容未变：无需重拉（不发全量请求）
    if (!!status[entity] && initialVersion === status[entity]) return
    try {
      const data = await fetcher()
      writeCacheKey(key, { data, version: status[entity] ?? null, cachedAt: Date.now() })
    } catch {
      markStale()
    }
  })().finally(() => {
    revalidating.delete(key)
  })
}

export function getCachedData<T>(options: GetCachedDataOptions<T>): Promise<T> {
  const { key, entity, lang, fetcher } = options

  const entry = readCacheKey<T>(key)

  // 有缓存：立即返回缓存（弱网时不被版本校验拖慢），后台再校验+必要时重拉刷新缓存。
  if (entry) {
    backgroundRevalidate(options, entry.version)
    return Promise.resolve(entry.data)
  }

  // 无缓存：必须等网络取数（此时无兜底可用）；并发去重，避免同 key 重复拉取。
  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  const promise = (async (): Promise<T> => {
    const data = await fetcher()
    const status = await getContentStatus(lang).catch(() => null)
    writeCacheKey(key, { data, version: status?.[entity] ?? null, cachedAt: Date.now() })
    return data
  })()

  inFlight.set(key, promise)
  promise.finally(() => {
    inFlight.delete(key)
  })
  return promise
}

// ---------- 弱网状态 store ----------

let stale = false
const staleListeners = new Set<(value: boolean) => void>()

export function markStale() {
  if (stale) return
  stale = true
  staleListeners.forEach((l) => l(true))
}

export function clearStale() {
  if (!stale) return
  stale = false
  staleListeners.forEach((l) => l(false))
}

export function isStale() {
  return stale
}

export function onStaleChange(listener: (value: boolean) => void): () => void {
  staleListeners.add(listener)
  return () => {
    staleListeners.delete(listener)
  }
}

// ---------- 缓存变更事件（供「刷新」后通知消费点） ----------

const cacheListeners = new Map<string, Set<(entry: CacheEntry) => void>>()

function emitCacheChanged(key: string, entry: CacheEntry) {
  const listeners = cacheListeners.get(key)
  if (listeners) listeners.forEach((l) => l(entry))
}

export function onCacheChanged(key: string, listener: (entry: CacheEntry) => void): () => void {
  if (!cacheListeners.has(key)) cacheListeners.set(key, new Set())
  cacheListeners.get(key)!.add(listener)
  return () => {
    cacheListeners.get(key)?.delete(listener)
  }
}

// ---------- 数据源注册表 + 全局刷新 ----------

const sourceMap = new Map<string, Source>()

export function registerSource<T>(source: Source<T>) {
  sourceMap.set(source.key, source as unknown as Source)
}

export function unregisterSource(key: string) {
  sourceMap.delete(key)
}

/** 遍历注册表，强制绕过缓存全量重拉并刷新缓存版本；全部成功则清除弱网标记。 */
export async function refreshAllSources(): Promise<boolean> {
  const sources = Array.from(sourceMap.values())
  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        const fresh = await source.fetcher()
        const prev = readCacheKey(source.key)
        const status = await getContentStatus(source.lang).catch(() => null)
        writeCacheKey(source.key, {
          data: fresh,
          version: status?.[source.entity] ?? prev?.version ?? null,
          cachedAt: Date.now()
        })
        if (typeof source.onFresh === 'function') source.onFresh()
        return true
      } catch {
        return false
      }
    })
  )
  const ok = results.length > 0 && results.every(Boolean)
  if (ok) clearStale()
  return ok
}

/** 清除缓存（供后台保存后手动调用，或调试用）。 */
export function clearCache() {
  if (!isBrowser) return
  try {
    window.localStorage.removeItem(STORE_KEY)
  } catch {
    // ignore
  }
}