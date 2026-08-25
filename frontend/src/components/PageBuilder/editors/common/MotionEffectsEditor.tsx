import React from 'react'
import { ChevronDown } from 'lucide-react'
import {
  MotionSettings,
  RevealDirection,
  HoverEffect,
  DEFAULT_MOTION
} from '@/styles/motion-presets'

/**
 * 共享「动画效果」面板：写入组件 props.motion（嵌套对象）。
 * 样式与编辑器内其他面板一致（主题语义类，跟随编辑主题，而非系统亮暗）。
 */
interface MotionEffectsEditorProps {
  settings?: Partial<MotionSettings>
  onChange: (patch: Partial<MotionSettings>) => void
}

const DIRECTIONS: { value: RevealDirection; label: string }[] = [
  { value: 'up', label: '向上' },
  { value: 'down', label: '向下' },
  { value: 'left', label: '向左' },
  { value: 'right', label: '向右' },
  { value: 'zoom', label: '缩放' },
  { value: 'none', label: '无' }
]

const HOVERS: { value: HoverEffect; label: string }[] = [
  { value: 'lift', label: '上浮' },
  { value: 'tilt', label: '3D 倾斜' },
  { value: 'scale', label: '放大' },
  { value: 'glow', label: '发光' },
  { value: 'none', label: '无' }
]

const selectCls =
  'w-full appearance-none px-3 py-1.5 rounded border border-theme-divider bg-theme-surface text-theme-textPrimary text-sm focus:outline-none focus:ring-1 focus:ring-tech-accent'
const labelCls = 'block text-xs font-medium text-theme-textPrimary'

export function MotionEffectsEditor({ settings = {}, onChange }: MotionEffectsEditorProps) {
  const s = { ...DEFAULT_MOTION, ...settings } as MotionSettings
  const num = (v: any, d: number) => (typeof v === 'number' ? v : d)

  return (
    <div className="mb-6 bg-theme-surface p-4 space-y-4">
      <div>
        <h4 className="font-medium text-theme-textPrimary">动画效果</h4>
        <p className="text-xs text-theme-textSecondary">滚动显现 / 视差 / 悬浮特效</p>
      </div>

      {/* 滚动显现开关 */}
      <label className="flex items-center justify-between">
        <span className="text-sm text-theme-textPrimary">滚动显现</span>
        <input
          type="checkbox"
          checked={!!s.reveal}
          onChange={(e) => onChange({ reveal: e.target.checked })}
          className="rounded border-theme-divider text-tech-accent focus:ring-tech-accent"
        />
      </label>

      {/* 方向 */}
      <div className="space-y-2">
        <label className={labelCls}>显现方向</label>
        <div className="relative">
          <select
            className={selectCls}
            value={s.direction}
            onChange={(e) => onChange({ direction: e.target.value as RevealDirection })}
          >
            {DIRECTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-theme-textSecondary" />
        </div>
      </div>

      {/* 时长 / 延迟 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className={labelCls}>时长 {num(s.duration, 0.8).toFixed(1)}s</label>
          <input
            type="range"
            min={0.3}
            max={1.8}
            step={0.1}
            value={num(s.duration, 0.8)}
            onChange={(e) => onChange({ duration: Number(e.target.value) })}
            className="w-full accent-tech-accent"
          />
        </div>
        <div className="space-y-2">
          <label className={labelCls}>延迟 {num(s.delay, 0).toFixed(1)}s</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={num(s.delay, 0)}
            onChange={(e) => onChange({ delay: Number(e.target.value) })}
            className="w-full accent-tech-accent"
          />
        </div>
      </div>

      {/* 视差 */}
      <label className="flex items-center justify-between">
        <span className="text-sm text-theme-textPrimary">
          视差联动
          <span className="block text-xs font-normal text-theme-textSecondary">滚动时内容与背景错层</span>
        </span>
        <input
          type="checkbox"
          checked={!!s.parallax}
          onChange={(e) => onChange({ parallax: e.target.checked })}
          className="rounded border-theme-divider text-tech-accent focus:ring-tech-accent"
        />
      </label>
      {s.parallax && (
        <div className="space-y-2">
          <label className={labelCls}>视差强度 {Number(s.parallaxSpeed || 0.25).toFixed(2)}</label>
          <input
            type="range"
            min={-0.4}
            max={0.4}
            step={0.05}
            value={num(s.parallaxSpeed, 0.25)}
            onChange={(e) => onChange({ parallaxSpeed: Number(e.target.value) })}
            className="w-full accent-tech-accent"
          />
        </div>
      )}

      {/* 悬浮微交互 */}
      <div className="space-y-2">
        <label className={labelCls}>悬浮特效（卡片类组件）</label>
        <div className="relative">
          <select
            className={selectCls}
            value={s.hover}
            onChange={(e) => onChange({ hover: e.target.value as HoverEffect })}
          >
            {HOVERS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-theme-textSecondary" />
        </div>
      </div>

      {/* 悬浮特效时长 */}
      <div className="space-y-2">
        <label className={labelCls}>悬浮时长 {num(s.hoverDuration, 0.8).toFixed(2)}s</label>
        <input
          type="range"
          min={0.05}
          max={1.6}
          step={0.05}
          value={num(s.hoverDuration, 0.8)}
          onChange={(e) => onChange({ hoverDuration: Number(e.target.value) })}
          className="w-full accent-tech-accent"
        />
        <p className="text-xs text-theme-textSecondary">上浮 / 3D 倾斜 / 放大 / 发光等过渡时长</p>
      </div>
    </div>
  )
}

export default MotionEffectsEditor