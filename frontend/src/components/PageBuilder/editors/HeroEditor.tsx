import React from 'react'

interface HeroEditorProps {
  formData: any
  handleFieldChange: (key: string, value: any) => void
}

const radioCls = 'flex items-center gap-2 text-sm text-theme-textPrimary'
const labelCls = 'block text-xs font-medium text-theme-textPrimary'

/** 英雄区的「首屏质感」专用编辑器（样式与编辑主题一致） */
export function HeroEditor({ formData, handleFieldChange }: HeroEditorProps) {
  const overlay = typeof formData.overlayOpacity === 'number' ? formData.overlayOpacity : 0.45
  const align = formData.contentAlign || 'center'

  return (
    <div className="mb-6 bg-theme-surface p-4 space-y-4">
      <div>
        <h4 className="font-medium text-theme-textPrimary">首屏质感</h4>
      </div>

      {/* 内容对齐 */}
      <div className="space-y-2">
        <label className={labelCls}>内容对齐</label>
        <div className="flex gap-4">
          <label className={radioCls}>
            <input
              type="radio"
              name="hero-align"
              checked={align === 'center'}
              onChange={() => handleFieldChange('contentAlign', 'center')}
              className="text-tech-accent focus:ring-tech-accent border-theme-divider"
            />
            居中
          </label>
          <label className={radioCls}>
            <input
              type="radio"
              name="hero-align"
              checked={align === 'left'}
              onChange={() => handleFieldChange('contentAlign', 'left')}
              className="text-tech-accent focus:ring-tech-accent border-theme-divider"
            />
            左对齐
          </label>
        </div>
      </div>

      {/* 遮罩浓度 */}
      <div className="space-y-2">
        <label className={labelCls}>背景遮罩浓度 {Math.round(overlay * 100)}%</label>
        <input
          type="range"
          min={0}
          max={0.8}
          step={0.05}
          value={overlay}
          onChange={(e) => handleFieldChange('overlayOpacity', Number(e.target.value))}
          className="w-full accent-tech-accent"
        />
        <p className="text-xs text-theme-textSecondary">数值越低背景图越清晰，文字对比度随之降低。</p>
      </div>

      {/* Ken Burns 开关 */}
      <label className="flex items-center justify-between">
        <span className="text-sm text-theme-textPrimary">背景缓慢缩放（Ken Burns）</span>
        <input
          type="checkbox"
          checked={formData.enableKenBurns !== false}
          onChange={(e) => handleFieldChange('enableKenBurns', e.target.checked)}
          className="rounded border-theme-divider text-tech-accent focus:ring-tech-accent"
        />
      </label>
    </div>
  )
}

export default HeroEditor