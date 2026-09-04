/* Pailink 静态图片缓存 Service Worker
 *
 * 目标：在网络不稳/离线时，让「之前加载过的图片」从浏览器缓存直接显示。
 * 策略：stale-while-revalidate（陈旧即时返回 + 后台再验证）。
 *   - 命中缓存 → 立即返回缓存（弱网/离线可显示）；
 *   - 同时后台请求一次最新资源并更新缓存（替换图片最终会静默刷新，不像 immutable 那样 30 天陈旧）；
 *   - 未命中缓存 → 走网络，成功后写入缓存。
 * 边界：
 *   - 只处理同源 GET；页面导航（navigate）与 /_next 构建产物一律不缓存，避免服务到旧代码；
 *   - 工作只针对图片类请求（<img>、background、/uploads、/system-default、常见图片扩展名）。
 */

const CACHE_VERSION = 'v2'
const CACHE_NAME = `pailink-static-${CACHE_VERSION}`

// 常见图片扩展名（即使非 <img> 标签、且不在 /uploads 下也会被缓存）
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|svg|ico|bmp|avif)$/i

self.addEventListener('install', () => {
  // 立即激活新版本，尽快接管页面
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// 只缓存真正的图片：<img>/背景图（destination='image'），或常见图片扩展名。
// 不按 /uploads 前缀整体缓存——该目录下可能有视频/PDF 等，浏览器会对它们发 Range 请求，
// 返回 206 分段响应，Cache API 不支持 206 会抛错。
const isCacheableImage = (url, request) =>
  request.destination === 'image' || IMAGE_EXT_RE.test(url.pathname)

const staleWhileRevalidate = async (event, request) => {
  let cache = null
  let cached = null
  let hasCached = false
  try {
    cache = await caches.open(CACHE_NAME)
    cached = await cache.match(request)
    hasCached = !!cached
  } catch {
    // 缓存读取异常时忽略，直接走网络
  }

  const networkPromise = fetch(request)
    .then(async (response) => {
      try {
        // 仅缓存完整的 200 响应；206 分段响应（Range/渐进式）无法存入缓存，跳过而不报错；
        // 错误/404 则清掉旧缓存，避免一直展示已删除的图。
        const status = response ? response.status : 0
        if (cache && response && status === 200) {
          await cache.put(request, response.clone())
        } else if (cache && response && hasCached && (status === 404 || status >= 400)) {
          await cache.delete(request)
        }
      } catch {
        // 缓存写失败（配额/配额类型等）不影响把网络响应返回给页面
      }
      return response
    })
    .catch(() => {
      // 完全离线：有缓存用缓存；无缓存给一个兜底响应，避免 respondWith(undefined) 再抛错。
      if (hasCached) return cached
      return new Response('', { status: 404, statusText: 'offline' })
    })

  // 从缓存即时返回时，用 waitUntil 保持 SW 存活以完成后台缓存更新
  event.waitUntil(networkPromise.then(() => undefined).catch(() => undefined))

  if (hasCached) return cached
  return await networkPromise
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // 只处理同源；跨域（如 cdn）与页面导航不干预
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') return

  if (!isCacheableImage(url, request)) return

  event.respondWith(staleWhileRevalidate(event, request))
})