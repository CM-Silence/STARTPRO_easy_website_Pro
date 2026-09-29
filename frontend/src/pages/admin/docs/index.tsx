import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import AdminLayout from '@/components/AdminLayout'
import { docsApi, settingsApi } from '@/utils/api'
import LanguageSelect from '@/components/admin/LanguageSelect'
import AiSyncModal from '@/components/admin/AiSyncModal'
import SyncStatusBadge from '@/components/admin/SyncStatusBadge'
import { Sparkles, Search, Trash2, Languages } from 'lucide-react'
import type { Doc, DocNode } from '@/types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import DocTreePanel from '@/components/docs/DocTreePanel'
import DocForm from '@/components/docs/DocForm'

export default function DocsListPage() {
  const router = useRouter()
  const [tree, setTree] = useState<DocNode[]>([])
  const [treeLoading, setTreeLoading] = useState(false)

  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<DocNode | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)

  const [currentParent, setCurrentParent] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [searchResult, setSearchResult] = useState<Doc | null>(null)
  const [lang, setLang] = useState('zh')
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncIds, setSyncIds] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [docsDefaultTheme, setDocsDefaultTheme] = useState<'light' | 'dark'>('dark')

  const fetchTree = async () => {
    try {
      setTreeLoading(true)
      const res = await docsApi.getTree(lang)
      if (res.success) {
        setTree(res.data || [])
      }
    } catch (error) {
      console.error('获取目录失败', error)
    } finally {
      setTreeLoading(false)
    }
  }

  const fetchDoc = async (id: number) => {
    try {
      setDocLoading(true)
      setDocError(null)
      const res = await docsApi.getById(id)
      if (res.success) {
        setSelectedDoc(res.data as Doc)
      } else {
        setDocError(res.message || '加载文档失败')
      }
    } catch (error) {
      console.error('加载文档失败', error)
      setDocError('加载文档失败')
    } finally {
      setDocLoading(false)
    }
  }

  const handleSelectNode = (node: DocNode | null) => {
    if (!node) {
      setSelectedDoc(null)
      setSelectedFolder(null)
      setCurrentParent(null)
      return
    }
    if (node.type === 'folder') {
      setSelectedDoc(null)
      setSelectedFolder(node)
      setCurrentParent(node.id)
      return
    }
    setSelectedFolder(null)
    setCurrentParent(node.parent_id ?? null)
    fetchDoc(node.id)
  }

  useEffect(() => {
    fetchTree()
    setSelectedDoc(null)
    setSelectedFolder(null)
    setCurrentParent(null)
    setSelectedIds([])
  }, [lang])

  useEffect(() => {
    const selectId = router.query.select ? Number(router.query.select) : null
    if (selectId) {
      fetchDoc(selectId)
    }
  }, [router.query.select])

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该文档？删除后无法恢复')) return
    try {
      await docsApi.delete(id)
      toast.success('删除成功')
      setSelectedDoc(null)
      fetchTree()
    } catch (error) {
      console.error('删除文档失败', error)
      toast.error('删除失败')
    }
  }

  const handleUpdate = async (payload: Partial<Doc> & { status: 'draft' | 'published' }) => {
    if (!selectedDoc) return
    await docsApi.update(selectedDoc.id, payload)
    toast.success('更新成功')
    fetchTree()
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!search.trim()) {
      setSearchResult(null)
      return
    }
    try {
      // 简单按 slug 精确匹配或标题包含
      const res = await docsApi.list({ page: 1, limit: 1, search: search.trim(), lang })
      if (res.success && res.data?.length) {
        const doc = res.data[0]
        // 通过搜索选中文档时，清空已选中的目录，避免目录与文档同时被选中
        setSelectedFolder(null)
        setCurrentParent(doc.parent_id ?? null)
        setSearchResult(doc as Doc)
        fetchDoc(doc.id)
      } else {
        toast.error('未找到匹配的文档')
      }
    } catch (error) {
      toast.error('搜索失败')
    }
  }

  const selectedSyncStatus = (() => {
    const targetId = selectedDoc?.id ?? selectedFolder?.id
    if (!targetId) return undefined
    const findNode = (nodes: DocNode[]): DocNode | null => {
      for (const n of nodes) {
        if (n.id === targetId) return n
        if (n.children) {
          const r = findNode(n.children)
          if (r) return r
        }
      }
      return null
    }
    const node = findNode(tree)
    return node ? (node as any).syncStatus : undefined
  })()

  // 读取后台配置的「前台默认主题」
  useEffect(() => {
    settingsApi
      .get('zh')
      .then((res: any) => {
        const v = res?.data?.docs_default_theme
        if (v === 'light' || v === 'dark') setDocsDefaultTheme(v)
      })
      .catch(() => {})
  }, [])

  const detailTime = useMemo(() => {
    if (!selectedDoc) return null
    return {
      updated: selectedDoc.updated_at ? format(new Date(selectedDoc.updated_at), 'yyyy-MM-dd HH:mm') : '-',
      created: selectedDoc.created_at ? format(new Date(selectedDoc.created_at), 'yyyy-MM-dd HH:mm') : '-'
    }
  }, [selectedDoc])

  // --- 多选（批量删除 / AI 翻译） ---
  const findNodeById = (nodes: DocNode[], id: number): DocNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n
      const r = n.children ? findNodeById(n.children, id) : null
      if (r) return r
    }
    return null
  }
  const subtreeIds = (node: DocNode): number[] => {
    const acc = [node.id]
    const walk = (n: DocNode) => {
      for (const c of n.children || []) {
        acc.push(c.id)
        walk(c)
      }
    }
    walk(node)
    return acc
  }
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const node = findNodeById(tree, id)
      // 目录：整棵子树一起选/取消
      if (node && node.type === 'folder') {
        const ids = subtreeIds(node)
        const allSel = ids.every((x) => prev.includes(x))
        if (allSel) return prev.filter((x) => !ids.includes(x))
        return Array.from(new Set([...prev, ...ids]))
      }
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    })
  }
  const collectAllIds = (nodes: DocNode[] = tree): number[] => {
    const acc: number[] = []
    const walk = (list: DocNode[]) => {
      for (const n of list) {
        acc.push(n.id)
        if (n.children) walk(n.children)
      }
    }
    walk(nodes)
    return acc
  }
  const handleSelectAll = () => {
    const all = collectAllIds()
    setSelectedIds(all.length === selectedIds.length ? [] : all)
  }
  const handleBatchDelete = async () => {
    const n = selectedIds.length
    if (!n) return
    if (!window.confirm(`确定删除选中的 ${n} 项？删除文件夹会连同其子项一并删除，且无法恢复。`)) return
    let ok = 0
    for (const id of selectedIds) {
      try {
        await docsApi.delete(id)
        ok++
      } catch (e) {
        console.error(`删除 ${id} 失败`, e)
      }
    }
    toast.success(`已删除 ${ok} 项`)
    setSelectedDoc(null)
    setSelectedFolder(null)
    setSelectedIds([])
    fetchTree()
  }
  const handleBatchSync = () => {
    setSyncIds(selectedIds.map(String))
    setSyncOpen(true)
  }
  const handleDefaultThemeChange = async (v: 'light' | 'dark') => {
    setDocsDefaultTheme(v)
    try {
      await settingsApi.setByKey('docs_default_theme', v)
      toast.success('前台默认主题已保存')
    } catch (e) {
      toast.error('保存失败')
    }
  }

  const handlePreview = (slug: string) => {
    if (!slug) return
    // zh 无前缀；其他语言加前缀（如 /en/docs/...），确保预览的是当前语言的文档
    const prefix = lang === 'zh' ? '' : `/${lang}`
    window.open(`${prefix}/docs/${slug}`, '_blank')
  }

  return (
    <AdminLayout title="文档中心" description="管理文档目录与内容">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-theme-text">文档中心</h1>
          <p className="text-theme-textSecondary">管理文档目录、状态与内容</p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelect
            value={lang}
            includeDisabled
            onChange={(code) => setLang(code)}
            className="theme-input text-sm rounded-lg h-10 px-3"
          />
          <label className="flex items-center gap-2 text-sm" title="访客未手动切换时，前台文档中心默认亮/暗">
            <span className="text-theme-textSecondary whitespace-nowrap">前台默认主题</span>
            <select
              value={docsDefaultTheme}
              onChange={(e) => handleDefaultThemeChange(e.target.value as 'light' | 'dark')}
              className="theme-input text-sm rounded-lg h-10 px-3 cursor-pointer"
            >
              <option value="dark">暗色</option>
              <option value="light">亮色</option>
            </select>
          </label>
          {lang === 'zh' && (
            <button
              onClick={() => {
                const id = selectedDoc?.id ?? selectedFolder?.id
                if (!id) return toast.error('请先选择要同步的文档或文件夹')
                setSyncIds([String(id)])
                setSyncOpen(true)
              }}
              disabled={!selectedDoc && !selectedFolder}
              className="inline-flex items-center px-3 py-2 rounded-md bg-violet-100 text-violet-700 hover:bg-violet-200 text-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 mr-1" />AI 同步
            </button>
          )}
          <AiSyncModal
            open={syncOpen}
            onClose={() => setSyncOpen(false)}
            type="doc"
            ids={syncIds}
            onDone={() => {
              fetchTree()
              setSelectedIds([])
            }}
          />
          <Link
            href={`/admin/docs/create${currentParent ? `?parent_id=${currentParent}` : ''}`}
            className="px-3 py-2 rounded-md bg-[var(--semantic-cta-primary-bg)] text-[color:var(--semantic-cta-primary-contrast)] shadow hover:opacity-90 transition text-sm"
          >
            新建文档
          </Link>
          <Link
            href={`/admin/docs/create?type=folder`}
            className="px-3 py-2 rounded-md bg-theme-surfaceAlt border border-theme-divider text-theme-text hover:bg-theme-surface transition text-sm"
          >
            新建文件夹
          </Link>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-textSecondary pointer-events-none" />
          <input
            className="theme-input w-full text-sm rounded-lg h-10 pl-9 pr-3"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ borderRadius: 10 }}
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center px-4 h-10 rounded-lg bg-theme-surfaceAlt border border-theme-divider text-theme-text hover:bg-theme-surface text-sm sm:w-auto whitespace-nowrap"
        >
          搜索
        </button>
      </form>

      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-theme-surface p-3 shadow-sm">
          <span className="text-sm text-theme-text font-medium">已选 {selectedIds.length} 项</span>
          <button
            type="button"
            onClick={handleSelectAll}
            className="px-3 py-1.5 text-xs rounded-md bg-theme-surfaceAlt border border-theme-divider text-theme-text hover:bg-theme-surface"
          >
            {selectedIds.length === collectAllIds().length ? '取消全选' : '全选'}
          </button>
          <button
            type="button"
            onClick={handleBatchSync}
            disabled={lang !== 'zh'}
            title={lang !== 'zh' ? '仅支持从中文同步到其它语言' : ''}
            className="inline-flex items-center px-3 py-1.5 text-xs rounded-md bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-50"
          >
            <Languages className="w-3.5 h-3.5 mr-1" />批量 AI 翻译
          </button>
          <button
            type="button"
            onClick={handleBatchDelete}
            className="inline-flex items-center px-3 py-1.5 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />批量删除
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="px-3 py-1.5 text-xs rounded-md text-theme-textSecondary hover:text-theme-text"
          >
            清除选择
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4 min-w-0">
        <div className="order-2 xl:order-1 min-w-0">
          <DocTreePanel
            tree={tree}
            loading={treeLoading}
            selectedDocId={selectedDoc?.id ?? null}
            onSelectDoc={handleSelectNode}
            onRefresh={fetchTree}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        </div>

        <div className="order-1 xl:order-2 space-y-3 min-w-0">
          {docLoading && <div className="text-theme-textSecondary text-sm">加载文档...</div>}
          {docError && <div className="text-red-500 text-sm">{docError}</div>}
          {!selectedDoc && !selectedFolder && !docLoading && (
            <div className="text-theme-textSecondary text-sm">
              {searchResult ? '已选中文档，请稍候加载...' : '请选择左侧目录中的文档或目录'}
            </div>
          )}

          {selectedFolder && (
            <div className="space-y-3">
              <div className="rounded-lg bg-theme-surface p-4 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-theme-text">目录设置</p>
                  <div className="flex items-center gap-2">
                    {lang === 'zh' && selectedSyncStatus !== undefined && (
                      <SyncStatusBadge syncStatus={selectedSyncStatus} />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-theme-text">目录名称</label>
                    <input
                      className="theme-input w-full rounded-lg px-3"
                      style={{ borderRadius: 10 }}
                      value={selectedFolder.title}
                      onChange={(e) =>
                        setSelectedFolder((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-theme-text">路径</label>
                    <input
                      className="theme-input w-full rounded-lg px-3"
                      style={{ borderRadius: 10 }}
                      value={selectedFolder.slug}
                      onChange={(e) =>
                        setSelectedFolder((prev) => (prev ? { ...prev, slug: e.target.value } : prev))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-theme-text">排序</label>
                  <input
                    type="number"
                    className="theme-input w-full rounded-lg px-3"
                    style={{ borderRadius: 10 }}
                    value={selectedFolder.sort_order ?? 0}
                    onChange={(e) =>
                      setSelectedFolder((prev) => (prev ? { ...prev, sort_order: Number(e.target.value) } : prev))
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="px-3 py-2 rounded-md bg-theme-surfaceAlt border border-theme-divider text-theme-text hover:bg-theme-surface text-sm"
                    onClick={async () => {
                      if (!selectedFolder) return
                      await docsApi.update(selectedFolder.id, {
                        title: selectedFolder.title,
                        slug: selectedFolder.slug,
                        sort_order: selectedFolder.sort_order ?? 0,
                        type: 'folder'
                      })
                      toast.success('保存成功')
                      fetchTree()
                    }}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedDoc && !docLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-theme-textSecondary">
                    更新时间：{detailTime?.updated} ｜ 创建时间：{detailTime?.created}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {lang === 'zh' && selectedSyncStatus !== undefined && (
                    <SyncStatusBadge syncStatus={selectedSyncStatus} />
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedDoc.id)}
                    className="text-red-500 text-sm underline-offset-2 hover:underline"
                  >
                    删除
                  </button>
                </div>
              </div>

              <DocForm
                parentTree={tree}
                initialData={selectedDoc}
                onSubmit={handleUpdate}
                excludeId={selectedDoc.id}
                submitting={false}
                onPreview={handlePreview}
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
