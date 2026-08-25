import React from 'react'
import { motion } from 'framer-motion'
import { HoverEffect, HOVER_TRANSITION, EASINGS } from '@/styles/motion-presets'
import Tilt from './Tilt'

/**
 * 按 props.motion.hover 配置把悬浮微交互应用到卡片。
 * - lift  / scale：motion 变换
 * - glow ：悬停发光（复用 --color-accent-rgb 流光描边）
 * - tilt  ：3D 倾斜（Tilt）
 * - none  ：普通 div
 */
interface HoverFXProps {
  hover?: HoverEffect
  duration?: number
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

export function HoverFX({ hover = 'none', duration, className, style, children }: HoverFXProps) {
  const transition =
    duration != null
      ? { type: 'tween' as const, duration, ease: EASINGS.easeOut }
      : HOVER_TRANSITION
  // hover 微交互是用户主动悬停的小反馈，不属于自动动画，因此不随「减弱动态效果」关闭
  if (hover === 'none') {
    return <div className={className} style={style}>{children}</div>
  }

  if (hover === 'tilt') {
    return (
      <Tilt className={className} style={style}>
        {children}
      </Tilt>
    )
  }

  if (hover === 'scale') {
    return (
      <motion.div
        className={className}
        style={style}
        whileHover={{ scale: 1.03, y: -2 }}
        transition={transition}
      >
        {children}
      </motion.div>
    )
  }

  if (hover === 'glow') {
    return (
      <motion.div
        className={className}
        style={style}
        whileHover={{
          y: -4,
          boxShadow: '0 0 0 1px rgba(0,212,255,0.35), 0 0 24px rgba(0,212,255,0.28)'
        }}
        transition={transition}
      >
        {children}
      </motion.div>
    )
  }

  // lift
  return (
    <motion.div
      className={className}
      style={style}
      whileHover={{ y: -6 }}
      transition={transition}
    >
      {children}
    </motion.div>
  )
}

export default HoverFX