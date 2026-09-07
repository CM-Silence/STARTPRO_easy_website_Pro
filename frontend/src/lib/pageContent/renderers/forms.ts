import { escapeHtml, renderHeading, renderParagraph, wrapSection } from '../utils'

export const renderContactForm = (component: any): string => {
  const { props = {} } = component
  const { title, subtitle, fields = [] } = props
  const inputs = fields
    .map((field: any) => {
      const required = field.required ? ' required' : ''
      if (field.type === 'textarea') {
        return `<div class="form-group">
          <label>${escapeHtml(field.label || field.name || '')}${field.required ? ' *' : ''}</label>
          <textarea name="${escapeHtml(field.name || '')}"${required}></textarea>
        </div>`
      }
      return `<div class="form-group">
        <label>${escapeHtml(field.label || field.name || '')}${field.required ? ' *' : ''}</label>
        <input type="${escapeHtml(field.type || 'text')}" name="${escapeHtml(field.name || '')}"${required} />
      </div>`
    })
    .join('')
  return wrapSection(
    'contact-form',
    `${renderHeading('h2', title)}${renderParagraph(subtitle)}<form>${inputs}<button type="submit">提交</button></form>`
  )
}

export const renderFaqSection = (component: any): string => {
  const { props = {} } = component
  const { title, subtitle, faqs = [] } = props
  const items = faqs
    .map((faq: any) => `<div class="faq-item">
      ${renderHeading('h3', faq.question)}
      ${renderParagraph(faq.answer)}
    </div>`)
    .join('')
  return wrapSection('faq-section', `${renderHeading('h2', title)}${renderParagraph(subtitle)}${items}`)
}

// HTML 兜底渲染：用原生 <details>/<summary> 免 JS 实现折叠（与 React 预览视觉不一致属既有体系现状）
export const renderAccordion = (component: any): string => {
  const { props = {} } = component
  const { title, subtitle, items = [] } = props
  const rendered = items
    .map((item: any) => {
      const meta = (item.meta || [])
        .map((m: any) => `<span class="accordion__meta-item">${escapeHtml(m.text || '')}</span>`)
        .join('')
      return `<details class="accordion__item">
      <summary class="accordion__summary">
        <span class="accordion__title">${escapeHtml(item.title || '')}</span>
        <span class="accordion__meta">${meta}</span>
      </summary>
      <div class="accordion__body">${item.content || ''}</div>
    </details>`
    })
    .join('')
  return wrapSection('accordion', `${renderHeading('h2', title)}${renderParagraph(subtitle)}${rendered}`)
}
