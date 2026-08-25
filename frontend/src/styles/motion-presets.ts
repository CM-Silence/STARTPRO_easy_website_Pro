import type { Variants } from 'framer-motion'

/**
 * 组件动效预设与工具。
 * 所有「华丽度」相关动效的默认值与方向/缓动集中定义，供 Reveal / Parallax / Tilt / CountUp 复用。
 */

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'zoom' | 'none'
export type HoverEffect = 'none' | 'lift' | 'tilt' | 'scale' | 'glow'
export type AnimEase = 'easeOut' | 'easeInOut' | 'linear'

/** 每组件可配置的动效设置（持久化到 props.motion） */
export interface MotionSettings {
  reveal: boolean          // 滚动显现开关
  direction: RevealDirection
  duration: number
  delay: number
  ease: AnimEase
  distance: number         // 初态偏移 px
  once: boolean            // 是否只播一次
  parallax: boolean        // 视差联动开关
  parallaxSpeed: number    // 视差位移系数（负=反向）
  hover: HoverEffect
  hoverDuration: number    // 悬浮特效时长（秒）
}

export const DEFAULT_MOTION: MotionSettings = {
  reveal: true,
  direction: 'up',
  duration: 0.8,
  delay: 0,
  ease: 'easeOut',
  distance: 32,
  once: true,
  parallax: true,
  parallaxSpeed: 0.25,
  hover: 'lift',
  hoverDuration: 0.8
}

/** framer-motion 缓动曲线 */
export const EASINGS: Record<AnimEase, [number, number, number, number]> = {
  easeOut: [0.16, 1, 0.3, 1],
  easeInOut: [0.65, 0, 0.35, 1],
  linear: [0, 0, 1, 1]
}

/** 统一的卡片悬停过渡：快速、一致的响应手感（消除各卡片零散/偏慢的可变时长） */
export const HOVER_TRANSITION = {
  type: 'tween' as const,
  duration: 0.05,
  ease: EASINGS.easeOut
}

/** 从组件 props.motion 的 hoverDuration 生成悬停过渡（无则用默认） */
export function getHoverTransition(props?: Record<string, any> | null) {
  const s = grabMotionSettings(props)
  return { type: 'tween' as const, duration: s.hoverDuration, ease: EASINGS.easeOut }
}

/** 根据方向计算初隐/可见 Variants */
export function directionVariants(settings: MotionSettings): Variants {
  const d = settings.distance
  const offset: Partial<Record<RevealDirection, { x?: number; y?: number; scale?: number }>> = {
    up: { y: d },
    down: { y: -d },
    left: { x: d },
    right: { x: -d },
    zoom: { scale: 0.9 },
    none: {}
  }
  const hidden = { opacity: 0, ...(offset[settings.direction] || {}) }
  return {
    hidden,
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        duration: settings.duration,
        delay: settings.delay,
        ease: EASINGS[settings.ease]
      }
    }
  }
}

/** 从组件 props 中取出 motion 配置并补全默认值。旧组件没有 motion 也安全 */
export function grabMotionSettings(props?: Record<string, any> | null | undefined): MotionSettings {
  const m = props?.motion
  if (!m || typeof m !== 'object') return DEFAULT_MOTION
  return { ...DEFAULT_MOTION, ...m }
}