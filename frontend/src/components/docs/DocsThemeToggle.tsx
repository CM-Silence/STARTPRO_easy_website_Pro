import React from 'react'
import { Sun, Moon } from 'lucide-react'

interface DocsThemeToggleProps {
  theme: 'light' | 'dark'
  onToggle: () => void
}

export const DocsThemeToggle: React.FC<DocsThemeToggleProps> = ({ theme, onToggle }) => {
  // 用图标代替文字，避免多语言不适配
  const isLight = theme === 'light'
  return (
    <button
      type="button"
      aria-label={isLight ? '切换至深色模式' : '切换至浅色模式'}
      className="flex items-center justify-center w-9 h-9 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)]/80 hover:border-[var(--color-text-primary)] text-[var(--color-text-primary)] transition-colors"
      onClick={onToggle}
    >
      {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  )
}