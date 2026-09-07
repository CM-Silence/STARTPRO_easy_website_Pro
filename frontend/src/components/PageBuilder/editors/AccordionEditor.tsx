import React from 'react'
import { Plus, Trash2, Image as ImageIcon, FileText } from 'lucide-react'
import TextBlockEditor from './TextBlockEditor'

interface AccordionEditorProps {
  items: any[]
  onAdd: () => void
  onRemove: (index: number) => void
  onChange: (index: number, fieldKey: 'icon' | 'title' | 'content', value: any) => void
  onAddMeta: (itemIndex: number) => void
  onRemoveMeta: (itemIndex: number, metaIndex: number) => void
  onMetaChange: (itemIndex: number, metaIndex: number, fieldKey: 'icon' | 'text', value: any) => void
  openAssetPicker: (target: { fieldKey: string; arrayKey: string; arrayIndex: number }, currentValue?: string) => void
  openNestedAssetPicker: (handler: (asset: { url: string }) => void, currentValue?: string) => void
}

const AccordionEditor: React.FC<AccordionEditorProps> = ({
  items,
  onAdd,
  onRemove,
  onChange,
  onAddMeta,
  onRemoveMeta,
  onMetaChange,
  openAssetPicker,
  openNestedAssetPicker
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">折叠项列表</h4>
        <button
          onClick={onAdd}
          className="flex items-center space-x-1 px-3 py-1 text-sm bg-tech-accent text-white rounded-lg hover:bg-tech-secondary transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>新增</span>
        </button>
      </div>

      {(items || []).map((item: any, index: number) => (
        <div key={index} className="p-3 border border-gray-200 rounded-lg space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">折叠项 {index + 1}</span>
            <button onClick={() => onRemove(index)} className="p-1 text-red-500 hover:text-red-700">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {/* 标题 */}
          <input
            type="text"
            value={item.title || ''}
            onChange={(e) => onChange(index, 'title', e.target.value)}
            placeholder="标题"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded  theme-input focus:ring-2 focus:ring-tech-accent focus:border-transparent"
          />

          {/* 头部图标 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              value={item.icon || ''}
              onChange={(e) => onChange(index, 'icon', e.target.value)}
              placeholder="标题图标 (emoji / SVG 代码或素材 URL，可留空)"
              className="w-full sm:flex-1 px-2 py-1 text-sm border border-gray-300 rounded  theme-input focus:ring-2 focus:ring-tech-accent focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => openAssetPicker({ fieldKey: 'icon', arrayKey: 'items', arrayIndex: index }, item.icon)}
              className="flex items-center gap-1 px-3 py-2 text-xs border border-theme-divider bg-theme-surfaceAlt text-theme-textSecondary hover:bg-theme-surface transition-colors sm:flex-none"
            >
              <ImageIcon className="w-4 h-4" />
              <span>选择素材</span>
            </button>
          </div>

          {/* 元信息行 */}
          <div className="border-t border-gray-100 pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">元信息</span>
              <button
                onClick={() => onAddMeta(index)}
                className="flex items-center space-x-1 px-2 py-1 text-xs bg-tech-accent text-white rounded-lg hover:bg-tech-secondary transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>新增</span>
              </button>
            </div>
            {((item.meta || []) as any[]).map((metaItem: any, metaIndex: number) => (
              <div key={metaIndex} className="p-2 border border-gray-100 rounded space-y-2 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">元信息 {metaIndex + 1}</span>
                  <button
                    onClick={() => onRemoveMeta(index, metaIndex)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="text"
                    value={metaItem.icon || ''}
                    onChange={(e) => onMetaChange(index, metaIndex, 'icon', e.target.value)}
                    placeholder="图标 (可留空)"
                    className="w-full sm:flex-1 px-2 py-1 text-sm border border-gray-300 rounded  theme-input focus:ring-2 focus:ring-tech-accent focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      openNestedAssetPicker(
                        (asset) => onMetaChange(index, metaIndex, 'icon', asset.url),
                        metaItem.icon
                      )
                    }
                    className="flex items-center gap-1 px-3 py-2 text-xs border border-theme-divider bg-theme-surfaceAlt text-theme-textSecondary hover:bg-theme-surface transition-colors sm:flex-none"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>选择素材</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={metaItem.text || ''}
                  onChange={(e) => onMetaChange(index, metaIndex, 'text', e.target.value)}
                  placeholder="元信息内容"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded  theme-input focus:ring-2 focus:ring-tech-accent focus:border-transparent"
                />
              </div>
            ))}
          </div>

          {/* 正文富文本 */}
          <div className="border-t border-gray-100 pt-2">
            <TextBlockEditor
              content={item.content || ''}
              onContentChange={(html) => onChange(index, 'content', html)}
            />
            {!item.content && (
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                正文为空，点击上方按钮编辑富文本内容
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AccordionEditor
