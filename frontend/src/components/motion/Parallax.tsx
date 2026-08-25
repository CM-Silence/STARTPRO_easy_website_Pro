import React, { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion'

/**
 * 滚动联动视差容器：随元素进出视口，内容按 speed 系数缓动错位。
 * prefers-reduced-motion / SSR 时原样输出（y=0）。
 */
interface ParallaxProps {
  speed?: number        // 位移系数，建议 -0.4 ~ 0.4；正=向后扫，负=向前
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

export function Parallax({ speed = 0.25, className, style, children }: ParallaxProps) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const raw = useTransform(scrollYProgress, [0, 1], [speed * 120, -speed * 120])
  const y = useSpring(raw, { stiffness: 140, damping: 26, mass: 0.5 })

  return (
    <motion.div ref={ref} className={className} style={{ ...style, y: reduce ? 0 : y }}>
      {children}
    </motion.div>
  )
}

export default Parallax