import React, { useCallback, useEffect, useMemo, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Plus, Pencil, Trash2, X, RefreshCw, Save, Image as ImageIcon, Sparkles } from 'lucide-react'
import { newsApi } from '@/utils/api'
import AssetPickerModal from '@/components/AssetPickerModal'
import LanguageSelect from '@/components/admin/LanguageSelect'
import AiSyncModal from '@/components/admin/AiSyncModal'
import SyncStatusBadge from '@/components/admin/SyncStatusBadge'
import type { News } from '@/types'
import toast from 'react-hot-toast'

const LIMIT = 10

// 统一日期转成 YYYY-MM-DD（兼容字符串 / Date 对象 / 空）
const toYMD = (v: any): string => {
  if (!v) return ''
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  }
  const s = String(v)
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''
}

interface NewsForm {
  title: string
  date: string
  summary: string
  link: string
  image: string
  pinned: boolean
  published: boolean
  lang: string
}

const emptyForm = (): NewsForm => ({ title: '', date: '', summary: '', link: '', image: '', pinned: false, published: true, lang: 'zh' })

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-tech-accent'
const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

export default function AdminNewsPage() {
  const [list, setList] = useState<News[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [sort, setSort] = useState<'created' | 'date_asc' | 'date_desc'>('created')
  const [lang, setLang] = useState('zh')
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [assetOpen, setAssetOpen] = useState(false)
  const [form, setForm] = useState<NewsForm>(emptyForm())
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncIds, setSyncIds] = useState<string[]>([])

  const toggleSelect = (id: string | number) =>
    setSelectedIds((prev) => {
      const s = String(id)
      return prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    })
  const toggleSelectAll = () =>
    setSelectedIds((prev) => (prev.length === list.length ? [] : list.map((n) => String(n.id))))
  const clearSelection = () => setSelectedIds([])

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`确定删除选中的 ${selectedIds.length} 条新闻？此操作无法撤销。`)) return
    for (const id of selectedIds) {
      try { await newsApi.delete(Number(id)) } catch { /* 逐条容错 */ }
    }
    clearSelection()
    fetchList({ page: 1 })
  }

  const totalPages = useMemo(() => Math.ceil(total / LIMIT) || 1, [total])

  const fetchList = useCallback(
    async (opts?: { page?: number; search?: string }) => {
      setIsLoading(true)
      try {
        const p = opts?.page ?? page
        const response = await newsApi.list({
          page: p,
          limit: LIMIT,
          sort,
          lang,
          search: opts?.search !== undefined ? opts.search : (opts?.page !== undefined ? keyword : undefined)
        })
        if (response.success) {
          setList((response as any).data || [])
          setTotal((response as any).meta?.total || 0)
          setPage(p)
        } else {
          toast.error(response.message || '获取新闻失败')
        }
      } catch {
        toast.error('获取新闻失败')
      } finally {
        setIsLoading(false)
      }
    },
    [page, keyword, sort, lang]
  )

  useEffect(() => {
    fetchList({})
  }, [fetchList])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (n: News) => {
    setEditingId(n.id)
    setForm({
      title: n.title || '',
      date: toYMD(n.date),
      summary: n.summary || '',
      link: n.link || '',
      image: n.image || '',
      pinned: !!n.pinned,
      published: n.published !== false && n.published !== 0,
      lang: (n as any).lang || 'zh'
    })
    setModalOpen(true)
  }

  const handleDelete = async (n: News) => {
    if (!window.confirm(`确认删除新闻「${n.title}」？`)) return
    try {
      const response = await newsApi.delete(n.id)
      if (response.success) {
        toast.success('删除成功')
        fetchList({ page: list.length === 1 && page > 1 ? page - 1 : page })
      } else {
        toast.error(response.message || '删除失败')
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('请填写标题')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        date: toYMD(form.date) || undefined,
        summary: form.summary,
        link: form.link,
        image: form.image,
        pinned: form.pinned,
        published: form.published,
        lang: form.lang
      }
      const response = editingId
        ? await newsApi.update(editingId, payload)
        : await newsApi.create(payload)
      if (response.success) {
        toast.success(editingId ? '更新成功' : '创建成功')
        setModalOpen(false)
        fetchList({ page })
      } else {
        toast.error(response.message || '保存失败')
      }
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="新闻中心">
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchList({ page: 1, search: keyword }) } }}
              placeholder="搜索标题 / 摘要"
              className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 text-sm focus:ring-2 focus:ring-tech-accent focus:border-transparent"
            />
          </div>
          <LanguageSelect
            value={lang}
            includeDisabled
            onChange={(code) => { setLang(code); setPage(1) }}
            className="border border-gray-300 rounded-lg bg-white text-gray-900 text-sm px-3 py-2 min-w-[120px]"
          />
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as 'created' | 'date_asc' | 'date_desc'); setPage(1) }}
            className="border border-gray-300 rounded-lg bg-white text-gray-900 text-sm px-3 py-2"
          >
            <option value="created">创建时间</option>
            <option value="date_asc">日期正序</option>
            <option value="date_desc">日期倒序</option>
          </select>
          <button
            onClick={() => fetchList({ page: 1, search: keyword })}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-tech-accent text-white hover:bg-tech-secondary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            搜索
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建新闻
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 dark:bg-violet-900/20 px-4 py-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">已选 {selectedIds.length} 项</span>
          {lang === 'zh' && (
            <button
              onClick={() => { setSyncIds(selectedIds); setSyncOpen(true); }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
            >
              <Sparkles className="w-4 h-4 mr-1" />批量 AI 同步
            </button>
          )}
          <button onClick={handleBatchDelete} className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors">
            <Trash2 className="w-4 h-4 mr-1" />批量删除
          </button>
          <button onClick={clearSelection} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">取消选择</button>
        </div>
      )}
      <AiSyncModal open={syncOpen} onClose={() => setSyncOpen(false)} type="news" ids={syncIds} onDone={() => { clearSelection(); fetchList({ page: 1 }); }} />
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">
                  <input type="checkbox" checked={list.length > 0 && selectedIds.length === list.length} onChange={toggleSelectAll} className="rounded border-gray-300" />
                </th>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium">日期</th>
                <th className="px-4 py-3 font-medium">摘要</th>
                <th className="px-4 py-3 font-medium">图片</th>
                <th className="px-4 py-3 font-medium">置顶</th>
                <th className="px-4 py-3 font-medium">发布</th>
                {lang === 'zh' && <th className="px-4 py-3 font-medium">同步状态</th>}
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={lang === 'zh' ? 10 : 9} className="px-4 py-8 text-center text-gray-500">加载中…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={lang === 'zh' ? 10 : 9} className="px-4 py-8 text-center text-gray-500">暂无新闻</td></tr>
              ) : (
                list.map((n) => (
                  <tr key={n.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.includes(String(n.id))} onChange={() => toggleSelect(String(n.id))} className="rounded border-gray-300" />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{n.id}</td>
                    <td className="px-4 py-3 text-gray-900 max-w-[260px] truncate">{n.title}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{toYMD(n.date) || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[220px] truncate">{n.summary || '—'}</td>
                    <td className="px-4 py-3">{n.image ? <img src={n.image} alt="" className="h-8 w-14 object-cover rounded" /> : '—'}</td>
                    <td className="px-4 py-3">
                      <input type="checkbox" readOnly checked={!!n.pinned} className="rounded border-gray-300 text-tech-accent pointer-events-none" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="checkbox" readOnly checked={n.published !== false && n.published !== 0} className="rounded border-gray-300 text-tech-accent pointer-events-none" />
                    </td>
                    {lang === 'zh' && (
                      <td className="px-4 py-3"><SyncStatusBadge syncStatus={(n as any).syncStatus} /></td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {lang === 'zh' && (
                          <button onClick={() => { setSyncIds([String(n.id)]); setSyncOpen(true); }} className="p-1.5 rounded hover:bg-gray-100 text-violet-600" title="AI 同步">
                            <Sparkles className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => openEdit(n)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-tech-accent" title="编辑">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(n)} className="p-1.5 rounded hover:bg-gray-100 text-red-500" title="删除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
          <span>共 {total} 条</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => fetchList({ page: page - 1 })}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <span className="tabular-nums">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => fetchList({ page: page + 1 })}
              className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editingId ? '编辑新闻' : '新建新闻'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-500 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelCls}>标题 *</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="新闻标题" />
              </div>
              <div>
                <label className={labelCls}>语言</label>
                <LanguageSelect
                  value={form.lang}
                  disabled={!!editingId}
                  onChange={(code) => setForm({ ...form, lang: code })}
                  className={inputCls}
                />
                {editingId && <p className="text-xs text-gray-400 mt-1">已有内容的语言不可修改</p>}
              </div>
              <div>
                <label className={labelCls}>日期</label>
                <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>摘要</label>
                <textarea rows={3} className={inputCls} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="新闻摘要" />
              </div>
              <div>
                <label className={labelCls}>链接</label>
                <input className={inputCls} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="支持相对或绝对路径" />
              </div>
              <div>
                <label className={labelCls}>图片 URL</label>
                <div className="relative">
                  <input className={`${inputCls} pr-10`} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://… 或 /uploads/…" />
                  <button type="button" onClick={() => setAssetOpen(true)} title="选择素材" className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-tech-accent">
                    <ImageIcon className="w-4 h-4" />
                  </button>
                </div>
                {form.image && <img src={form.image} alt="预览" className="mt-2 h-16 object-cover rounded" />}
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-900">
                  <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="rounded border-gray-300 text-tech-accent" />
                  置顶
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-900">
                  <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="rounded border-gray-300 text-tech-accent" />
                  发布（不勾选则新闻列表不展示）
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors">
                  取消
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-tech-accent text-white hover:bg-tech-secondary disabled:opacity-60 transition-colors">
                  <Save className="w-4 h-4" />
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AssetPickerModal
        isOpen={assetOpen}
        onClose={() => setAssetOpen(false)}
        onSelect={(asset) => {
          setForm({ ...form, image: asset.url })
          setAssetOpen(false)
        }}
      />
    </AdminLayout>
  )
}