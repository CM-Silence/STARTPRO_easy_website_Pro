import React from 'react'
import { TemplateComponent } from '@/types/templates'

export const TestimonialsPreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const {title, subtitle, testimonials = [], widthOption = 'full', backgroundColorOption = 'default'} = component.props

  // 根据宽度选项设置容器类名
  const containerClass = widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full';

    // 根据背景色选项设置组件内部背景色
  const componentClass = backgroundColorOption === 'transparent' ? 'testimonials-preview p-8 rounded-lg shadow-sm' : 'testimonials-preview bg-color-surface p-8 rounded-lg shadow-sm';
return (
    <div className={containerClass}>
      <div className={componentClass}>
      {title && (
        <div className="testimonials-header text-center mb-12">
          <h2 className="testimonials-title text-3xl font-bold mb-4 text-text-primary">{title}</h2>
          {subtitle && <p className="testimonials-subtitle text-lg text-text-secondary w-full">{subtitle}</p>}
        </div>
      )}
      <div className="testimonials-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {testimonials.map((testimonial: any, index: number) => (
          <div key={index} className="testimonial-card bg-color-background rounded-lg p-6 relative">
            <p className="testimonial-content text-text-secondary mb-6 italic">
              {testimonial.content || '评价内容'}
            </p>
            <div className="testimonial-author flex items-center">
              <div className="testimonial-avatar-container w-12 h-12 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                {testimonial.avatar ? (
                  <img
                    key={`${testimonial.avatar}-${index}`}
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="testimonial-avatar w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Testimonial avatar failed to load:', testimonial.avatar)
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="text-text-tertiary">👤</span>
                )}
              </div>
              <div>
                <div className="testimonial-name font-semibold text-text-primary">
                  {testimonial.name || '姓名'}
                </div>
                <div className="testimonial-role text-sm text-text-secondary">
                  {testimonial.role || '职位'}
                </div>
                <div className="testimonial-rating flex items-center mt-1">
                  {Array.from({ length: testimonial.rating || 5 }, (_, i) => (
                    <span key={i} className="text-primary">★</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
  )
}

// 新闻列表预览
