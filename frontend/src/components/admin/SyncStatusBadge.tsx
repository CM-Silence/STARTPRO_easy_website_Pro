import React from 'react'

interface SyncStatus {
  missing: string[]
  synced: boolean
}

export default function SyncStatusBadge({ syncStatus }: { syncStatus?: SyncStatus }) {
  const synced = syncStatus?.synced === true
  const missing = syncStatus?.missing || []
  const tooltip = synced
    ? '已同步到所有语言'
    : missing.length
      ? `未同步到：${missing.join(', ')}`
      : '未同步'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
        synced ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
      }`}
      title={tooltip}
    >
      {synced ? '已同步' : '未同步'}
    </span>
  )
}