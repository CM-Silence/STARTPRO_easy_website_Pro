import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { grabMotionSettings, directionVariants, MotionSettings } from '@/styles/motion-presets'
import { Parallax } from './Parallax'

/**
 * 滚动显现包装器（核心）。
 * - SSR / 无 JS / prefers-reduced-motion / forceStatic 时直接渲染为普通元素，保证内容始终可见（SEO 安全）。
 * - 客户端挂载后启用 whileInView 滚动显现，按方向/时长/偏移播放。
 */
export type RevealAs = 'div' | 'section' | 'article' | 'li' | 'span' | 'figure'

interface RevealProps {
  config?: Partial<MotionSettings>
  staggerDelay?: number
  as?: RevealAs
  className?: string
  forceStatic?: boolean // 编辑器画布等滚动容器内强制不做 whileInView，避免预览隐藏
  style?: React.CSSProperties
  children: React.ReactNode
}

const motionTag: Record<RevealAs, any> = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  li: motion.li,
  span: motion.span,
  figure: motion.figure
}

export function Reveal({
  config,
  staggerDelay = 0,
  as = 'div',
  className,
  forceStatic = false,
  style,
  children
}: RevealProps) {
  const reduceMotion = useReducedMotion()
  const settings = grabMotionSettings(config)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const shouldAnimate = mounted && !reduceMotion && settings.reveal && !forceStatic
  const Comp = motionTag[as]

  if (!shouldAnimate) {
    const Tag = as
    return <Tag className={className} style={style}>{children}</Tag>
  }

  const variants = directionVariants({ ...settings, delay: (settings.delay || 0) + staggerDelay })

  const inner = (
    <Comp
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: settings.once, amount: 0.2 }}
    >
      {children}
    </Comp>
  )

  // 视差联动：外层做滚动位移，内层做滚动显现（两者不同轴，可叠加）
  if (settings.parallax) {
    return (
      <Parallax speed={settings.parallaxSpeed} className={className} style={style}>
        {inner}
      </Parallax>
    )
  }

  return <Comp className={className} style={style} variants={variants} initial="hidden" whileInView="visible" viewport={{ once: settings.once, amount: 0.2 }}>{children}</Comp>
}

export default Reveal