import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ThemeBackgroundEffect } from '@/styles/themes'

type GridConfig = Extract<ThemeBackgroundEffect, { type: 'grid' }>

interface GridBackgroundProps {
  config: GridConfig
}

/**
 * 赛博网格背景：细网格线 + 顶部主题强调色泛出的辉光地平线。
 * 减弱动态效果时仅保留静态网格与辉光（不闪烁）。
 */
const GridBackground: React.FC<GridBackgroundProps> = ({ config }) => {
  const reduce = useReducedMotion()
  const { lineColor, glowColor, size = 48 } = config

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 网格线 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            `linear-gradient(${lineColor} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${lineColor} 1px, transparent 1px)`
          ].join(', '),
          backgroundSize: `${size}px ${size}px`,
          opacity: 0.55
        }}
      />
      {/* 地平线辉光 */}
      <motion.div
        className="absolute inset-x-0 top-0 h-44"
        style={{ background: `radial-gradient(120% 100% at 50% 0%, ${glowColor} 0%, transparent 60%)` }}
        animate={reduce ? undefined : { opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

export default GridBackground