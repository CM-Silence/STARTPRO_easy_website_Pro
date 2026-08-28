import React, { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/i18n/LocaleProvider'
import { useTranslation } from 'react-i18next'
import { HoverFX } from '@/components/motion'
import { grabMotionSettings } from '@/styles/motion-presets'
import { newsApi } from '@/utils/api'
import type { News } from '@/types'

interface NewsIndexProps {
  component: {
    props: any
  }
}

/**
 * 新闻列表（行式）：主/副标题（可对齐）+ 搜索 + 分页。
 * 数据：读取当前语言已发布新闻，按「置顶 → 日期」排序；可屏蔽前 N 条。
 */
export const NewsIndexPreview: React.FC<NewsIndexProps> = ({ component }) => {
  const { locale, localize } = useLocale()
  const { t } = useTranslation('common')
  const {
    title,
    subtitle,
    titleAlign = 'left',
    pageSize = 10,
    skipFirst = 0,
    widthOption = 'full',
    backgroundColorOption = 'default'
  } = component.props || {}

  // 统一「动画效果 → 悬浮特效」（所有组件共有）
  const { hover, hoverDuration } = grabMotionSettings(component.props)

  const [items, setItems] = useState<News[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [debounced, setDebounced] = useState('')
  const [loading, setLoading] = useState(false)
  const [jumpInput, setJumpInput] = useState('')

  // 搜索防抖
  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(keyword)
      setPage(1)
    }, 400)
    return () => clearTimeout(id)
  }, [keyword])

  // 拉取当前语言已发布的新闻（排序：置顶 → 日期；屏蔽前 N 条；分页）
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    newsApi
      .index({ page, limit: pageSize, search: debounced || undefined, skip: skipFirst, lang: locale })
      .then((res: any) => {
        if (cancelled) return
        setItems(res?.data || [])
        setTotal(res?.meta?.total || 0)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, debounced, pageSize, skipFirst, locale])

  const totalPages = Math.max(Math.ceil(total / Math.max(pageSize, 1)) || 1, 1)

  // 分页号：页数多时用省略号折叠首尾
  const pageNumbers = useMemo<(number | '…')[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const list: (number | '…')[] = [1]
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    if (start > 2) list.push('…')
    for (let i = start; i <= end; i++) list.push(i)
    if (end < totalPages - 1) list.push('…')
    list.push(totalPages)
    return list
  }, [totalPages, page])
  const alignCls =
    titleAlign === 'center' ? 'text-center' : titleAlign === 'right' ? 'text-right' : 'text-left'

  return (
    <div className={widthOption === 'standard' ? 'max-w-5xl mx-auto' : 'w-full'}>
      <div className={backgroundColorOption === 'transparent' ? 'py-8' : 'bg-color-surface py-8'}>
        {(title || subtitle) && (
          <div className={`px-4 sm:px-6 mb-8 ${alignCls}`}>
            {title && (
              <h2 className="inline-block text-3xl font-bold mb-2 text-text-primary">
                {title}
              </h2>
            )}
            {subtitle && <p className="text-lg text-text-secondary">{subtitle}</p>}
          </div>
        )}

        <div className="px-4 sm:px-6">
          <div className="mb-4">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('news.indexSearch')}
              className="w-full sm:w-80 px-4 py-2.5 border border-color-border rounded-lg bg-color-surface text-text-primary focus:outline-none focus:ring-1 focus:ring-tech-accent"
            />
          </div>

          {loading ? (
            <div className="text-center py-10 text-text-secondary">{t('news.loading')}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-text-secondary">{t('news.empty')}</div>
          ) : (
            <div className="space-y-3">
              {items.map((n) => {
                const raw = n.link ? String(n.link) : ''
                const href = raw && raw.startsWith('/') ? localize(raw) : raw
                const cardInner = (
                  <div className="flex gap-4 sm:gap-5">
                    <div className="flex-shrink-0 w-28 h-24 sm:w-40 sm:h-32 overflow-hidden rounded-lg bg-color-surfaceAlt">
                      {n.image ? (
                        <img src={n.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">📰</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <h3 className="text-lg sm:text-xl font-semibold text-text-primary mb-1 line-clamp-2">{n.title}</h3>
                      {n.summary && <p className="text-text-secondary text-sm line-clamp-2 mb-1">{n.summary}</p>}
                      {n.date && <span className="text-xs text-text-tertiary">{String(n.date).slice(0, 10)}</span>}
                    </div>
                  </div>
                )
                const rowClass = 'rounded-xl border border-color-border p-3 h-full'
                const content = href ? (
                  <a href={href} className="block h-full">{cardInner}</a>
                ) : (
                  <div className="block h-full">{cardInner}</div>
                )
                return (
                  <HoverFX key={n.id} hover={hover} duration={hoverDuration} className={rowClass}>
                    {content}
                  </HoverFX>
                )
              })}
            </div>
          )}

          {total > 0 && (
            <div className="flex items-center mt-6 text-sm">
              <div className="flex-1" />
              <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-full">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-color-border bg-color-surface text-text-secondary hover:bg-color-surfaceAlt hover:text-tech-accent hover:shadow-md disabled:opacity-40 transition-all"
                >‹</button>
                {pageNumbers.map((p, i) =>
                  p === '…' ? (
                    <span key={`e${i}`} className="w-8 inline-flex items-center justify-center select-none text-text-tertiary">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 inline-flex items-center justify-center rounded-lg border transition-all ${
                        p === page
                          ? 'bg-tech-accent text-white border-transparent hover:opacity-90'
                          : 'border-color-border bg-color-surface text-text-secondary hover:bg-color-surfaceAlt hover:text-tech-accent hover:shadow-md'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-color-border bg-color-surface text-text-secondary hover:bg-color-surfaceAlt hover:text-tech-accent hover:shadow-md disabled:opacity-40 transition-all"
                >›</button>
              </div>
              <div className="flex-1 flex justify-end">
                <div className="flex items-center gap-1">
                  <span className="text-text-secondary">{t('news.jump')}</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = Math.min(Math.max(parseInt(jumpInput) || 1, 1), totalPages)
                        setPage(v)
                        setJumpInput('')
                      }
                    }}
                    className="w-14 px-2 py-1 rounded-lg border border-color-border bg-color-surface text-text-primary text-center focus:outline-none focus:ring-1 focus:ring-tech-accent"
                  />
                  <button
                    onClick={() => {
                      const v = Math.min(Math.max(parseInt(jumpInput) || 1, 1), totalPages)
                      setPage(v)
                      setJumpInput('')
                    }}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-tech-accent text-white hover:opacity-90 hover:shadow-md transition-all"
                  >›</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NewsIndexPreview