import React from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'

export interface ArrayMoveControlsProps {
  onUp: () => void
  onDown: () => void
  isFirst: boolean
  isLast: boolean
}

/** 数组项排序控件：放在删除按钮左侧的上移/下移箭头 */
export const ArrayMoveControls: React.FC<ArrayMoveControlsProps> = ({ onUp, onDown, isFirst, isLast }) => (
  /* ml-auto：在 justify-between 的条目头部中与右侧删除按钮相邻成组 */
  <div className="ml-auto flex items-center space-x-0.5">
    <button
      type="button"
      title="上移"
      disabled={isFirst}
      onClick={onUp}
      className="p-1 text-gray-500 hover:text-tech-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <ArrowUp className="w-3.5 h-3.5" />
    </button>
    <button
      type="button"
      title="下移"
      disabled={isLast}
      onClick={onDown}
      className="p-1 text-gray-500 hover:text-tech-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <ArrowDown className="w-3.5 h-3.5" />
    </button>
  </div>
)

export default ArrayMoveControls

/**
 * 生成「渲染第 index 项排序控件」的工厂函数。
 * 各编辑器声明可选 prop `renderMoveControls?: (index: number) => React.ReactNode`，
 * 并在条目头部删除按钮左侧渲染 `{renderMoveControls?.(index)}`。
 */
export const makeArrayMoveControls = (
  moveArrayItem: ((arrayKey: string, from: number, to: number) => void) | undefined,
  arrayKey: string,
  itemCount: number
): ((index: number) => React.ReactNode) | undefined => {
  if (!moveArrayItem) return undefined
  return (index: number) => (
    <ArrayMoveControls
      onUp={() => moveArrayItem(arrayKey, index, index - 1)}
      onDown={() => moveArrayItem(arrayKey, index, index + 1)}
      isFirst={index <= 0}
      isLast={index >= itemCount - 1}
    />
  )
}
