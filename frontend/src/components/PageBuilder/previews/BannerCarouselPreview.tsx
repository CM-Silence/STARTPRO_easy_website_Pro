import React, { useEffect, useState, useRef } from "react"
import { TemplateComponent } from "@/types/templates"

const getOverlayPositionClass = (
  position?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
) => {
  switch (position) {
    case 'top-left':
      return 'top-6 left-6 md:top-10 md:left-10'
    case 'top-center':
      return 'top-6 left-1/2 -translate-x-1/2'
    case 'top-right':
      return 'top-6 right-6 md:top-10 md:right-10'
    case 'center-left':
      return 'top-1/2 left-6 md:left-10 -translate-y-1/2'
    case 'center-right':
      return 'top-1/2 right-6 md:right-10 -translate-y-1/2'
    case 'bottom-left':
      return 'bottom-6 left-6 md:bottom-10 md:left-10'
    case 'bottom-center':
      return 'bottom-6 left-1/2 -translate-x-1/2'
    case 'bottom-right':
      return 'bottom-6 right-6 md:bottom-10 md:right-10'
    default:
      return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  }
}

export const BannerCarouselPreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const {
    title,
    subtitle,
    slides = [],
    autoPlay = true,
    interval = 5000,
    showIndicators = true,
    showArrows = true,
    widthOption = 'full',
    backgroundColorOption = 'default',
    imageHeightMode = 'fixed',
    titleColorMode = 'default',
    customTitleColor = '',
    subtitleColorMode = 'default',
    customSubtitleColor = '',
    buttonColorMode = 'default',
    customButtonColor = ''
  } = component.props

  const containerClass = `${widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full'} ${
    backgroundColorOption === 'transparent' ? '' : 'bg-color-surface'
  }`

  const [currentIndex, setCurrentIndex] = useState(0)
  const [allImagesLoaded, setAllImagesLoaded] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const slideCount = slides.length

  // 重置并启动自动播放（手动切页时调用以重置计时，避免连续翻页）
  const startAutoplay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (!autoPlay || slideCount <= 1) return
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slideCount)
    }, interval || 5000)
  }

  const goTo = (index: number) => {
    setCurrentIndex(((index % slideCount) + slideCount) % slideCount)
    startAutoplay()
  }
  const goPrev = () => goTo(currentIndex - 1)
  const goNext = () => goTo(currentIndex + 1)

  useEffect(() => {
    setCurrentIndex(0)
  }, [slideCount])

  // 图片预加载
  useEffect(() => {
    setAllImagesLoaded(false)
    const imageUrls = slides.map((s: any) => s.image).filter(Boolean) as string[]
    if (imageUrls.length === 0) {
      setAllImagesLoaded(true)
      return
    }
    let cancelled = false
    let loaded = 0
    imageUrls.forEach((src: string) => {
      const img = new Image()
      img.onload = img.onerror = () => {
        loaded++
        if (loaded >= imageUrls.length && !cancelled) {
          setAllImagesLoaded(true)
        }
      }
      img.src = src
    })
    return () => { cancelled = true }
  }, [slides])

  // 自动播放
  useEffect(() => {
    startAutoplay()
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoPlay, interval, slideCount])

  // 占位态
  if (slideCount === 0) {
    return (
      <div className={containerClass}>
        <div className="relative overflow-hidden bg-gray-200 dark:bg-gray-700 banner-carousel-preview">
          <div className="relative w-full h-96 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-5xl mb-4">🖼️</div>
              <h3 className="text-2xl font-bold mb-2">横幅轮播图</h3>
              <p className="text-lg opacity-90">自动播放的图片轮播组件</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const useAutoHeight = imageHeightMode === 'auto'

  // 控件亮暗色：跟随当前幻灯片的 overlayTheme（亮=深色控件，暗=浅色控件）
  const currentSlide = slides[currentIndex] || slides[0] || {}
  const overlayTheme = currentSlide.overlayTheme === 'dark' ? 'dark' : 'light'
  const arrowCls =
    overlayTheme === 'dark'
      ? 'bg-black/40 text-white hover:bg-white hover:text-[var(--color-text-primary)]'
      : 'bg-color-surface/70 text-text-primary hover:bg-text-primary hover:text-white'
  const dotCls =
    overlayTheme === 'dark' ? 'bg-white/60 hover:bg-white' : 'bg-text-primary/50 hover:bg-text-primary/70'
  const dotActiveCls = overlayTheme === 'dark' ? 'bg-white' : 'bg-text-primary'

  return (
    <div className={containerClass}>
      <div className="relative overflow-hidden bg-color-background banner-carousel-preview">
        {/* 滑动容器 - 渲染全部幻灯片 */}
        <div
          className={`relative w-full ${useAutoHeight ? '' : 'h-96 md:h-[480px]'} banner-slide-container`}
        >
          <div
            className={`flex w-full ${useAutoHeight ? '' : 'h-full'} transition-transform duration-500 ease-in-out will-change-transform`}
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
              opacity: allImagesLoaded ? 1 : 0,
              transition: 'transform 500ms ease-in-out, opacity 300ms ease-in-out'
            }}
          >
            {slides.map((slide: any, index: number) => (
              <div
                key={slide.image ? `${slide.image}-${index}` : index}
                className={`relative w-full flex-shrink-0 ${useAutoHeight ? '' : 'h-full'}`}
              >
                {/* 背景图片 */}
                {useAutoHeight && slide.image ? (
                  <>
                    <img
                      src={slide.image}
                      alt={slide.title || 'banner'}
                      className="w-full h-auto block"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                    <div className="absolute inset-0 bg-black/25" />
                  </>
                ) : (
                  <div className="absolute inset-0">
                    {slide.image ? (
                      <img
                        src={slide.image}
                        alt={slide.title || 'banner'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/70 to-secondary/70 flex items-center justify-center">
                        <div className="text-5xl opacity-50">???</div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/25" />
                  </div>
                )}

                {/* 文字叠加 */}
                <div className={`absolute ${getOverlayPositionClass(slide.overlayPosition)} z-10 banner-slide-content-container px-4 md:px-6`}>
                  <div className="w-full sm:max-w-3xl bg-color-surface/70 backdrop-blur-sm rounded-xl p-4 md:p-6 lg:p-8 banner-slide-content">
                    {slide.title && (
                      <h2
                        className="text-xl md:text-2xl lg:text-3xl font-bold text-text-primary mb-3 md:mb-4 leading-tight banner-slide-title"
                        style={
                          slide.titleColor
                            ? { color: slide.titleColor }
                            : titleColorMode === 'custom' && customTitleColor
                            ? { color: customTitleColor }
                            : undefined
                        }
                      >
                        {slide.title}
                      </h2>
                    )}
                    {slide.description && (
                      <p
                        className="text-sm md:text-base lg:text-lg text-text-secondary mb-4 md:mb-6 opacity-90 banner-slide-description"
                        style={
                          slide.descriptionColor
                            ? { color: slide.descriptionColor }
                            : subtitleColorMode === 'custom' && customSubtitleColor
                            ? { color: customSubtitleColor }
                            : undefined
                        }
                      >
                        {slide.description}
                      </p>
                    )}
                    {slide.buttonText && (
                      <a
                        href={slide.buttonLink || '#'}
                        className="inline-block px-6 py-3 bg-primary text-text-primary font-medium rounded-lg hover:bg-secondary transition-colors duration-300 banner-slide-button dark:text-white"
                        style={
                          buttonColorMode === 'custom' && customButtonColor
                            ? { color: customButtonColor }
                            : undefined
                        }
                      >
                        {slide.buttonText}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

          {showIndicators && slideCount > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20 banner-indicators">
              {slides.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={() => goTo(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentIndex ? `${dotActiveCls} w-6` : dotCls
                  }`}
                  aria-label={`切换到第${index + 1}张幻灯片`}
                />
              ))}
            </div>
          )}

          {showArrows && slideCount > 1 && (
            <>
              <button
                onClick={goPrev}
                className={`absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 ${arrowCls} p-2 rounded-full shadow-sm transition-colors z-20 banner-arrow banner-arrow-left`}
                aria-label="上一张"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={goNext}
                className={`absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 ${arrowCls} p-2 rounded-full shadow-sm transition-colors z-20 banner-arrow banner-arrow-right`}
                aria-label="下一张"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
        </div>

      {(title || subtitle) && (
        <div className="p-4 bg-color-surface banner-info-container">
          <div className="text-center">
            {title && (
              <h3
                className="font-bold text-text-primary mb-1 banner-info-title"
                style={titleColorMode === 'custom' && customTitleColor ? { color: customTitleColor } : undefined}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                className="text-sm text-text-secondary banner-info-subtitle"
                style={subtitleColorMode === 'custom' && customSubtitleColor ? { color: customSubtitleColor } : undefined}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 横幅轮播图实际组件（已发布页）
export const BannerCarousel: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const {
    title,
    subtitle,
    slides = [],
    autoPlay = true,
    interval = 5000,
    showIndicators = true,
    showArrows = true,
    widthOption = 'full',
    backgroundColorOption = 'default',
    imageHeightMode = 'fixed',
    titleColorMode = 'default',
    customTitleColor = '',
    subtitleColorMode = 'default',
    customSubtitleColor = '',
    buttonColorMode = 'default',
    customButtonColor = ''
  } = component.props
  const containerClass = `${widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full'} ${
    backgroundColorOption === 'transparent' ? '' : 'bg-color-surface'
  }`

  const BannerCarouselComponent = require('@/components/BannerCarousel').default

  return (
    <div className={containerClass}>
      <BannerCarouselComponent
        slides={slides}
        autoPlay={autoPlay}
        interval={interval}
        showIndicators={showIndicators}
        showArrows={showArrows}
        imageHeightMode={imageHeightMode}
        titleColorMode={titleColorMode}
        customTitleColor={customTitleColor}
        subtitleColorMode={subtitleColorMode}
        customSubtitleColor={customSubtitleColor}
        buttonColorMode={buttonColorMode}
        customButtonColor={customButtonColor}
        className="overflow-hidden"
      />

      {/* 仅保留标题与副标题信息 */}
      {(title || subtitle) && (
        <div className="p-4 bg-color-surface banner-info-container">
          <div className="text-center">
            {title && (
              <h3
                className="font-bold text-text-primary mb-1 banner-info-title"
                style={titleColorMode === 'custom' && customTitleColor ? { color: customTitleColor } : undefined}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                className="text-sm text-text-secondary banner-info-subtitle"
                style={subtitleColorMode === 'custom' && customSubtitleColor ? { color: customSubtitleColor } : undefined}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
