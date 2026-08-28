import React from 'react'
import { TemplateComponent } from '@/types/templates'
import { AssetPickerTarget } from '../hooks/useAssetPicker'
import FeatureGridEditor from './FeatureGridEditor'
import PricingCardsEditor from './PricingCardsEditor'
import TeamGridEditor from './TeamGridEditor'
import TimelineEditor from './TimelineEditor'
import CyberTimelineEditor from './CyberTimelineEditor'
import NewsListEditor from './NewsListEditor'
import TestimonialsEditor from './TestimonialsEditor'
import BannerCarouselEditor from './BannerCarouselEditor'
import LinkBlockEditor from './LinkBlockEditor'
import ImageTextEditor from './ImageTextEditor'
import ImageTextHorizontalEditor from './ImageTextHorizontalEditor'
import RawHtmlEditor from './RawHtmlEditor'
import VideoEditor from './VideoEditor'
import TableEditorLauncher from './TableEditorLauncher'
import ProductShowcaseCardEditor from './ProductShowcaseCardEditor'
import TextBlockEditor from './TextBlockEditor'
import HeroEditor from './HeroEditor'

export type CustomEditorProps = {
  component: TemplateComponent
  formData: any
  handleFieldChange: (key: string, value: any) => void
  handleArrayFieldChange: (arrayKey: string, index: number, fieldKey: string, value: any) => void
  openAssetPickerWithValue: (target: AssetPickerTarget, currentValue?: string) => void
  addArrayItem: (arrayKey: string, template: any) => void
  removeArrayItem: (arrayKey: string, index: number) => void
  isAssetUrl: (value?: string) => boolean
  isSvgMarkup: (value?: string) => boolean
}

export type CustomEditorRenderer = (props: CustomEditorProps) => JSX.Element | null

const renderVideoEditor: CustomEditorRenderer = ({
  formData,
  handleFieldChange,
  openAssetPickerWithValue
}) => {
  return (
    <VideoEditor
      formData={formData}
      handleFieldChange={handleFieldChange}
      openAssetPickerWithValue={openAssetPickerWithValue}
    />
  )
}

const renderBannerCarouselEditor: CustomEditorRenderer = ({
  component,
  formData,
  addArrayItem,
  handleArrayFieldChange,
  removeArrayItem,
  handleFieldChange,
  openAssetPickerWithValue
}) => {
  if (component.type !== 'banner-carousel') return null
  return (
    <BannerCarouselEditor
      slides={formData.slides || []}
      settings={{
        autoPlay: formData.autoPlay !== false,
        showIndicators: formData.showIndicators !== false,
        showArrows: formData.showArrows !== false,
        interval: formData.interval || 5000
      }}
      onAdd={() =>
        addArrayItem('slides', {
          image: '',
          title: '横幅标题',
          description: '横幅说明',
          buttonText: '按钮文字',
          buttonLink: '#',
          overlayPosition: 'center',
          overlayTheme: 'light',
          titleColor: '',
          descriptionColor: ''
        })
      }
      onChange={(index, key, value) => handleArrayFieldChange('slides', index, key, value)}
      onRemove={(index) => removeArrayItem('slides', index)}
      onToggle={(key, value) => handleFieldChange(key, value)}
      onIntervalChange={(value) => handleFieldChange('interval', value)}
      openAssetPicker={openAssetPickerWithValue}
    />
  )
}

const renderFeatureGridEditor: CustomEditorRenderer = ({
  component,
  formData,
  handleFieldChange,
  handleArrayFieldChange,
  addArrayItem,
  removeArrayItem,
  openAssetPickerWithValue,
  isAssetUrl,
  isSvgMarkup
}) => {
  if (component.type !== 'feature-grid' && component.type !== 'feature-grid-large') return null
  return (
    <FeatureGridEditor
      type={component.type}
      features={formData.features || []}
      cardsPerRow={formData.cardsPerRow}
      onCardsPerRowChange={(value) => handleFieldChange('cardsPerRow', value)}
      onChange={(index, key, value) => handleArrayFieldChange('features', index, key, value)}
      onAdd={() =>
        addArrayItem('features', {
          icon: '✨',
          title: '新的功能',
          description: '功能描述',
          link: ''
        })
      }
      onRemove={(idx) => removeArrayItem('features', idx)}
      openAssetPicker={openAssetPickerWithValue}
      isAssetUrl={isAssetUrl}
      isSvgMarkup={isSvgMarkup}
    />
  )
}

