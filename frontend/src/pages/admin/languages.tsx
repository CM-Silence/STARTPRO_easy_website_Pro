import React, { useCallback, useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { languagesApi } from '@/utils/api'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface LanguageRow {
  id: number
  display_name: string
  suffix: string
  code: string
  is_enabled: number
  is_system: number
}

const emptyForm = (): { display_name: string; suffix: string; is_enabled: boolean } => ({
  display_name: '',
  suffix: '',
  is_enabled: true
})

export default function AdminLanguagesPage() {
  const [languages, setLanguages] = useState<LanguageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm())

  const fetchLanguages = useCallback(async () => {
    try {
      setLoading(true)
      const res = await languagesApi.getAll()
      if (res.success) setLanguages(res.data || [])
    } catch {
      toast.error('获取语言列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLanguages()
  }, [fetchLanguages])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (row: LanguageRow) => {
    if (row.is_system) return
    setEditingId(row.id)
    setForm({ display_name: row.display_name, suffix: row.suffix, is_enabled: !!row.is_enabled })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const display_name = form.display_name.trim()
    if (!display_name) return toast.error('显示名不能为空')
    const suffix = form.suffix.trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9_-]{0,49}$/.test(suffix)) {
      return toast.error('后缀需以小写字母/数字开头，仅含小写字母、数字、下划线、中划线')
    }
    try {
      setSaving(true)
      const payload = { display_name, suffix, is_enabled: form.is_enabled }
      const res = editingId
        ? await languagesApi.update(editingId, payload)
        : await languagesApi.create(payload)
      if (res.success) {
        toast.success(editingId ? '语言更新成功' : '语言创建成功')
        setModalOpen(false)
        fetchLanguages()
      } else {
        toast.error(res.message || '保存失败')
      }
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (row: LanguageRow) => {
    if (row.is_system) return
    try {
      const res = await languagesApi.update(row.id, { is_enabled: row.is_enabled ? 0 : 1 })
      if (res.success) {
        toast.success('已更新')
        fetchLanguages()
      } else {
        toast.error(res.message || '更新失败')
      }
    } catch {
      toast.error('更新失败')
    }
  }

  const handleDelete = async (row: LanguageRow) => {
    if (row.is_system) return
    if (!window.confirm(`确定删除语言「${row.display_name}」？其下内容将不再展示。`)) return
    try {
      const res = await languagesApi.delete(row.id)
      if (res.success) {
        toast.success('语言删除成功')
        fetchLanguages()
      } else {
        toast.error(res.message || '删除失败')
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-tech-dark text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-tech-accent focus:border-transparent'

  return (
    <AdminLayout title="语言管理" description="管理站点支持的语言（后缀用于 URL 前缀）">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-theme-text">语言管理</h1>
          <p className="text-theme-textSecondary">新增语言的 URL 后缀需以小写字母/数字开头，仅含小写字母、数字、下划线、中划线；新增后还需登记到前端路由并补充界面翻译。</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center px-4 py-2 rounded-md bg-[var(--semantic-cta-primary-bg)] text-[color:var(--semantic-cta-primary-contrast)] shadow hover:opacity-90 transition text-sm">
          <Plus className="w-4 h-4 mr-2" />新增语言
        </button>
      </div>

      <div className="bg-theme-surface border border-theme-divider rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-theme-divider">
          <thead className="bg-theme-surfaceAlt/60">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">显示名</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">后缀</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">URL</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">启用</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">类型</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-theme-textSecondary uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme-divider">
            {languages.map((row) => (
              <tr key={row.id} className="hover:bg-theme-surfaceAlt/40">
                <td className="px-5 py-3 text-sm text-theme-text">{row.display_name}</td>
                <td className="px-5 py-3 text-sm font-mono text-theme-text">{row.suffix || '—'}</td>
                <td className="px-5 py-3 text-sm text-theme-textSecondary">{row.suffix ? `/${row.suffix}` : '/'}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => handleToggle(row)}
                    disabled={!!row.is_system}
                    className={`w-10 h-5 rounded-full relative transition-colors ${row.is_system ? 'opacity-50 cursor-not-allowed' : ''} ${row.is_enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    title={row.is_system ? '系统默认语言不可禁用' : '切换启用'}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${row.is_enabled ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </td>
                <td className="px-5 py-3">
                  {row.is_system ? (
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">系统</span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">自定义</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => openEdit(row)} disabled={!!row.is_system} className="p-1.5 rounded-md text-gray-500 hover:text-tech-accent hover:bg-theme-surfaceAlt disabled:opacity-40 disabled:cursor-not-allowed" title="编辑">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(row)} disabled={!!row.is_system} className="p-1.5 ml-1 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed" title="删除">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!loading && languages.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-theme-textSecondary">暂无语言</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setModalOpen(false)}>
          <div className="bg-white dark:bg-tech-dark w-full max-w-md rounded-xl shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? '编辑语言' : '新增语言'}</h3>
              <button onClick={() => !saving && setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">显示名</label>
              <input className={inputCls} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="例如：English" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">后缀（URL 前缀）</label>
              <input className={inputCls} value={form.suffix} onChange={(e) => setForm({ ...form, suffix: e.target.value })} placeholder="例如：en（中文为根路径，无需填写）" />
              <p className="mt-1 text-xs text-gray-400">新增语言的后缀不能为空；将作为访问前缀，如 /en/...</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })} className="rounded" />
              启用
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => !saving && setModalOpen(false)} className="px-4 py-2 rounded-lg border border-theme-divider text-theme-textSecondary hover:bg-theme-surfaceAlt transition">取消</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center px-4 py-2 rounded-lg bg-tech-accent text-white hover:bg-tech-accent/90 transition disabled:opacity-60">
                <Check className="w-4 h-4 mr-1" />{saving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}