import { ComponentDefinition } from '@/types/templates'
import { CallToActionPreview, ContactFormPreview, FaqSectionPreview, LinkBlockPreview, TextBlockPreview, TablePreview } from '@/components/PageBuilder/previews'

export const textComponents: ComponentDefinition[] = [
  {
      type: 'text-block',
      name: '文本区块',
      description: '纯文本内容展示',
      icon: '📝',
      category: '文本组件',
      defaultProps: {
        title: '',
        content: '',
        alignment: 'left',
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'content', label: '内容', type: 'rich-text', value: '' },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: TextBlockPreview
    },

  {
      type: 'contact-form',
      name: '联系表单',
      description: '客户联系信息收集表单',
      icon: '📞',
      category: '文本组件',
      defaultProps: {
        title: '联系我们',
        subtitle: '我们很乐意听到您的声音',
        fields: [
          { name: 'name', label: '姓名', type: 'text', required: true ,  backgroundColorOption: 'default'},
          { name: 'email', label: '邮箱', type: 'email', required: true },
          { name: 'message', label: '留言', type: 'textarea', required: true }
        ],
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '标题', type: 'text', value: '' },
        { key: 'subtitle', label: '副标题', type: 'text', value: '' },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: ContactFormPreview
    },

  {
      type: 'call-to-action',
      name: '行动号召',
      description: '引导用户执行特定行动',
      icon: '📢',
      category: '文本组件',
      defaultProps: {
        title: '立即开始使用',
        subtitle: '现在注册可享受30天免费试用',
        buttonText: '立即注册',
        buttonLink: '/signup',
        backgroundColor: 'var(--semantic-cta-primary-bg)',
        titleColorMode: 'default',
        customTitleColor: '',
        subtitleColorMode: 'default',
        customSubtitleColor: '',
        buttonColorMode: 'default',
        customButtonColor: '',
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '主标题', type: 'text', value: '', required: true },
        { key: 'subtitle', label: '副标题', type: 'text', value: '' },
        { key: 'buttonText', label: '按钮文字', type: 'text', value: '' },
        { key: 'buttonLink', label: '按钮链接', type: 'link', value: '' },
        { key: 'titleColorMode', label: '标题颜色模式', type: 'text', value: 'default', options: [
          { label: '默认', value: 'default' },
          { label: '自定义', value: 'custom' }
        ] },
        { key: 'customTitleColor', label: '自定义标题颜色', type: 'text', value: '' },
        { key: 'subtitleColorMode', label: '副标题颜色模式', type: 'text', value: 'default', options: [
          { label: '默认', value: 'default' },
          { label: '自定义', value: 'custom' }
        ] },
        { key: 'customSubtitleColor', label: '自定义副标题颜色', type: 'text', value: '' },
        { key: 'buttonColorMode', label: '按钮文字颜色模式', type: 'text', value: 'default', options: [
          { label: '默认', value: 'default' },
          { label: '自定义', value: 'custom' }
        ] },
        { key: 'customButtonColor', label: '自定义按钮文字颜色', type: 'text', value: '' },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: CallToActionPreview
    },

  {
      type: 'faq-section',
      name: 'FAQ问答',
      description: '常见问题',
      icon: '❓',
      category: '文本组件',
      defaultProps: {
        title: '常见问题',
        subtitle: '找到您关心问题的答案',
        faqs: [
          {
            question: '这个产品如何使用？',
            answer: '您可以通过注册账户，然后按照指引进行操作。我们提供详细的使用教程和在线客服支持。',
            backgroundColorOption: 'default'
          },
          {
            question: '价格是如何定的？',
            answer: '我们根据您选择的功能和服务级别来定价。所有价格都是透明的，没有隐藏费用。',
            backgroundColorOption: 'default'
          },
          {
            question: '是否支持免费试用？',
            answer: '是的，我们提供30天的免费试用期，您可以在试用期内体验所有功能。',
            backgroundColorOption: 'default'
          }
        ],
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '标题', type: 'text', value: '' },
        { key: 'subtitle', label: '副标题', type: 'text', value: '' },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: FaqSectionPreview
    },

  {
      type: 'link-block',
      name: '链接区块',
      description: '自定义添加链接按钮，透明的长方形按钮，边框和文字颜色一致。',
      icon: '🔗',
      category: '文本组件',
      defaultProps: {
        title: '相关链接',
        links: [
          { text: '官方网站', url: 'https://example.com' },
          { text: '产品文档', url: 'https://docs.example.com' },
          { text: '技术支持', url: 'https://support.example.com' }
        ],
        linkStyle: 'gradient',
        linkShape: 'pill',
        linkGlow: true,
        hoverEffect: 'lift',
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '标题', type: 'text', value: '' },
        { key: 'links', label: '链接列表', type: 'array', value: [], subFields: [
          { key: 'text', label: '链接文本', type: 'text', value: '' },
          { key: 'url', label: '链接地址', type: 'link', value: '' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'linkStyle', label: '按钮样式', type: 'text', value: 'gradient', options: [
          { label: '渐变', value: 'gradient' },
          { label: '填充', value: 'solid' },
          { label: '描边', value: 'outline' }
        ] },
        { key: 'linkShape', label: '按钮圆角', type: 'text', value: 'pill', options: [
          { label: '胶囊', value: 'pill' },
          { label: '圆角', value: 'rounded' },
          { label: '直角', value: 'square' }
        ] },
        { key: 'hoverEffect', label: '悬浮特效', type: 'text', value: 'lift', options: [
          { label: '浮起', value: 'lift' },
          { label: '发光', value: 'glow' },
          { label: '关闭', value: 'none' }
        ] },
        { key: 'linkGlow', label: '流光/光晕', type: 'text', value: true, options: [
          { label: '开启', value: 'true' },
          { label: '关闭', value: 'false' }
        ] }
      ],
      previewComponent: LinkBlockPreview
    },

  {
      type: 'table',
      name: '表格',
      description: '自定义列与行的数据表，支持对齐与样式调整。',
      icon: '📊',
      category: '文本组件',
      defaultProps: {
        title: '数据表',
        columns: [
          { key: 'item', label: '名称', align: 'left' },
          { key: 'value', label: '数值', align: 'center' },
          { key: 'status', label: '状态', align: 'right' }
        ],
        rows: [
          { item: '指标 A', value: '123', status: '正常' },
          { item: '指标 B', value: '87', status: '告警' },
          { item: '指标 C', value: '45', status: '离线' }
        ],
        highlightHeader: true,
        highlightFirstRow: false,
        highlightFirstColumn: false,
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '标题', type: 'text', value: '' },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: TablePreview
    }
]
