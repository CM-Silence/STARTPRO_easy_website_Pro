import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ThemeBackgroundEffect } from '@/styles/themes'

type MeshConfig = Extract<ThemeBackgroundEffect, { type: 'mesh' }>

interface MeshBackgroundProps {
  config: MeshConfig
}

/**
 * 动态光纹背景：几团主/强调色光斑缓慢漂移、弥散，营造流动的渐变云雾氛围。
 * 动画走 transform（合成器友好）；减弱动态效果时静止为静态光斑。
 */
const MeshBackground: React.FC<MeshBackgroundProps> = ({ config }) => {
  const reduce = useReducedMotion()
  const { colors = [], baseColor } = config
  const c = (i: number, fb: string) => colors[i] || fb

  const blobs = [
    { bg: c(0, 'rgba(6,182,212,0.4)'), x: [-18, 22], y: [-16, 18], size: 62, dur: 20 },
    { bg: c(1, 'rgba(59,130,246,0.32)'), x: [16, -16], y: [20, -12], size: 56, dur: 26 },
    { bg: c(2, 'rgba(168,85,247,0.3)'), x: [2, 24], y: [30, -22], size: 72, dur: 32 }
  ]

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ backgroundColor: baseColor }}
    >
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${b.size}%`,
            height: `${b.size}%`,
            left: '-10%',
            top: '-10%',
            background: `radial-gradient(circle, ${b.bg} 0%, transparent 70%)`,
            filter: 'blur(70px)',
            opacity: 0.42
          }}
          animate={reduce ? undefined : { x: b.x, y: b.y }}
          transition={{ duration: b.dur, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default MeshBackground