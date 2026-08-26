import React from 'react'
import AdminLayout from '@/components/AdminLayout'
import AiSettingsPanel from '@/components/admin/ai/AiSettingsPanel'
import AiTemplatesPanel from '@/components/admin/ai/AiTemplatesPanel'
import AiGlossaryPanel from '@/components/admin/ai/AiGlossaryPanel'

export default function AdminAiSettingsPage() {
  return (
    <AdminLayout title="AI 接入配置" description="配置 AI 供应商、提示词模板与翻译词条">
      <div className="space-y-6">
        <AiSettingsPanel />
        <AiTemplatesPanel />
        <AiGlossaryPanel />
      </div>
    </AdminLayout>
  )
}
