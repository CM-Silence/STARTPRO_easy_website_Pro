import React, { useRef } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  useMotionTemplate,
  MotionValue
} from 'framer-motion'

interface TiltProps {
  className?: string
  maxDeg?: number        // 最大倾角
  scale?: number         // hover 放大（默认 1=不缩放，避免缩放重栅格化导致文字模糊）
  glare?: boolean        // 顶部高光（玻璃质感）
  style?: React.CSSProperties
  children: React.ReactNode
}

/** 3D 悬浮倾斜卡片：随鼠标 rotateX/rotateY，带光滑过渡与可选顶部高光 */
export function Tilt({ className, maxDeg = 7, scale = 1, glare = true, style, children }: TiltProps) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const x = useMotionValue(50)
  const y = useMotionValue(50)

  const rotateX = useSpring(useTransform(y, [0, 100], [maxDeg, -maxDeg]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(x, [0, 100], [-maxDeg, maxDeg]), { stiffness: 200, damping: 20 })
  const glowX: MotionValue<number> = useTransform(x, [0, 100], [10, -5])
  const glowY: MotionValue<number> = useTransform(y, [0, 100], [10, -5])
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,255,255,0.18), rgba(255,255,255,0) 45%)`

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    x.set(((e.clientX - rect.left) / rect.width) * 100)
    y.set(((e.clientY - rect.top) / rect.height) * 100)
  }

  const reset = () => {
    x.set(50)
    y.set(50)
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        ...style,
        willChange: 'transform',
        ...(reduce
          ? {}
          : { rotateX, rotateY, transformPerspective: 900, transformStyle: 'preserve-3d' })
      }}
      whileHover={reduce ? undefined : { scale }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
    >
      {children}
      {glare && !reduce && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: glareBg }}
        />
      )}
    </motion.div>
  )
}

export default Tilt