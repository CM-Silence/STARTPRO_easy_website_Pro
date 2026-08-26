import React, { useEffect, useState } from 'react'
import { aiApi, languagesApi } from '@/utils/api'
import toast from 'react-hot-toast'

interface GlossaryItem {
  id: number
  from_term: string
  to_term: string
  lang: string
  is_enabled: number
}

const inputCls =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-tech-dark px-3 py-2 text-sm text-gray-900 dark:text-white'

/** AI 翻译词条：按目标语言配置术语映射（语言下拉来自语言表，排除中文） */
const AiGlossaryPanel = () => {
  const [items, setItems] = useState<GlossaryItem[]>([])
  const [langs, setLangs] = useState<{ code: string; display_name: string }[]>([])
  const [form, setForm] = useState({ from_term: '', to_term: '', lang: '', is_enabled: true })
  const [editingId, setEditingId] = useState<number | null>(null)

  const load = async () => {
    try {
      const res = await aiApi.listGlossary()
      if (res.success) setItems(res.data || [])
    } catch (error) {
      console.error('Load AI glossary failed:', error)
    }
  }

  useEffect(() => {
    load()
    languagesApi.getAll().then((res) => {
      const enabled = ((res.data || []) as any[])
        .filter((l: any) => l.code !== 'zh')
        .map((l: any) => ({ code: l.code, display_name: l.display_name }))
      setLangs(enabled)
      setForm((prev) => ({ ...prev, lang: prev.lang || enabled[0]?.code || '' }))
    }).catch(() => {})
  }, [])

  const langLabel = (code: string) => langs.find((l) => l.code === code)?.display_name || code

  const resetForm = () => {
    setEditingId(null)
    setForm({ from_term: '', to_term: '', lang: langs[0]?.code || '', is_enabled: true })
  }

  const handleSave = async () => {
    if (!form.from_term.trim() || !form.to_term.trim() || !form.lang) {
      toast.error('请填写源词、译词并选择目标语言')
      return
    }
    const payload = { from_term: form.from_term.trim(), to_term: form.to_term.trim(), lang: form.lang, is_enabled: form.is_enabled ? 1 : 0 }
    try {
      if (editingId) await aiApi.updateGlossary(editingId, payload)
      else await aiApi.createGlossary(payload)
      toast.success(editingId ? '词条已更新' : '词条已创建')
      resetForm()
      await load()
    } catch (error) {
      console.error('Save AI glossary failed:', error)
      toast.error('保存词条失败')
    }
  }

  const handleEdit = (it: GlossaryItem) => {
    setEditingId(it.id)
    setForm({ from_term: it.from_term, to_term: it.to_term, lang: it.lang, is_enabled: !!it.is_enabled })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个词条吗？')) return
    try {
      await aiApi.deleteGlossary(id)
      toast.success('词条已删除')
      if (editingId === id) resetForm()
      await load()
    } catch (error) {
      console.error('Delete AI glossary failed:', error)
      toast.error('删除词条失败')
    }
  }

  return (
    <div className="bg-white dark:bg-tech-light rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI 翻译词条</h2>
        <p className="text-xs text-gray-500">
          多语言 AI 翻译时按目标语言强制使用的术语映射（如“知识库 → Wiki”），可在配置页维护；语言来自语言表（排除中文）。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="text-sm text-gray-500">暂无词条</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{it.from_term}</span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="text-gray-700 dark:text-gray-200">{it.to_term}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{langLabel(it.lang)} · {it.is_enabled ? '启用' : '停用'}</span>
                    <button type="button" onClick={() => handleEdit(it)} className="text-sm text-tech-accent">编辑</button>
                    <button type="button" onClick={() => handleDelete(it.id)} className="text-sm text-rose-500">删除</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 h-fit">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{editingId ? '编辑词条' : '新增词条'}</h3>
          <div className="space-y-3">
            <select
              value={form.lang}
              onChange={(e) => setForm((p) => ({ ...p, lang: e.target.value }))}
              className={inputCls}
            >
              <option value="">选择目标语言</option>
              {langs.map((l) => (
                <option key={l.code} value={l.code}>{l.display_name}</option>
              ))}
            </select>
            <input
              value={form.from_term}
              onChange={(e) => setForm((p) => ({ ...p, from_term: e.target.value }))}
              className={inputCls}
              placeholder="源中文词，如：知识库"
            />
            <input
              value={form.to_term}
              onChange={(e) => setForm((p) => ({ ...p, to_term: e.target.value }))}
              className={inputCls}
              placeholder="目标语言译词，如：Wiki"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm((p) => ({ ...p, is_enabled: e.target.checked }))} />
              启用
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={handleSave} className="rounded-lg bg-tech-accent px-4 py-2 text-sm text-white hover:bg-tech-accent/90">
                {editingId ? '保存修改' : '新增词条'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-200">
                  取消
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AiGlossaryPanel