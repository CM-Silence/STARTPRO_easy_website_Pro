import Lenis from 'lenis'

/**
 * Lenis 平滑滚动单例（公开页专用）。
 * - 平滑的是真实滚动条位置，因此 whileInView / 返回顶部 / 锚点等现有滚动消费方全部兼容。
 * - 模块级单例，避免路由切换时叠加多个实例。
 */
let instance: Lenis | null = null
let rafId = 0

export function getLenis(): Lenis | null {
  return instance
}

/** 顺滑回到顶部（优先走 Lenis，否则回退原生 smooth） */
export function scrollToTop() {
  if (instance) {
    instance.scrollTo(0)
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

export interface SmoothScrollOptions {
  duration?: number
  easing?: (t: number) => number
}

/** 创建并挂载 Lenis（会自动销毁旧的，避免叠加） */
export function createLenis(opts: SmoothScrollOptions = {}) {
  destroyLenis()
  if (typeof window === 'undefined') return null

  instance = new Lenis({
    duration: opts.duration ?? 0.9,
    easing: opts.easing ?? ((t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))),
    smoothWheel: true,
    touchMultiplier: 1.4
  })

  const raf = (time: number) => {
    instance?.raf(time)
    rafId = requestAnimationFrame(raf)
  }
  rafId = requestAnimationFrame(raf)
  return instance
}

export function destroyLenis() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  if (instance) {
    instance.destroy()
    instance = null
  }
}