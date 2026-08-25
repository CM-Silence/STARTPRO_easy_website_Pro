import React from 'react'
import { TemplateComponent } from '@/types/templates'

export const LogoWallPreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const {title = '合作伙伴', subtitle = '值得信赖的合作伙伴网络', logos = [], shape = 'rounded', widthOption = 'full', backgroundColorOption = 'default'} = component.props || {}

  // 根据宽度选项设置容器类名
  const containerClass = `${widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full'} ${backgroundColorOption === 'transparent' ? '' : 'bg-color-surface'}`;

  // 如果logos为空，提供默认的演示数据
  const displayLogos = logos.length > 0 ? logos : [
    { alt: '合作伙伴 1' },
    { alt: '合作伙伴 2' },
    { alt: '合作伙伴 3' },
    { alt: '合作伙伴 4' },
    { alt: '合作伙伴 5' },
    { alt: '合作伙伴 6' }
  ]

  // 根据形状选项设置容器类名
  const getContainerClass = (shapeParam: string) => {
    switch (shapeParam) {
      case 'square':
        return 'flex items-center justify-center p-4 transition-all duration-300 bg-transparent border border-transparent'
      case 'rounded':
        return 'flex items-center justify-center p-4 rounded-lg transition-all duration-300 border border-transparent bg-transparent'
      case 'circle':
        return 'flex items-center justify-center p-4 rounded-full transition-all duration-300 border border-transparent bg-transparent'
      case 'rounded-rectangle':
        return 'flex items-center justify-center p-4 rounded-2xl transition-all duration-300 border border-transparent bg-transparent'
      default:
        return 'flex items-center justify-center p-4 rounded-lg transition-all duration-300 border border-transparent bg-transparent'
    }
  }

  return (
    <div className={containerClass}>
      <div className={`p-8 rounded-lg shadow-sm ${backgroundColorOption === 'transparent' ? '' : 'bg-color-surface'}`}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-text-primary">{title}</h2>
          {subtitle && <p className="text-lg text-text-secondary w-full">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {displayLogos.map((logo: any, index: number) => (
            <div key={index} className={getContainerClass(shape)}>
              {logo.image ? (
                <div className="flex items-center justify-center w-full h-24">
                  <img
                    src={logo.image}
                    alt={logo.alt || `Logo ${index + 1}`}
                    className="w-full h-full object-contain transition-transform duration-300 hover:scale-110"
                    onError={(e) => {
                      console.error('Logo image failed to load:', logo.image)
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              ) : (
                <div className="text-text-tertiary text-center w-full h-24 flex items-center justify-center">
                  <div className="text-2xl">🏢</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 图文展示预览
