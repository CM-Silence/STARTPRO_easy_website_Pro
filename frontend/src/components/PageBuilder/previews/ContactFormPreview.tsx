import React, { useMemo, useState } from 'react'
import { TemplateComponent } from '@/types/templates'
import toast from 'react-hot-toast'

export const ContactFormPreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const { title, subtitle, fields = [], widthOption = 'full', backgroundColorOption = 'default' } = component.props

  const initialValues = useMemo(() => {
    const defaults: Record<string, string> = {}
    fields.forEach((field: any) => {
      if (field?.name) defaults[field.name] = ''
    })
    return defaults
  }, [fields])

  const [formValues, setFormValues] = useState<Record<string, string>>(initialValues)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const containerClass = widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full'
  const componentClass =
    backgroundColorOption === 'transparent'
      ? 'contact-form-preview max-w-3xl mx-auto p-6 rounded-lg'
      : 'contact-form-preview max-w-3xl mx-auto bg-color-surface p-6 rounded-lg'

  const handleChange = (name: string, value: string) => {
    setFormValues(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    // 后台预览不提交
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      toast.error('当前为后台预览，表单不提交')
      return
    }
    if (isSubmitting) return

    const payloadFields = (fields || []).map((field: any) => ({
      name: field?.name || '',
      label: field?.label || field?.name || '',
      type: field?.type || 'text',
      value: formValues[field?.name || ''] || '',
      required: !!field?.required,
      options: field?.options || []
    }))

    const missing = payloadFields.find((f: any) => f.required && !f.value.trim())
    if (missing) {
      toast.error(`请填写必填项：${missing.label || missing.name}`)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: typeof window !== 'undefined' ? window.location.pathname : undefined,
          fields: payloadFields
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('提交成功')
        setFormValues(initialValues)
      } else {
        toast.error(data.message || '提交失败')
      }
    } catch (error) {
      console.error('提交联系表单失败', error)
      toast.error('提交失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={containerClass}>
      <div className={componentClass}>
        {title && (
          <div className="contact-form-header text-center mb-8">
            <h2 className="contact-form-title text-3xl font-bold mb-4 text-text-primary">{title}</h2>
            {subtitle && <p className="contact-form-subtitle text-lg text-text-secondary">{subtitle}</p>}
          </div>
        )}
        <div className="contact-form-container w-full">
          <form className="contact-form space-y-4" onSubmit={handleSubmit}>
            <input type="text" name="hp" className="hidden" autoComplete="off" />
            {fields.map((field: any, index: number) => (
              <div key={index} className="contact-form-field">
                <label className="contact-form-label block text-sm font-medium text-text-secondary mb-1">
                  {field.label || '字段标签'} {field.required && <span className="text-danger">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={4}
                    className="contact-form-input contact-form-textarea w-full px-3 py-2 border border-color-border rounded-lg bg-color-background text-text-primary"
                    placeholder={`请输入${field.label || '内容'}`}
                    required={!!field.required}
                    value={formValues[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                ) : field.type === 'select' && Array.isArray(field.options) ? (
                  <select
                    className="contact-form-input w-full px-3 py-2 border border-color-border rounded-lg bg-color-background text-text-primary"
                    required={!!field.required}
                    value={formValues[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  >
                    <option value="">请选择</option>
                    {field.options.map((opt: any, idx: number) => (
                      <option key={idx} value={opt?.value || opt?.label || ''}>
                        {opt?.label || opt?.value || ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type || 'text'}
                    className="contact-form-input w-full px-3 py-2 border border-color-border rounded-lg bg-color-background text-text-primary"
                    placeholder={`请输入${field.label || '内容'}`}
                    required={!!field.required}
                    value={formValues[field.name] || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                  />
                )}
              </div>
            ))}
            <div className="text-center">
              <button
                type="submit"
                className="contact-form-submit inline-flex items-center justify-center px-8 py-4 rounded-lg font-medium shadow-lg transition-all duration-300 hover:scale-105 bg-[var(--color-text-primary)] text-[var(--color-background)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
                disabled={isSubmitting}
              >
                {isSubmitting ? '提交中...' : '发送信息'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
