import React, { useEffect } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useSettings } from '@/contexts/SettingsContext'
import { createLenis, destroyLenis } from '@/utils/lenis'

/**
 * 平滑/限速滚动：只在公开页（Layout）内挂载。
 * - 开启系统「减弱动态效果」或设置关闭时 → 回退原生滚动。
 * - 用 Lenis 平滑真实滚动条，兼容 whileInView / 返回顶部 / 锚点。
 */
export function SmoothScroll() {
  const reduceMotion = useReducedMotion()
  const { settings } = useSettings()
  const on = (settings?.smooth_scroll ?? 'on') !== 'off'
  const duration = clampNum(settings?.smooth_scroll_duration, 0.9, 0.4, 1.2)

  useEffect(() => {
    if (reduceMotion || !on) {
      destroyLenis()
      return
    }
    if (typeof window === 'undefined') return
    createLenis({ duration })
    return () => destroyLenis()
  }, [reduceMotion, on, duration])

  return null
}

function clampNum(v: unknown, def: number, min: number, max: number) {
  const n = typeof v === 'number' ? v : parseFloat(String(v || ''))
  if (Number.isNaN(n)) return def
  return Math.min(max, Math.max(min, n))
}

export default SmoothScroll