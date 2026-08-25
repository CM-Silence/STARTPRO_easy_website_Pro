import React, { useEffect, useState } from 'react'
import { languagesApi, aiApi } from '@/utils/api'
import { X, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

interface AiSyncModalProps {
  open: boolean
  onClose: () => void
  type: 'page' | 'doc' | 'news' | 'nav' | 'settings'
  ids?: (string | number)[]
  onDone?: () => void
  /** 系统设置模式：调用 /api/ai/sync-settings，忽略 ids */
  settingsMode?: boolean
}

/** AI 同步目标语言选择弹窗：列出已启用的非中文语言，确认后调用 /api/ai/sync（或 /api/ai/sync-settings）。 */
export default function AiSyncModal({ open, onClose, type, ids = [], onDone, settingsMode = false }: AiSyncModalProps) {
  const [langs, setLangs] = useState<{ code: string; display_name: string }[]>([])
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    if (!open) return
    setSelected('')
    languagesApi.getAll().then((res) => {
      const enabled = ((res.data || []) as any[])
        .filter((l) => l.is_enabled && l.code !== 'zh')
        .map((l) => ({ code: l.code, display_name: l.display_name }))
      setLangs(enabled)
      setSelected(enabled[0]?.code || '')
    }).catch(() => {})
  }, [open])

  if (!open) return null

  // 对瞬时失败（后端重启/连接被拒/5xx）重试，带退避；success=false 也会重试
  const callWithRetry = async (fn: () => Promise<any>, attempts = 3, delay = 800): Promise<any> => {
    let last: any
    for (let a = 0; a < attempts; a++) {
      try {
        const res = await fn()
        if (res && res.success) return res
        last = res
      } catch (e) {
        last = e
      }
      await new Promise((r) => setTimeout(r, delay * (a + 1)))
    }
    throw last
  }

  const confirm = async () => {
    if (!selected) return toast.error('请选择目标语言')
    if (!settingsMode && ids.length === 0) return toast.error('未选择要同步的记录')
    setBusy(true)
    const total = settingsMode ? 1 : ids.length
    setProgress({ done: 0, total })
    let failed = 0
    try {
      if (settingsMode) {
        const res = await callWithRetry(() => aiApi.syncSettings({ targetLangs: [selected] }))
        if (!res.success) failed++
        setProgress({ done: 1, total: 1 })
      } else {
        // 逐项单独请求，避免一次大请求超时；瞬时失败自动重试，最终失败的单项目跳过、继续处理其余项
        for (let i = 0; i < ids.length; i++) {
          try {
            const res = await callWithRetry(() => aiApi.sync({ type, ids: [ids[i]], targetLangs: [selected] }))
            if (!res.success) failed++
          } catch {
            failed++
          }
          setProgress({ done: i + 1, total })
        }
      }
      toast.success(failed ? `同步完成，${failed} 项失败已跳过` : settingsMode ? '设置 AI 转换完成' : 'AI 同步完成')
      onClose()
      onDone?.()
    } catch (e: any) {
      toast.error('同步失败：' + (e?.message || ''))
      onClose?.()
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && onClose()}>
      <div className="bg-white dark:bg-tech-dark w-full max-w-sm rounded-xl shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI 同步到语言</h3>
          <button onClick={() => !busy && onClose()} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-500">
          {settingsMode
            ? '将当前站点设置（站点名/描述/关键词/版权/页脚/快捷链接等）翻译并另存为该语言版本。'
            : `将所选 ${ids.length} 条记录翻译到以下语言（AI 生成的为独立内容，可之后手动修改）。`}
        </p>
        <div className="space-y-2">
          {langs.length === 0 ? (
            <p className="text-sm text-gray-400">暂无启用的其他语言，请先在「语言管理」添加。</p>
          ) : (
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={busy}
              className="theme-input w-full"
            >
              {langs.map((l) => (
                <option key={l.code} value={l.code}>{l.display_name}</option>
              ))}
            </select>
          )}
        </div>
        {progress && (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full rounded-full bg-tech-accent transition-all" style={{ width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500">AI 同步中：{progress.done}/{progress.total}</p>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => !busy && onClose()} className="px-4 py-2 rounded-lg border border-theme-divider text-theme-textSecondary hover:bg-theme-surfaceAlt transition">取消</button>
          <button onClick={confirm} disabled={busy} className="inline-flex items-center px-4 py-2 rounded-lg bg-tech-accent text-white hover:bg-tech-accent/90 transition disabled:opacity-60">
            {busy ? <Loader className="w-4 h-4 mr-1 animate-spin" /> : null}
            {busy ? 'AI 同步中…' : '开始同步'}
          </button>
        </div>
      </div>
    </div>
  )
}