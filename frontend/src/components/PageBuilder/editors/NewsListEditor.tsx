import React, { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Newspaper, X, Search } from 'lucide-react'
import { AssetPickerTarget } from '../hooks/useAssetPicker'
import { newsApi } from '@/utils/api'
import type { News } from '@/types'
import toast from 'react-hot-toast'

interface NewsListEditorProps {
  articles: any[]
  viewMode?: 'latest' | 'custom'
  onViewModeChange?: (mode: 'latest' | 'custom') => void
  pinFirst?: boolean
  onPinFirstChange?: (v: boolean) => void
  onAdd: () => void
  onChange: (index: number, key: string, value: any) => void
  onBatchChange?: (index: number, patch: Record<string, any>) => void
  onRemove: (index: number) => void
  onMoveUp?: (index: number) => void
  onMoveDown?: (index: number) => void
  openAssetPicker: (target: AssetPickerTarget, currentValue?: string) => void
  cardsPerRow?: number | string
  onCardsPerRowChange?: (value: any) => void
}

const PICKER_LIMIT = 8
const inputCls =
  'w-full px-3 py-2 border border-gray-200 rounded-lg theme-input focus:ring-2 focus:ring-tech-accent focus:border-transparent'

function NewsPickerModal({
  onClose,
  onPick
}: {
  onClose: () => void
  onPick: (news: News) => void
}) {
  const [list, setList] = useState<News[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchList = async (p: number, kw: string) => {
    setIsLoading(true)
    try {
      const response = (await newsApi.list({ page: p, limit: PICKER_LIMIT, search: kw || undefined, published: true })) as any
      if (response.success) {
        setList(response.data || [])
        setTotal(response.meta?.total || 0)
        setPage(p)
      }
    } catch {
      toast.error('获取新闻失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchList(1, '')
  }, [])

  const totalPages = Math.ceil(total / PICKER_LIMIT) || 1

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-base font-semibold text-gray-900">选择新闻</h4>
          <button onClick={onClose} className="p-1 text-gray-600 hover:text-gray-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchList(1, keyword) }}
            placeholder="搜索标题…"
            className={inputCls}
          />
          <button onClick={() => fetchList(1, keyword)} className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-white">
            <Search className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <th className="px-3 py-2 text-left font-medium">ID</th>
                <th className="px-3 py-2 text-left font-medium">标题</th>
                <th className="px-3 py-2 text-left font-medium">日期</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-600">加载中…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-600">暂无新闻</td></tr>
              ) : (
                list.map((n) => (
                  <tr key={n.id} onClick={() => onPick(n)} className="border-b border-gray-200 last:border-0 cursor-pointer hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600 tabular-nums">{n.id}</td>
                    <td className="px-3 py-2 text-gray-900">{n.title}</td>
                    <td className="px-3 py-2 text-gray-600">{n.date ? String(n.date).slice(0, 10) : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-3 text-sm text-gray-600">
          <span>共 {total} 条</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => fetchList(page - 1, keyword)} className="px-3 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40">上一页</button>
            <span className="tabular-nums">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => fetchList(page + 1, keyword)} className="px-3 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40">下一页</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const NewsListEditor: React.FC<NewsListEditorProps> = ({
  articles,
  viewMode = 'latest',
  onViewModeChange,
  pinFirst = true,
  onPinFirstChange,
  onAdd,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  cardsPerRow,
  onCardsPerRowChange
}) => {
  const [pickerIndex, setPickerIndex] = useState<number | null>(null)

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="font-medium text-gray-900">新闻列表</h4>
        <button
          onClick={onAdd}
          className="flex items-center space-x-1 px-3 py-1 text-sm bg-tech-accent text-white rounded-lg hover:bg-tech-secondary transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>新增新闻</span>
        </button>
      </div>

      {/* 显示模式 */}
      <div className="bg-white p-4 space-y-4 mb-4">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-900">显示模式</label>
          <div className="relative">
            <select
              value={viewMode}
              onChange={(e) => onViewModeChange?.(e.target.value as 'latest' | 'custom')}
              className="w-full appearance-none px-3 py-1.5 pr-8 rounded border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-tech-accent"
            >
              <option value="latest">最新</option>
              <option value="custom">自定义</option>
            </select>
            <ChevronDown className="w-4 h-4 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
          </div>
          <p className="text-xs text-gray-600">
            {viewMode === 'latest' ? '自动从新闻中心取最新的 N 条（卡片数=展示数量）' : '手动选择要展示的新闻'}
          </p>
        </div>

        {viewMode === 'latest' && (
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-900">优先显示置顶</span>
            <input
              type="checkbox"
              checked={pinFirst !== false}
              onChange={(e) => onPinFirstChange?.(e.target.checked)}
              className="rounded border-gray-200 text-tech-accent focus:ring-tech-accent"
            />
          </label>
        )}
      </div>

      {onCardsPerRowChange && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">每行卡片数</label>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="1"
              max="6"
              value={parseInt(String(cardsPerRow)) || 3}
              onChange={(e) => onCardsPerRowChange(e.target.value)}
              className="flex-1 h-2 accent-tech-accent rounded-full cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-900 w-8 text-center">
              {parseInt(String(cardsPerRow)) || 3}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(articles || []).map((article: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-gray-900 font-medium truncate">
                {viewMode === 'latest' ? `第 ${index + 1} 条（最新模式）` : `卡片 ${index + 1}`}
              </div>
              <div className="flex items-center gap-0.5">
                {viewMode === 'custom' && (
                  <>
                    <button onClick={() => onMoveUp?.(index)} disabled={index === 0} className="p-1 rounded text-gray-600 hover:text-tech-accent hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed" title="上移">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => onMoveDown?.(index)} disabled={index === (articles || []).length - 1} className="p-1 rounded text-gray-600 hover:text-tech-accent hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed" title="下移">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button onClick={() => onRemove(index)} className="p-1 text-gray-600 hover:text-red-500" title="删除">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {viewMode === 'custom' && (
              <div className="space-y-2">
                <button
                  onClick={() => setPickerIndex(index)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-white hover:text-tech-accent transition-colors"
                >
                  <Newspaper className="w-4 h-4" />
                  {article.newsId ? '更换新闻' : '选择新闻'}
                </button>
                <div className="text-xs text-gray-600">
                  {article.newsId ? `已选新闻 ID：${article.newsId}` : '未选择新闻'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {pickerIndex !== null && (
        <NewsPickerModal
          onClose={() => setPickerIndex(null)}
          onPick={(news) => {
            onChange(pickerIndex, 'newsId', news.id)
            setPickerIndex(null)
          }}
        />
      )}
    </div>
  )
}

export default NewsListEditor