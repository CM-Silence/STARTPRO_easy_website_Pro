import React from 'react'
import { TemplateComponent } from '@/types/templates'
import { useTranslation } from 'react-i18next'

export const CallToActionPreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const { t } = useTranslation('common')
  const {
    title,
    subtitle,
    buttonText,
    buttonLink,
    backgroundColor,
    widthOption = 'full',
    backgroundColorOption = 'default',
    titleColorMode = 'default',
    customTitleColor = '',
    subtitleColorMode = 'default',
    customSubtitleColor = '',
    buttonColorMode = 'default',
    customButtonColor = ''
  } = component.props

  const containerClass = `${widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full'}`

  const ctaStyle = backgroundColorOption === 'transparent'
    ? {}
    : (backgroundColor ? { backgroundColor } : {})

  const titleStyle = titleColorMode === 'custom' && customTitleColor
    ? { color: customTitleColor }
    : undefined

  const subtitleStyle = subtitleColorMode === 'custom' && customSubtitleColor
    ? { color: customSubtitleColor }
    : undefined

  const buttonStyle = buttonColorMode === 'custom' && customButtonColor
    ? { color: customButtonColor }
    : undefined

  return (
    <div className={containerClass}>
      <div
        className="call-to-action-preview p-12 rounded-lg text-center text-text-primary relative overflow-hidden"
        style={ctaStyle}
      >
      <div className="call-to-action-content relative z-10">
        <h2
          className="call-to-action-title text-4xl font-bold mb-6 text-text-primary"
          style={titleStyle}
        >
          {title || t('cta.defaultTitle')}
        </h2>
        {subtitle && (
          <p
            className="call-to-action-subtitle text-xl mb-8 opacity-90 w-full leading-relaxed text-text-secondary"
            style={subtitleStyle}
          >
            {subtitle}
          </p>
        )}
        {buttonText && (
          <a
            href={buttonLink || '#'}
            className="call-to-action-button inline-block bg-text-primary text-color-background px-8 py-4 rounded-lg font-medium hover:bg-color-surface hover:text-text-primary transition-all duration-300 transform hover:scale-105 shadow-lg"
            style={buttonStyle}
          >
            {buttonText}
          </a>
        )}
      </div>

      <div className="call-to-action-decoration-1 absolute top-0 right-0 w-32 h-32 bg-text-primary/10 rounded-full -mr-16 -mt-16"></div>
      <div className="call-to-action-decoration-2 absolute bottom-0 left-0 w-24 h-24 bg-text-primary/10 rounded-full -ml-12 -mb-12"></div>
    </div>
  </div>
  )
}

// FAQ问答预览