const renderPricingEditor: CustomEditorRenderer = ({
  component,
  formData,
  handleFieldChange,
  handleArrayFieldChange,
  addArrayItem,
  removeArrayItem
}) => {
  if (component.type !== 'pricing-cards') return null
  return (
    <PricingCardsEditor
      cards={formData.plans || []}
      onAdd={() =>
        addArrayItem('plans', {
          name: '基础版',
          price: '99',
          period: '月',
          features: ['功能1', '功能2'],
          recommended: false,
          link: '#'
        })
      }
      onChange={(index, key, value) => handleArrayFieldChange('plans', index, key, value)}
      onRemove={(index) => removeArrayItem('plans', index)}
      cardsPerRow={formData.cardsPerRow}
      onCardsPerRowChange={(value) => handleFieldChange('cardsPerRow', value)}
    />
  )
}

const renderProductShowcaseCardEditor: CustomEditorRenderer = ({
  component,
  formData,
  handleFieldChange,
  handleArrayFieldChange,
  addArrayItem,
  removeArrayItem,
  openAssetPickerWithValue
}) => {
  if (component.type !== 'product-showcase-card') return null
  return (
    <ProductShowcaseCardEditor
      formData={formData}
      handleFieldChange={handleFieldChange}
      handleArrayFieldChange={handleArrayFieldChange}
      addArrayItem={addArrayItem}
      removeArrayItem={removeArrayItem}
      openAssetPickerWithValue={openAssetPickerWithValue}
    />
  )
}

const renderTeamGridEditor: CustomEditorRenderer = ({
  component,
  formData,
  addArrayItem,
  handleArrayFieldChange,
  removeArrayItem,
  openAssetPickerWithValue
}) => {
  if (component.type !== 'team-grid') return null
  return (
    <TeamGridEditor
      members={formData.members || []}
      onAdd={() =>
        addArrayItem('members', {
          name: '成员姓名',
          role: '职位',
          bio: '个人简介',
          avatar: '/images/avatar-placeholder.jpg'
        })
      }
      onChange={(index, key, value) => handleArrayFieldChange('members', index, key, value)}
      onRemove={(index) => removeArrayItem('members', index)}
      openAssetPicker={openAssetPickerWithValue}
    />
  )
}

const renderTimelineEditorBlock: CustomEditorRenderer = ({
  component,
  formData,
  addArrayItem,
  handleArrayFieldChange,
  removeArrayItem,
  openAssetPickerWithValue,
  isAssetUrl,
  isSvgMarkup
}) => {
  if (component.type !== 'timeline') return null
  return (
    <TimelineEditor
      events={formData.events || []}
      onAdd={() =>
        addArrayItem('events', {
          date: '2024',
          title: '新事件',
          description: '事件描述',
          icon: '🗓️'
        })
      }
      onChange={(index, key, value) => handleArrayFieldChange('events', index, key, value)}
      onRemove={(index) => removeArrayItem('events', index)}
      openAssetPicker={openAssetPickerWithValue}
      isAssetUrl={isAssetUrl}
      isSvgMarkup={isSvgMarkup}
    />
  )
}

const renderCyberTimelineEditorBlock: CustomEditorRenderer = ({
  component,
  formData,
  addArrayItem,
  handleArrayFieldChange,
  removeArrayItem
}) => {
  if (component.type !== 'cyber-timeline') return null
  return (
    <CyberTimelineEditor
      events={formData.events || []}
      onAdd={() =>
        addArrayItem('events', {
          date: '2024',
          phase: '阶段名称',
          title: '新阶段',
          description: '阶段描述',
          link: '',
          tags: []
        })
      }
      onChange={(index, key, value) => handleArrayFieldChange('events', index, key, value)}
      onRemove={(index) => removeArrayItem('events', index)}
    />
  )
}

