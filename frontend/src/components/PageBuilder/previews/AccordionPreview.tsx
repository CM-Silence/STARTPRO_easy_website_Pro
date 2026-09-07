import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { TemplateComponent } from '@/types/templates'
import { motion } from 'framer-motion'
import DOMPurify from 'isomorphic-dompurify'
import { isAssetUrl, sanitizeInlineSvg, getIconColorStyle } from './common'

/* 样式见 styles/accordion-preview.css */

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

/* 小尺寸图标（标题/元信息，14px）：
   - 素材 URL：默认原色 <img>；指定自定义颜色时用遮罩方式着色（与其它组件的统一颜色行为一致）
   - 内联 SVG / emoji：继承父级颜色 */
const renderSmallIcon = (icon: string, customColor?: string) => {
  if (!icon) return null
  if (isAssetUrl(icon)) {
    if (customColor) {
      return (
        <span
          className="pa-icon-mask"
          style={{
            backgroundColor: customColor,
            WebkitMaskImage: `url(${icon})`,
            maskImage: `url(${icon})`,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: 'contain',
            maskSize: 'contain'
          }}
        />
      )
    }
    return <img src={icon} alt="" className="pa-icon-img" />
  }
  if (icon.trim().startsWith('<svg')) {
    return (
      <span
        className="pa-icon-svg"
        dangerouslySetInnerHTML={{ __html: sanitizeInlineSvg(icon) }}
      />
    )
  }
  return <span className="pa-icon-emoji">{icon}</span>
}

const AccordionItemView: React.FC<{ item: any; customIconColor?: string }> = ({ item, customIconColor }) => {
  const [open, setOpen] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState(2000)

  const sanitizedContent = useMemo(
    () => DOMPurify.sanitize(typeof item?.content === 'string' ? item.content : ''),
    [item?.content]
  )

  const meta: any[] = Array.isArray(item?.meta) ? item.meta : []

  // 展开时实测内容高度（含 padding）作为 max-height，避免「固定 2000px 起步」造成的先顿后收
  useLayoutEffect(() => {
    if (open && bodyRef.current) {
      setMaxHeight(bodyRef.current.scrollHeight + 1)
    }
  }, [open, sanitizedContent])

  return (
    <div className={`pa-job-card ${open ? '' : 'pa-collapsed'}`}>
      <div className="pa-job-header" onClick={() => setOpen((prev) => !prev)}>
        <div className="pa-job-header-left">
          <h2 className="pa-job-title">
            {item.icon && (
              <span className="pa-job-title-icon" style={customIconColor ? { color: customIconColor } : undefined}>
                {renderSmallIcon(item.icon, customIconColor)}
              </span>
            )}
            <span>{item.title || '折叠标题'}</span>
          </h2>
          {meta.length > 0 && (
            <div className="pa-job-meta">
              {meta.map((metaItem, metaIndex) => (
                <span key={metaIndex} className="pa-job-meta-item">
                  {metaItem.icon && (
                    <span
                      className="pa-job-meta-icon"
                      style={customIconColor ? { color: customIconColor } : undefined}
                    >
                      {renderSmallIcon(metaItem.icon, customIconColor)}
                    </span>
                  )}
                  {metaItem.text}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="pa-job-header-arrow">
          <ChevronDownIcon />
        </div>
      </div>
      <div className="pa-job-body" ref={bodyRef} style={open ? { maxHeight } : undefined}>
        <div className="pa-job-body-inner" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
      </div>
    </div>
  )
}

export const AccordionPreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const { title, subtitle, items = [] } = component.props
  // 编辑器选择「统一颜色」时生效（素材图标用遮罩着色），否则维持默认外观
  const customIconColor = getIconColorStyle(component.props)?.color

  return (
    <div className="w-full">
      {title && (
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-text-primary bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xl text-text-secondary w-full leading-relaxed">
              {subtitle}
            </p>
          )}
        </motion.div>
      )}

      <div>
        {(items || []).map((item: any, index: number) => (
          <AccordionItemView key={index} item={item} customIconColor={customIconColor} />
        ))}
      </div>
    </div>
  )
}
