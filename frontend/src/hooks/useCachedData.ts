import { useEffect, useState } from 'react'
import {
  getCachedData,
  registerSource,
  unregisterSource,
  onCacheChanged,
  onStaleChange,
  readCacheKey,
  type ContentStatus
} from '@/utils/dataCache'

interface UseCachedDataOptions<T> {
  /** 缓存键，如 navigation:zh / news-latest:zh */
  key: string
  /** 内容版本接口中对应的实体名 */
  entity: keyof ContentStatus
  lang: string
  fetcher: () => Promise<T>
}

/**
 * 接入「条件更新式缓存 + 弱网回退」的取数 hook。
 * - 挂载时经 getCachedData 取数；
 * - 订阅该缓存键变更（刷新按钮全量重拉后自动更新本地 state）；
 * - 订阅全局弱网标记，把 isStale 暴露给上层/Banner。
 */
export function useCachedData<T>({ key, entity, lang, fetcher }: UseCachedDataOptions<T>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    // 登记到数据源注册表，使「刷新按钮」能命中本数据源强制重拉
    registerSource({ key, entity, lang, fetcher })

    getCachedData<T>({ key, entity, lang, fetcher })
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setIsLoading(false)
          console.error('[dataCache] 获取数据失败', err)
        }
      })

    // 全局刷新后缓存被覆盖 → 直接读取最新缓存更新本地 state
    const unsubCache = onCacheChanged(key, (entry) => {
      if (!cancelled) {
        setData(entry.data as T)
        setIsLoading(false)
      }
    })
    const unsubStale = onStaleChange((value) => {
      if (!cancelled) {
        setIsStale(value)
        // 弱网标记清除（网络恢复刷新成功）时，如尚未加载过则读一次缓存兜底
        if (!value && !readCacheKey<T>(key)) {
          void getCachedData<T>({ key, entity, lang, fetcher }).then((res) => {
            if (!cancelled) setData(res)
          })
        }
      }
    })

    return () => {
      cancelled = true
      unsubCache()
      unsubStale()
      unregisterSource(key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, entity, lang])

  return { data, isLoading, isStale }
}