const renderNewsListEditor: CustomEditorRenderer = ({
  component,
  formData,
  addArrayItem,
  handleArrayFieldChange,
  removeArrayItem,
  openAssetPickerWithValue,
  handleFieldChange
}) => {
  if (component.type !== 'news-list') return null

  const handleMoveUp = (index: number) => {
    const articles = Array.isArray(formData.articles) ? [...formData.articles] : []
    if (index <= 0 || index >= articles.length) return
    ;[articles[index - 1], articles[index]] = [articles[index], articles[index - 1]]
    handleFieldChange('articles', articles)
  }

  const handleMoveDown = (index: number) => {
    const articles = Array.isArray(formData.articles) ? [...formData.articles] : []
    if (index < 0 || index >= articles.length - 1) return
    ;[articles[index], articles[index + 1]] = [articles[index + 1], articles[index]]
    handleFieldChange('articles', articles)
  }

  return (
    <NewsListEditor
      articles={formData.articles || []}
      viewMode={formData.viewMode || 'latest'}
      onViewModeChange={(v) => handleFieldChange('viewMode', v)}
      pinFirst={formData.pinFirst !== false}
      onPinFirstChange={(v) => handleFieldChange('pinFirst', v)}
      cardsPerRow={formData.cardsPerRow}
      onCardsPerRowChange={(value) => handleFieldChange('cardsPerRow', value)}
      onBatchChange={(index, patch) => {
        const current = Array.isArray(formData.articles) ? [...formData.articles] : []
        current[index] = { ...(current[index] || {}), ...patch }
        handleFieldChange('articles', current)
      }}
      onAdd={() =>
        addArrayItem('articles', {
          title: '',
          summary: '',
          excerpt: '',
          date: '',
          image: '',
          icon: '📰',
          link: '',
          newsId: ''
        })
      }
      onChange={(index, key, value) => handleArrayFieldChange('articles', index, key, value)}
      onRemove={(index) => removeArrayItem('articles', index)}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      openAssetPicker={openAssetPickerWithValue}
    />
  )
}

const renderTestimonialsEditor: CustomEditorRenderer = ({
  component,
  formData,
  addArrayItem,
  handleArrayFieldChange,
  removeArrayItem,
  openAssetPickerWithValue
}) => {
  if (component.type !== 'testimonials') return null
  return (
    <TestimonialsEditor
      testimonials={formData.testimonials || []}
      onAdd={() =>
        addArrayItem('testimonials', {
          name: '客户姓名',
          role: '职位',
          content: '推荐内容',
          avatar: '',
          rating: 5
        })
      }
      onChange={(index, key, value) => handleArrayFieldChange('testimonials', index, key, value)}
      onRemove={(index) => removeArrayItem('testimonials', index)}
      openAssetPicker={openAssetPickerWithValue}
    />
  )
}

const renderLinkBlockEditor: CustomEditorRenderer = ({
  component,
  formData,
  addArrayItem,
  handleArrayFieldChange,
  removeArrayItem,
  handleFieldChange
}) => {
  if (component.type !== 'link-block') return null
  const links = Array.isArray(formData.links) ? formData.links : []
  return (
    <LinkBlockEditor
      links={links}
      onAdd={() => addArrayItem('links', { text: '', url: '' })}
      onChange={(index, fieldKey, value) => handleArrayFieldChange('links', index, fieldKey, value)}
      onRemove={(index) => removeArrayItem('links', index)}
      linkStyle={formData.linkStyle || 'gradient'}
      linkShape={formData.linkShape || 'pill'}
      linkGlow={formData.linkGlow !== false}
      hoverEffect={formData.hoverEffect || 'lift'}
      onStyleChange={(key, value) => handleFieldChange(key, value)}
    />
  )
}

const renderTableEditor: CustomEditorRenderer = ({
  component,
  formData,
  handleFieldChange
}) => {
  if (component.type !== 'table') return null
  const defaultColumns = [
    { key: 'item', label: '名称', align: 'left' },
    { key: 'value', label: '数值', align: 'center' },
    { key: 'status', label: '状态', align: 'right' }
  ]
  // 默认列仅作「显示兜底」，绝不写回 props —— 避免列被无端覆盖回默认值
  const columns = Array.isArray(formData.columns) && formData.columns.length > 0 ? formData.columns : defaultColumns
  const rows = Array.isArray(formData.rows) ? formData.rows : []
  return (
    <TableEditorLauncher
      columns={columns}
      rows={rows}
      highlightHeader={formData.highlightHeader}
      highlightFirstRow={formData.highlightFirstRow}
      highlightFirstColumn={formData.highlightFirstColumn}
      onColumnsChange={(next) => handleFieldChange('columns', next)}
      onRowsChange={(next) => handleFieldChange('rows', next)}
      onStyleChange={(key, value) => handleFieldChange(key, value)}
    />
  )
}

