import React from 'react'
import { TemplateComponent } from '@/types/templates'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export const HeroPreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const { t } = useTranslation('common')
  const {
    title,
    subtitle,
    backgroundImage,
    buttonText,
    buttonLink,
    backgroundColor,
    widthOption = 'full',
    backgroundColorOption = 'default',
    imageHeightMode = 'fixed',
    titleColorMode = 'default',
    customTitleColor = '',
    subtitleColorMode = 'default',
    customSubtitleColor = '',
    // 首屏质感（新增，默认值保证旧组件安全）
    contentAlign = 'center',
    overlayOpacity = 0.45,
    enableKenBurns = true
  } = component.props
  const reduceMotion = useReducedMotion()
  const [bgImageLoaded, setBgImageLoaded] = React.useState(false)
  const [bgImageError, setBgImageError] = React.useState(false)

  // 预加载背景图片
  React.useEffect(() => {
    if (backgroundImage) {
      setBgImageLoaded(false)
      setBgImageError(false)
      const img = new Image()
      img.onload = () => setBgImageLoaded(true)
      img.onerror = () => {
        console.error('Background image failed to load:', backgroundImage)
        setBgImageError(true)
      }
      img.src = backgroundImage
    } else {
      setBgImageLoaded(false)
      setBgImageError(false)
    }
  }, [backgroundImage])

  const shouldShowBackgroundImage = backgroundImage && bgImageLoaded && !bgImageError
  const useAutoHeight = imageHeightMode === 'auto' && shouldShowBackgroundImage
  // 仅当启用 Ken Burns 且为定高背景图时才用 <img> 层做缓慢缩放；否则退回内联背景
  const useKenBurns = enableKenBurns && !useAutoHeight && shouldShowBackgroundImage

  const heroStyle = {
    backgroundColor: backgroundColorOption === 'transparent'
      ? undefined
      : backgroundColor || 'var(--color-primary, #3B82F6)',
    backgroundImage: shouldShowBackgroundImage && !useKenBurns && !useAutoHeight
      ? `url(${backgroundImage})`
      : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }

  const containerClass = `${widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full'} ${backgroundColorOption === 'transparent' ? '' : 'bg-color-surface'}`

  const alignClass =
    contentAlign === 'left'
      ? 'items-start justify-center text-left'
      : 'items-center justify-center text-center'

  return (
    <div className={containerClass}>
      <div
        className={`hero-preview relative overflow-hidden ${useAutoHeight ? '' : `min-h-[520px] flex ${alignClass} py-24`} group transition-all duration-300`}
        style={heroStyle}
      >
        {useAutoHeight && (
          <img src={backgroundImage} alt={title || 'Hero'} className="w-full h-auto block" />
        )}

        {/* Ken Burns 背景层 */}
        {useKenBurns && (
          <img
            src={backgroundImage}
            alt={title || 'Hero'}
            className={`absolute inset-0 w-full h-full object-cover ${reduceMotion ? '' : 'kenburns'}`}
          />
        )}

        {/* 半透明渐变遮罩（提升文字可读性 & 华丽层次） */}
        {shouldShowBackgroundImage && backgroundColorOption !== 'transparent' && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(180deg, rgba(10,12,20,${Math.min(overlayOpacity, 0.75)}) 0%, rgba(10,12,20,${Math.max(overlayOpacity - 0.12, 0.08)}) 45%, rgba(10,12,20,${Math.max(overlayOpacity - 0.2, 0.05)}) 100%)` }} />
        )}

        {/* 玻璃拟态光斑装饰 */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[38%] h-[60%] bg-primary/15 blur-3xl rounded-full animate-glow" />
          <div className="absolute bottom-[-15%] right-[-8%] w-[42%] h-[60%] bg-secondary/18 blur-3xl rounded-full animate-glow" style={{ animationDelay: '1.2s' }} />
          <div className="absolute inset-0 backdrop-saturate-110" />
        </div>

        {/* 图片加载提示 */}
        {backgroundImage && !bgImageLoaded && !bgImageError && (
          <div className={`absolute inset-0 flex items-center justify-center ${backgroundColorOption === 'transparent' ? '' : 'bg-color-surface'}`}>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-text-primary border-t-transparent mx-auto mb-2"></div>
          </div>
        )}
        {backgroundImage && bgImageError && (
          <div className="absolute top-2 right-2 bg-error/80 text-text-primary text-xs px-2 py-1 rounded">{t('hero.loadImageError')}</div>
        )}

        {/* 主内容 */}
        <motion.div
          className={`relative w-full px-6 md:px-12 z-10 ${contentAlign === 'left' ? 'max-w-3xl' : 'max-w-5xl mx-auto'}`}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {title && (
            <motion.h1
              className={`hero-title text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.08] text-text-primary`}
              style={titleColorMode === 'custom' && customTitleColor ? { color: customTitleColor } : undefined}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {title}
            </motion.h1>
          )}

          {subtitle && (
            <motion.p
              className={`hero-subtitle ${contentAlign === 'left' ? 'mx-0' : 'mx-auto'} text-lg md:text-2xl mb-10 leading-relaxed font-light text-text-secondary max-w-2xl`}
              style={subtitleColorMode === 'custom' && customSubtitleColor ? { color: customSubtitleColor } : undefined}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {subtitle}
            </motion.p>
          )}

          {buttonText && buttonLink && (
            <motion.a
              href={buttonLink}
              className={`inline-flex items-center px-8 py-4 rounded-full font-semibold text-lg shadow-2xl transition-all duration-300 hover:shadow-text-primary/15 ${contentAlign === 'left' ? '' : ''} bg-color-surface text-color-text-primary`}
              style={{ boxShadow: '0 12px 40px -8px rgba(0,212,255,0.35)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.96 }}
            >
              <span>{buttonText}</span>
              <motion.div
                className="ml-2 text-xl"
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              >
                →
              </motion.div>
            </motion.a>
          )}
        </motion.div>

        {/* 底部装饰 - 非透明时渐变过渡 */}
        {backgroundColorOption !== 'transparent' && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-color-surface/25 to-transparent pointer-events-none"></div>
        )}
      </div>
    </div>
  )
}

// 图文展示-上下结构-auto预览

// 文本区块预览