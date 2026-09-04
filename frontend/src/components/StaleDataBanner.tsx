import React, { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { isStale, onStaleChange, refreshAllSources, clearStale } from '@/utils/dataCache'

// 右下角弱网提示条：当后端取数失败、正在使用旧缓存时常显。
// - 刷新按钮：强制全量重拉，成功后隐藏；仍失败则保持显示。
// - 关闭按钮：仅隐藏提示，继续使用旧缓存。
export default function StaleDataBanner() {
  const [visible, setVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    setVisible(isStale())
    return onStaleChange((value) => setVisible(value))
  }, [])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await refreshAllSources()
    } finally {
      setRefreshing(false)
    }
    // refreshAllSources 成功时已调用 clearStale()，订阅会自动将 visible 置 false
  }

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[100] flex min-w-[260px] max-w-[90vw] items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 shadow-lg backdrop-blur"
    >
      <span className="shrink-0 text-sm text-[var(--color-text-primary)]">
        拉取最新数据失败，请尝试刷新
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          title="刷新"
          aria-label="刷新"
          className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-primary)] text-[var(--color-primary-contrast)] transition hover:opacity-90 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={clearStale}
          title="关闭"
          aria-label="关闭"
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}