const renderImageTextEditor: CustomEditorRenderer = ({
  component,
  formData,
  handleFieldChange
}) => {
  if (component.type !== 'image-text') return null
  return (
    <ImageTextEditor
      imageWidthPercent={formData.imageWidthPercent}
      onWidthChange={(value) => handleFieldChange('imageWidthPercent', value)}
    />
  )
}

const renderImageTextHorizontalEditor: CustomEditorRenderer = ({
  component,
  formData,
  handleFieldChange
}) => {
  if (component.type !== 'image-text-horizontal') return null
  return (
    <ImageTextHorizontalEditor
      imageWidthPercent={formData.imageWidthPercent}
      onWidthChange={(value) => handleFieldChange('imageWidthPercent', value)}
    />
  )
}

const renderRawHtmlEditor: CustomEditorRenderer = ({
  component,
  formData,
  handleFieldChange
}) => {
  if ((component as any).type !== 'raw-html') return null
  return (
    <RawHtmlEditor
      component={component}
      formData={formData}
      handleFieldChange={handleFieldChange}
    />
  )
}

const renderTextBlockEditor: CustomEditorRenderer = ({
  component,
  formData,
  handleFieldChange
}) => {
  if (component.type !== 'text-block') return null
  return (
    <TextBlockEditor
      content={formData.content}
      onContentChange={(value) => handleFieldChange('content', value)}
    />
  )
}

const renderHeroEditor: CustomEditorRenderer = ({ component, formData, handleFieldChange }) => {
  if (component.type !== 'hero') return null
  return <HeroEditor formData={formData} handleFieldChange={handleFieldChange} />
}

const renderNewsIndexEditor: CustomEditorRenderer = ({ component, formData, handleFieldChange }) => {
  if (component.type !== 'news-index') return null
  const input =
    'w-full px-3 py-2 border border-gray-200 rounded-lg theme-input focus:ring-2 focus:ring-tech-accent focus:border-transparent'
  const set = (k: string, v: any) => handleFieldChange(k, v)
  return (
    <div className="space-y-4 mb-6">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1">标题对齐</label>
        <select className={input} value={formData.titleAlign || 'left'} onChange={(e) => set('titleAlign', e.target.value)}>
          <option value="left">靠左</option>
          <option value="center">居中</option>
          <option value="right">靠右</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">每页条数</label>
          <input type="number" min={1} className={input} value={formData.pageSize || 10} onChange={(e) => set('pageSize', Number(e.target.value) || 10)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">屏蔽前 N 条</label>
          <input type="number" min={0} className={input} value={formData.skipFirst || 0} onChange={(e) => set('skipFirst', Number(e.target.value) || 0)} />
        </div>
      </div>
    </div>
  )
}

const customEditors: Partial<Record<string, CustomEditorRenderer>> = {
  'hero': renderHeroEditor,
  'video-player': renderVideoEditor,
  'banner-carousel': renderBannerCarouselEditor,
  'feature-grid': renderFeatureGridEditor,
  'feature-grid-large': renderFeatureGridEditor,
  'pricing-cards': renderPricingEditor,
  'team-grid': renderTeamGridEditor,
  'timeline': renderTimelineEditorBlock,
  'cyber-timeline': renderCyberTimelineEditorBlock,
  'news-list': renderNewsListEditor,
  'news-index': renderNewsIndexEditor,
  'testimonials': renderTestimonialsEditor,
  'link-block': renderLinkBlockEditor,
  'table': renderTableEditor,
  'image-text': renderImageTextEditor,
  'image-text-horizontal': renderImageTextHorizontalEditor,
  'text-block': renderTextBlockEditor,
  'raw-html': renderRawHtmlEditor,
  'product-showcase-card': renderProductShowcaseCardEditor
}

export { customEditors }
