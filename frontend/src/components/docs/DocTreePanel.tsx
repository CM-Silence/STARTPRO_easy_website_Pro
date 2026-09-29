import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight, Folder, FileText } from 'lucide-react'
import type { DocNode } from '@/types'
import SyncStatusBadge from '@/components/admin/SyncStatusBadge'

interface DocTreePanelProps {
  tree: DocNode[]
  selectedDocId?: number | null
  loading?: boolean
  onSelectDoc: (node: DocNode | null) => void
  onRefresh?: () => void
  /** 多选（批量操作）：已选 id 列表；提供后树内显示复选框 */
  selectedIds?: number[]
  onToggleSelect?: (id: number) => void
}

const SyncBadge = ({ node }: { node: DocNode }) => {
  const sync = (node as any).syncStatus
  if (!sync) return null
  return <SyncStatusBadge syncStatus={sync} />
}

// 收集某节点的全部后代 id（不含自身）
const collectDescendantIds = (node: DocNode): number[] => {
  const acc: number[] = []
  const walk = (n: DocNode) => {
    for (const c of n.children || []) {
      acc.push(c.id)
      walk(c)
    }
  }
  walk(node)
  return acc
}

// 原生复选框：蓝底白勾（与导航管理页一致），支持半选态
const Checkbox = ({
  checked,
  indeterminate,
  onToggle
}: {
  checked: boolean
  indeterminate?: boolean
  onToggle: () => void
}) => {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate) && !checked
  }, [indeterminate, checked])
  return (
    <span
      className="flex-shrink-0 flex items-center"
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
        style={{ accentColor: '#3B82F6' }}
        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
      />
    </span>
  )
}

// 树形目录面板：
// - 顶层固定一个“根目录”，所有顶层目录(folder)与根级文档(parent_id 为空)都是它的子项。
// - 目录点击为选中该目录；文档点击为选中该文档。多选时每行前有复选框。
export default function DocTreePanel({
  tree,
  selectedDocId,
  loading,
  onSelectDoc,
  onRefresh,
  selectedIds,
  onToggleSelect
}: DocTreePanelProps) {
  const [openFolderId, setOpenFolderId] = useState<number | null>(null)

  const isSelected = (id: number) => !!selectedIds?.includes(id)

  // 选中文档时自动展开其父目录
  const parentOfActive = useMemo(() => {
    if (!selectedDocId || !tree.length) return null
    const findParent = (nodes: DocNode[], targetId: number, parentId: number | null = null): number | null => {
      for (const n of nodes) {
        if (n.id === targetId) return parentId
        const child = n.children || []
        const found = findParent(child, targetId, n.type === 'folder' ? n.id : parentId)
        if (found !== null) return found
      }
      return null
    }
    return findParent(tree, selectedDocId, null)
  }, [selectedDocId, tree])

  const effectiveOpen = openFolderId ?? parentOfActive

  const handleFolderClick = (folder: DocNode) => {
    setOpenFolderId(openFolderId === folder.id ? null : folder.id)
    onSelectDoc(folder)
  }

  const renderDoc = (doc: DocNode) => {
    const active = selectedDocId === doc.id
    return (
      <div
        key={doc.id}
        className={`flex items-center gap-1.5 text-left px-3 py-1.5 rounded-md text-sm cursor-pointer transition ${
          active
            ? 'bg-theme-surfaceAlt text-theme-text font-semibold'
            : 'text-theme-textSecondary hover:text-theme-text hover:bg-theme-surfaceAlt/70'
        }`}
        style={{ paddingLeft: 8 }}
        onClick={() => onSelectDoc(doc)}
      >
        {onToggleSelect && <Checkbox checked={isSelected(doc.id)} onToggle={() => onToggleSelect(doc.id)} />}
        <FileText size={14} className="flex-shrink-0 opacity-70" />
        <span className="truncate">{doc.title}</span>
        <span className="ml-auto flex-shrink-0">
          <SyncBadge node={doc} />
        </span>
      </div>
    )
  }

  const renderFolder = (folder: DocNode) => {
    const isOpen = effectiveOpen === folder.id
    const docs = (folder.children || []).filter((n) => n.type !== 'folder')
    const isActive = selectedDocId === folder.id
    // 整个子树（自身 + 全部后代）的选中/半选状态
    const subtreeIds = [folder.id, ...collectDescendantIds(folder)]
    const allSel = subtreeIds.every((id) => isSelected(id))
    const someSel = subtreeIds.some((id) => isSelected(id))
    return (
      <div key={folder.id} className="space-y-1">
        <div
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm cursor-pointer transition ${
            isOpen || isActive
              ? 'bg-theme-surfaceAlt text-theme-text font-semibold'
              : 'text-theme-textSecondary hover:text-theme-text hover:bg-theme-surfaceAlt/70'
          }`}
          onClick={() => handleFolderClick(folder)}
        >
          {onToggleSelect && (
            <Checkbox checked={allSel} indeterminate={someSel} onToggle={() => onToggleSelect(folder.id)} />
          )}
          <Folder size={14} className="flex-shrink-0 opacity-70" />
          <span className="truncate">{folder.title}</span>
          <span className="ml-auto flex-shrink-0">
            <SyncBadge node={folder} />
          </span>
          {isOpen ? (
            <ChevronDown size={14} className="opacity-70 shrink-0" />
          ) : (
            <ChevronRight size={14} className="opacity-70 shrink-0" />
          )}
        </div>
        {isOpen && (
          <div className="ml-3 pl-2 space-y-1">
            {docs.map(renderDoc)}
            {docs.length === 0 && <div className="text-xs text-theme-textSecondary px-3 py-1.5">暂无文档</div>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-theme-surface p-3 space-y-3 shadow-sm min-w-0">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-theme-text">目录</h3>
          <p className="text-xs text-theme-textSecondary">根目录下包含目录与未分组的文档</p>
        </div>
        {onRefresh && (
          <button
            type="button"
            className="text-xs px-2 py-1 rounded bg-theme-surfaceAlt text-theme-text hover:bg-theme-surface"
            onClick={onRefresh}
          >
            刷新
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-theme-textSecondary">加载目录...</div>
      ) : (
        <div className="space-y-1 max-h-[70vh] overflow-auto">
          {/* 根目录：收纳所有顶层目录与根级文档 */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold text-theme-text">
              <ChevronDown size={14} className="opacity-70" />
              <Folder size={14} className="opacity-70" />
              <span className="truncate">根目录</span>
            </div>
            {tree.length ? (
              <div className="ml-3 pl-2 space-y-1">
                {tree.map((node) => (node.type === 'folder' ? renderFolder(node) : renderDoc(node)))}
              </div>
            ) : (
              <div className="text-xs text-theme-textSecondary px-3 py-1.5">暂无目录</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}