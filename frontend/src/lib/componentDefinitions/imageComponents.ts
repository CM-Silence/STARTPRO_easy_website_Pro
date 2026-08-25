import { ComponentDefinition } from '@/types/templates'
import { BannerCarouselPreview, HeroPreview, ImageBlockPreview, ImageTextHorizontalPreview, ImageTextPreview, LogoScrollPreview, LogoWallPreview } from '@/components/PageBuilder/previews'

export const imageComponents: ComponentDefinition[] = [
  {
      type: 'hero',
      name: '英雄区块',
      description: '页面顶部的主要展示区域',
      icon: '🚀',
      category: '图片组件',
      defaultProps: {
        title: '欢迎来到我们的网站',
        subtitle: '为您提供最优质的服务和产品',
        backgroundImage: '/images/hero-bg.jpg',
        buttonText: '了解更多',
        buttonLink: '#',
        titleColorMode: 'default',
        customTitleColor: '',
        subtitleColorMode: 'default',
        customSubtitleColor: '',
        widthOption: 'full',
        backgroundColorOption: 'default',
        imageHeightMode: 'fixed',
        contentAlign: 'center',
        overlayOpacity: 0.45,
        enableKenBurns: true
      },
      editableFields: [
        { key: 'title', label: '主标题', type: 'text', value: '', required: true },
        { key: 'subtitle', label: '副标题', type: 'textarea', value: '' },
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
        { key: 'backgroundImage', label: '背景图片', type: 'image', value: '' },
        { key: 'buttonText', label: '按钮文字', type: 'text', value: '' },
        { key: 'buttonLink', label: '按钮链接', type: 'link', value: '' },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'imageHeightMode', label: '图片高度模式', type: 'text', value: 'fixed', options: [
          { label: '固定高度', value: 'fixed' },
          { label: '自动高度', value: 'auto' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: HeroPreview
    },

  {
      type: 'image-block',
      name: '图片区块',
      description: '图片展示区域',
      icon: '🖼️',
      category: '图片组件',
      defaultProps: {
        src: '/images/placeholder.jpg',
        alt: '图片描述',
        caption: '',
        linkUrl: '',
        linkTarget: '_self',
        width: '100%',
        height: 'auto',
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'src', label: '图片地址', type: 'image', value: '', required: true },
        { key: 'alt', label: '图片描述', type: 'text', value: '' },
        { key: 'caption', label: '图片说明', type: 'text', value: '' },
        { key: 'linkUrl', label: '链接地址（可选）', type: 'text', value: '' },
        { key: 'linkTarget', label: '打开方式', type: 'text', value: '_self', options: [
          { label: '当前窗口', value: '_self' },
          { label: '新窗口', value: '_blank' }
        ] },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: ImageBlockPreview
    },

  {
      type: 'banner-carousel',
      name: '横幅轮播图',
      description: '自动播放的横幅图片轮播组件，支持文字叠加',
      icon: '🖼️',
      category: '图片组件',
      defaultProps: {
        title: '欢迎来到我们的网站',
        subtitle: '在这里您可以找到我们最新的产品和服务',
        autoPlay: true,
        interval: 5000,
        showIndicators: true,
        showArrows: true,
        slides: [
          {
            image: '/images/banners/banner1.jpg',
            title: '创新技术解决方案',
            description: '我们提供最先进的技术解决方案',
            buttonText: '了解更多',
            buttonLink: '/services',
            overlayPosition: 'center',
            backgroundColorOption: 'default',
            titleColor: '',
            descriptionColor: ''
          },
          {
            image: '/images/banners/banner2.jpg',
            title: '专业服务团队',
            description: '经验丰富的专业团队为您提供支持',
            buttonText: '联系我们',
            buttonLink: '/contact',
            overlayPosition: 'bottom-left',
            titleColor: '',
            descriptionColor: ''
          }
        ],
        titleColorMode: 'default',
        customTitleColor: '',
        subtitleColorMode: 'default',
        customSubtitleColor: '',
        buttonColorMode: 'default',
        customButtonColor: '',
        imageHeightMode: 'fixed',
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '标题', type: 'text', value: '' },
        { key: 'subtitle', label: '副标题', type: 'text', value: '' },
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
        { key: 'autoPlay', label: '自动播放', type: 'text', value: true },
        { key: 'interval', label: '轮播间隔(毫秒)', type: 'text', value: 5000 },
        { key: 'showIndicators', label: '显示指示器', type: 'text', value: true },
        { key: 'showArrows', label: '显示箭头', type: 'text', value: true },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'imageHeightMode', label: '图片高度模式', type: 'text', value: 'fixed', options: [
          { label: '固定高度', value: 'fixed' },
          { label: '自动高度', value: 'auto' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: BannerCarouselPreview
    },

  {
      type: 'logo-wall',
      name: 'Logo墙',
      description: '展示合作伙伴或客户Logo的展示墙',
      icon: '🏛️',
      category: '图片组件',
      defaultProps: {
        title: '合作伙伴',
        subtitle: '我们与众多知名企业建立了合作关系',
        shape: 'rounded',
        logos: [],
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '标题', type: 'text', value: '' },
        { key: 'subtitle', label: '副标题', type: 'text', value: '' },
        { key: 'shape', label: '容器形状', type: 'text', value: 'rounded', options: [
          { label: '圆角矩形', value: 'rounded' },
          { label: '直角矩形', value: 'square' },
          { label: '圆形', value: 'circle' },
          { label: '大圆角矩形', value: 'rounded-rectangle' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] }
      ],
      previewComponent: LogoWallPreview
    },

  {
      type: 'logo-scroll',
      name: 'Logo滚动展示',
      description: '展示合作伙伴Logo的横向滚动展示',
      icon: '📜',
      category: '图片组件',
      defaultProps: {
        title: '合作伙伴',
        subtitle: '值得信赖的合作伙伴网络',
        logos: [],
        height: 'low',
        scrollSpeed: 'slow',
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '标题', type: 'text', value: '' },
        { key: 'subtitle', label: '副标题', type: 'text', value: '' },
        { key: 'height', label: 'Logo高度', type: 'text', value: 'low', options: [
          { label: '高（160px）', value: 'high' }, 
          { label: '低（80px）', value: 'low' }
        ] },
        { key: 'scrollSpeed', label: '滚动速度', type: 'text', value: 'slow', options: [
          { label: '慢速', value: 'slow' },
          { label: '快速', value: 'fast' }
        ] },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: LogoScrollPreview
    },

  {
      type: 'image-text',
      name: '图文展示-上下结构',
      description: '图片和文字组合展示区块，支持上下布局方式',
      icon: '📚',
      category: '图片组件',
      defaultProps: {
        title: '标题',
        description: '这是一段描述文字，用来展示图文组件的内容。',
        image: '',
        imageWidthPercent: 100,
        layout: 'image-top',
        alignment: 'left',
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '标题', type: 'text', value: '' },
        { key: 'description', label: '描述', type: 'rich-text', value: '' },
        { key: 'alignment', label: '文字对齐', type: 'text', value: 'left', options: [
          { label: '左对齐', value: 'left' },
          { label: '居中对齐', value: 'center' },
          { label: '右对齐', value: 'right' }
        ] },
        { key: 'image', label: '图片', type: 'image', value: '' },
        { key: 'layout', label: '布局方式', type: 'text', value: 'image-top', options: [
          { label: '图片在上', value: 'image-top' },
          { label: '图片在下', value: 'image-bottom' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] }
      ],
      previewComponent: ImageTextPreview
    },

  {
      type: 'image-text-horizontal',
      name: '图文展示-左右结构',
      description: '图片和文字组合展示区块，支持左右布局方式',
      icon: '📋',
      category: '图片组件',
      defaultProps: {
        title: '标题',
        description: '这是一段描述文字，用来展示图文组件的内容。',
        image: '',
        imagePosition: 'left',
        imageWidthPercent: 100,
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '标题', type: 'text', value: '' },
        { key: 'description', label: '描述', type: 'rich-text', value: '' },
        { key: 'image', label: '图片', type: 'image', value: '' },
        { key: 'imagePosition', label: '图片位置', type: 'text', value: 'left', options: [
          { label: '图片在左', value: 'left' },
          { label: '图片在右', value: 'right' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] }
      ],
      previewComponent: ImageTextHorizontalPreview
    }
]
