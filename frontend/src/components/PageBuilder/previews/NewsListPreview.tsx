import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { Newspaper } from 'lucide-react'
import { TemplateComponent } from '@/types/templates'
import { HoverFX } from '@/components/motion'
import { grabMotionSettings } from '@/styles/motion-presets'
import { newsApi } from '@/utils/api'
import { getCachedData, registerSource, unregisterSource, onCacheChanged } from '@/utils/dataCache'
import { useLocale } from '@/i18n/LocaleProvider'
import { useTranslation } from 'react-i18next'
import type { News } from '@/types'

const NewsMedia: React.FC<{ src?: string | null; icon?: string }> = ({ src, icon }) => {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  if (src && !failed) {
    return (
      <img src={src} alt="" className="w-full h-full object-cover news-card-image" onError={() => setFailed(true)} />
    )
  }
  return <div className="w-full h-full flex items-center justify-center text-text-tertiary text-4xl">{icon || '📰'}</div>
}

export const NewsListPreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const { t } = useTranslation('common')
  const { locale, localize } = useLocale()
  const {
    title,
    subtitle,
    articles = [],
    widthOption = 'full',
    backgroundColorOption = 'default',
    cardsPerRow = 3,
    viewMode = 'latest',
    pinFirst = true
  } = component.props

  const containerClass = widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full'
  const componentClass =
    backgroundColorOption === 'transparent'
      ? 'p-8 rounded-lg shadow-sm news-list-preview'
      : 'bg-color-surface p-8 rounded-lg shadow-sm news-list-preview'
  const hover = grabMotionSettings(component.props).hover
  const hoverDuration = grabMotionSettings(component.props).hoverDuration
  // 编辑器画布在 /admin 下：未选择的卡片显示占位；公开页则直接隐藏空卡
  // 用 router.pathname（SSR/客户端一致）判定，避免 window 造成的 hydration 不一致
  const router = useRouter()
  const isEditor = router.pathname.startsWith('/admin')

  // 数据驱动：latest 从新闻中心取 N 条；custom 按所选 newsId 取
  const [items, setItems] = useState<(News | null)[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTick, setRefreshTick] = useState(0)

  // 最新新闻数量：latest 模式按 articles 数量（默认 3）。cacheKey 带上 count 与 pinFirst，
  // 避免页面上多个不同展示数量/排序的实例共享同一条缓存而互相串数据。
  const newsCount = articles && articles.length > 0 ? articles.length : 3
  const newsPinFirst = pinFirst !== false
  const newsCacheKey = `news-latest:${locale}:${newsCount}:${newsPinFirst ? 'p' : 'np'}`

  // 公开页登记「最新新闻」数据源，使全局「刷新」按钮能命中；编辑器画布不缓存不做登记
  useEffect(() => {
    if (isEditor) return
    registerSource({
      key: newsCacheKey,
      entity: 'news',
      lang: locale,
      fetcher: () => newsApi.latest({ limit: newsCount, pinFirst: newsPinFirst, lang: locale }) as any,
      onFresh: () => setRefreshTick((t) => t + 1)
    })
    return () => unregisterSource(newsCacheKey)
  }, [isEditor, locale, newsCacheKey])

  // 最新新闻缓存被后台重新拉取（内容已变）后，重跑取数（getCachedData 会立即返回缓存，不阻塞）
  useEffect(() => {
    if (isEditor) return
    return onCacheChanged(newsCacheKey, () => setRefreshTick((t) => t + 1))
  }, [isEditor, newsCacheKey])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        if (viewMode === 'custom') {
          const ids = (articles || [])
            .map((a: any) => a?.newsId)
            .filter((x: any) => x !== '' && x !== null && x !== undefined)
          if (ids.length === 0) {
            if (!cancelled) setItems(articles.map(() => null))
            return
          }
          const res = (await newsApi.batch(ids, locale)) as any
          if (!cancelled && res.success) {
            const byId = new Map((res.data || []).map((n: any) => [n.id, n]))
            setItems(
              (articles || []).map((a: any) => (a?.newsId ? byId.get(Number(a.newsId)) || null : null))
            )
          } else if (!cancelled) {
            setItems(articles.map(() => null))
          }
        } else {
          const count = newsCount
          // 公开页走条件更新式缓存；后台编辑器画布直接用最新数据（不缓存）
          const res = isEditor
            ? await newsApi.latest({ limit: count, pinFirst: newsPinFirst, lang: locale })
            : await getCachedData({
                key: newsCacheKey,
                entity: 'news',
                lang: locale,
                fetcher: () => newsApi.latest({ limit: count, pinFirst: newsPinFirst, lang: locale })
              })
          if (!cancelled) setItems((res?.success ? res.data : []) || [])
        }
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [viewMode, pinFirst, articles, locale, refreshTick, isEditor])

  const parsedPerRow = Number.isFinite(Number(cardsPerRow)) ? Math.max(1, Math.min(6, Number(cardsPerRow))) : 3
  const gridCols =
    parsedPerRow === 1
      ? 'grid-cols-1'
      : parsedPerRow === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : parsedPerRow === 3
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          : parsedPerRow === 4
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
            : parsedPerRow === 5
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
              : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'

  const slots = useMemo(() => {
    if (viewMode === 'custom') return items
    return loading ? [] : items
  }, [viewMode, items, loading])

  const hasAny = (slots || []).some((n) => !!n)

  return (
    <div className={containerClass}>
      <div className={componentClass}>
        {title && (
          <div className="text-center mb-12 news-list-header">
            <h2 className="text-3xl font-bold mb-4 text-text-primary news-list-title">{title}</h2>
            {subtitle && <p className="text-lg text-text-secondary w-full news-list-subtitle">{subtitle}</p>}
          </div>
        )}

        {loading ? (
          <div className="text-center text-text-secondary py-12">{t('news.loading')}</div>
        ) : viewMode === 'custom' && !hasAny ? (
          <div className="text-center text-text-secondary py-12">{t('news.noSelection')}</div>
        ) : (
          <div className={`grid ${gridCols} gap-8 news-list-grid`}>
            {(slots || []).map((news, index) => {
              if (!news) {
                // 公开页：不显示未选择的空卡；编辑器：显示醒目的虚线占位
                if (!isEditor) return null
                return (
                  <div key={index} className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden news-card flex flex-col items-center justify-center min-h-[220px] text-gray-400 p-4">
                    <Newspaper className="w-6 h-6 mb-1" />
                    <span className="mt-1 text-sm">未选择新闻</span>
                  </div>
                )
              }
              const rawLink = news.link ? String(news.link) : ''
              const href = rawLink && rawLink.startsWith('/') ? localize(rawLink) : rawLink
              const clickable = !!href
              const cardInner = (
                <>
                  <div className="aspect-video bg-color-background overflow-hidden news-card-image-container">
                    <NewsMedia src={news.image} icon="📰" />
                  </div>

                  <div className="p-6 news-card-content">
                    <div className="text-sm text-text-secondary font-medium mb-2 news-card-date">
                      {news.date ? String(news.date).slice(0, 10) : ''}
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-3 line-clamp-2 news-card-title">
                      {news.title}
                    </h3>
                    <p className="text-text-secondary text-sm line-clamp-3 mb-4 news-card-summary">
                      {news.summary || ''}
                    </p>
                    <span className="inline-flex items-center gap-1 font-medium text-sm">
                        <span className="news-card-readmore-text">{t('news.readMore')}</span>
                        <span className="news-card-readmore-arrow">→</span>
                      </span>
                  </div>
                </>
              )
              return (
                <HoverFX
                  key={index}
                  hover={hover}
                  duration={hoverDuration}
                  className="border border-color-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow news-card"
                >
                  {clickable ? (
                    <a href={href} className="block h-full group cursor-pointer">{cardInner}</a>
                  ) : (
                    <div className="block h-full group">{cardInner}</div>
                  )}
                </HoverFX>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}