import React from 'react'
import { TemplateComponent } from '@/types/templates'
import { motion } from 'framer-motion'
import { renderIconVisual, getIconColorStyle } from './common'
import { HoverFX } from '@/components/motion'
import { grabMotionSettings } from '@/styles/motion-presets'

export const FeatureGridMultiPreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const { title, subtitle, features = [], widthOption = 'full', backgroundColorOption = 'default' } = component.props
  const iconColorStyle = getIconColorStyle(component.props)
  const motionSettings = grabMotionSettings(component.props)
  const hover = motionSettings.hover
  const hoverEnabled = hover !== 'none'
  const hoverDuration = motionSettings.hoverDuration

  // 根据宽度选项设置容器类名
  const containerClass = widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full'
  // 根据背景色选项设置组件内部背景色
  const componentClass = backgroundColorOption === 'transparent' ? 'p-8 rounded-xl' : 'bg-gradient-to-br from-color-background to-color-surface p-8 rounded-xl'

  return (
    <div className={containerClass}>
      <div className={componentClass}>
        {title && (
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-text-primary bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xl text-text-secondary w-full leading-relaxed">
                {subtitle}
              </p>
            )}
          </motion.div>
        )}

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch ${
          parseInt(component.props.cardsPerRow) === 1 ? 'lg:grid-cols-1' :
          parseInt(component.props.cardsPerRow) === 2 ? 'lg:grid-cols-2' :
          parseInt(component.props.cardsPerRow) === 4 ? 'lg:grid-cols-4' :
          parseInt(component.props.cardsPerRow) === 5 ? 'lg:grid-cols-5' :
          parseInt(component.props.cardsPerRow) === 6 ? 'lg:grid-cols-6' :
          'lg:grid-cols-3'
        }`}>
          {(features || []).map((feature: any, index: number) => (
            <HoverFX
              key={index}
              hover={hover}
              duration={grabMotionSettings(component.props).hoverDuration}
              className={`relative bg-color-surface p-6 rounded-2xl shadow-lg border border-color-border overflow-hidden flex flex-col ${hoverEnabled ? "group/card" : ""}`}
            >
              {/* 右上角装饰圆（与普通功能网格一致，悬浮特效门控） */}
              <div
                className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full -mr-10 -mt-10 pointer-events-none ${hoverEnabled ? 'group-hover/card:scale-150 transition-transform' : ''}`}
                style={hoverEnabled ? { transitionDuration: `${hoverDuration}s` } : undefined}
              />

              {/* 卡片头：图标 + 主标题 */}
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                  {renderIconVisual(feature.icon, {
                    wrapperClassName: 'w-8 h-8 flex items-center justify-center',
                    imageClassName: 'w-8 h-8 object-contain',
                    colorStyle: iconColorStyle
                  })}
                </div>
                <h3 className="text-lg font-bold text-text-primary leading-snug">
                  {feature.title || '功能标题'}
                </h3>
              </div>

              {/* 子功能列表 */}
              <ul className="mt-4 space-y-2 relative z-10 flex-1">
                {((feature.items || []) as any[]).map((item: any, itemIndex: number) => (
                  <li key={itemIndex} className="flex items-start gap-2 text-sm text-text-primary leading-relaxed">
                    {item.icon ? (
                      <span className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
                        {renderIconVisual(item.icon, {
                          wrapperClassName: 'w-4 h-4 flex items-center justify-center',
                          imageClassName: 'w-4 h-4 object-contain',
                          colorStyle: iconColorStyle
                        })}
                      </span>
                    ) : (
                      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="#10b981" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span>{item.text || '子功能内容'}</span>
                  </li>
                ))}
              </ul>

              {/* 底部装饰线 */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent origin-left" />
            </HoverFX>
          ))}
        </div>
      </div>
    </div>
  )
}
