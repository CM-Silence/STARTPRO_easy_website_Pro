import React from 'react'
import { TemplateComponent } from '@/types/templates'
import { motion } from 'framer-motion'
import { renderIconVisual, getIconColorStyle } from './common'
import { HoverFX } from '@/components/motion'
import { grabMotionSettings } from '@/styles/motion-presets'
import { useTranslation } from 'react-i18next'

export const FeatureGridLargePreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const { t } = useTranslation('common')
  const {title, subtitle, features = [], widthOption = 'full', backgroundColorOption = 'default'} = component.props
  const iconColorStyle = getIconColorStyle(component.props)
  const hover = grabMotionSettings(component.props).hover

  // 根据宽度选项设置容器类名
  const containerClass = widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full';
  // 根据背景色选项设置组件内部背景色
  const componentClass = backgroundColorOption === 'transparent' ? 'feature-grid-large-preview p-8 rounded-xl' : 'feature-grid-large-preview bg-gradient-to-br from-color-background to-color-surface p-8 rounded-xl';

  return (
    <div className={containerClass}>
      <div className={componentClass}>
      {title && (
        <motion.div
          className="feature-grid-large-header text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="feature-grid-large-title text-4xl md:text-5xl font-bold mb-6 text-text-primary bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
            {title}
          </h2>
          {subtitle && (
            <p className="feature-grid-large-subtitle text-xl text-text-secondary w-full leading-relaxed">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}

      <div className={`feature-grid-large-container grid grid-cols-1 md:grid-cols-2 gap-8 ${
        parseInt(component.props.cardsPerRow) === 1 ? 'lg:grid-cols-1' :
        parseInt(component.props.cardsPerRow) === 2 ? 'lg:grid-cols-2' :
        parseInt(component.props.cardsPerRow) === 4 ? 'lg:grid-cols-4' :
        parseInt(component.props.cardsPerRow) === 5 ? 'lg:grid-cols-5' :
        parseInt(component.props.cardsPerRow) === 6 ? 'lg:grid-cols-6' :
        'lg:grid-cols-3'
      }`}>
        {features.map((feature: any, index: number) => (
          <HoverFX
            key={index}
            hover={hover}
            duration={grabMotionSettings(component.props).hoverDuration}
            className={`feature-large-card group relative p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-200 border border-color-border hover:border-primary overflow-hidden ${backgroundColorOption === 'transparent' ? '' : 'bg-color-surface'}`}
          >
            {/* 背景装饰 */}
            <div className="feature-large-card-decoration absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-200"></div>

            {/* 大图图标 */}
              <div className="feature-large-icon-container relative mb-6">
                <div className="feature-large-icon w-full mx-auto bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl flex items-center justify-center overflow-hidden">
                  {feature.icon ? (
                    renderIconVisual(feature.icon, {
                      wrapperClassName: 'w-full min-h-[200px] flex items-center justify-center p-4',
                      imageClassName: 'w-full h-auto max-h-[320px] object-contain',
                      colorStyle: iconColorStyle
                    })
                  ) : (
                    <div className="w-full min-h-[200px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🖼️</div>
                        <p className="text-text-tertiary">上传图片</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            {/* 内容 */}
            <div className="text-center relative z-10">
              <h3 className="text-xl font-bold mb-4 text-text-primary group-hover:text-accent transition-colors">
                {feature.title || '功能标题'}
              </h3>
              <p className="text-text-secondary leading-relaxed">
                {feature.description || '功能描述'}
              </p>
            </div>

            {/* 链接按钮 */}
            {feature.link && (
              <div className="mt-6 text-center">
                <a
                  href={feature.link}
                  className="inline-flex items-center text-primary hover:text-secondary font-medium transition-colors duration-200"
                >
                  {t('ui.readMore')}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            )}

            {/* 底部装饰线 */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
          </HoverFX>
        ))}
      </div>
    </div>
  </div>
  )
}
