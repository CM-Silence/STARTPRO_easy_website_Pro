import React, { useEffect, useState } from 'react'
import { languagesApi } from '@/utils/api'

interface LanguageOption {
  id: number
  display_name: string
  suffix: string
  code: string
  is_enabled?: number
}

interface LanguageSelectProps {
  value: string
  onChange: (code: string) => void
  /** 列表筛选需能看到未启用语言的内容；表单新建只能用已启用语言 */
  includeDisabled?: boolean
  disabled?: boolean
  className?: string
}

const defaultCls =
  'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-tech-accent'

/** 语言下拉：读取 languages 表，返回内部 code（中文=zh） */
export function LanguageSelect({
  value,
  onChange,
  includeDisabled = false,
  disabled = false,
  className = ''
}: LanguageSelectProps) {
  const [langs, setLangs] = useState<LanguageOption[]>([])

  useEffect(() => {
    let mounted = true
    const req = includeDisabled ? languagesApi.getAll() : languagesApi.getEnabled()
    req
      .then((res) => {
        if (mounted && res.success) setLangs(res.data || [])
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [includeDisabled])

  // 若当前值对应的语言已不存在，渲染时回退到下拉第一项（仅展示兜底，不改父状态）
  const shownValue = langs.some((l) => l.code === value) ? value : (langs[0]?.code ?? 'zh')

  return (
    <select value={shownValue} disabled={disabled}
      onChange={(e) => onChange(e.target.value)} className={className || defaultCls}>
      {langs.map((l) => (
        <option key={l.id} value={l.code}>
          {l.display_name}
        </option>
      ))}
    </select>
  )
}

export default LanguageSelect