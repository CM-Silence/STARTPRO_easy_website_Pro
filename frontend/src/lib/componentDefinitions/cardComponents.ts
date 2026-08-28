import { ComponentDefinition } from '@/types/templates'
import { FeatureGridLargePreview, FeatureGridPreview, NewsIndexPreview, NewsListPreview, PricingCardsPreview, ProductShowcaseCardPreview, StatsSectionPreview, TeamGridPreview, TestimonialsPreview, TimelinePreview } from '@/components/PageBuilder/previews'

export const cardComponents: ComponentDefinition[] = [
  {
      type: 'product-showcase-card',
      name: '商品展示卡片',
      description: '突出单款商品的大图展示卡片，带双按钮与主题化背景',
      icon: '🛍️',
      category: '卡片组件',
      defaultProps: {
        alignment: 'center',
        cardsPerRow: 3,
        widthOption: 'full',
        backgroundColorOption: 'default',
        cards: [
          {
            eyebrow: '新品',
            title: 'AirPods Pro 3',
            subtitle: 'The world’s best in-ear Active Noise Cancellation.',
            badgeText: '更强的低噪、空间音频与更长续航。',
            image: 'https://dummyimage.com/1200x800/edf2f7/0f172a&text=Product',
            primaryButtonText: '了解更多',
            primaryButtonLink: '#',
            secondaryButtonText: '购买',
            secondaryButtonLink: '#'
          }
        ]
      },
      editableFields: [
        {
          key: 'alignment',
          label: '对齐方式',
          type: 'text',
          value: 'center',
          options: [
            { label: '居中', value: 'center' },
            { label: '左对齐', value: 'left' }
          ]
        },
        {
          key: 'cardsPerRow',
          label: '每行卡片数',
          type: 'text',
          value: '3',
          options: [
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
            { label: '4', value: '4' },
            { label: '5', value: '5' },
            { label: '6', value: '6' }
          ]
        },
        { key: 'cards', label: '卡片列表', type: 'array', value: [] },
        {
          key: 'widthOption',
          label: '宽度选项',
          type: 'text',
          value: 'full',
          options: [
            { label: '全宽', value: 'full' },
            { label: '标准宽度', value: 'standard' }
          ]
        },
        {
          key: 'backgroundColorOption',
          label: '背景色选项',
          type: 'text',
          value: 'default',
          options: [
            { label: '默认背景色', value: 'default' },
            { label: '透明背景色', value: 'transparent' }
          ]
        }
      ],
      previewComponent: ProductShowcaseCardPreview
    },

  {
      type: 'feature-grid',
      name: '功能网格',
      description: '展示产品或服务主要功能，可为每个功能项添加链接',
      icon: '✅',
      category: '卡片组件',
      defaultProps: {
        iconColorMode: 'default',
        iconColor: '#0ea5e9',

        title: '核心功能',
        subtitle: '我们提供的主要功能和服务',
        cardsPerRow: 3,
        features: [
          { icon: '', title: '功能一', description: '功能一的详细描述', link: '' },
          { icon: '', title: '功能二', description: '功能二的详细描述', link: '' },
          { icon: '', title: '功能三', description: '功能三的详细描述', link: '' }
        ],
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '主标题', type: 'text', value: '' },
        { key: 'subtitle', label: '副标题', type: 'text', value: '' },
        { key: 'cardsPerRow', label: '每行卡片数', type: 'text', value: '3' },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: FeatureGridPreview
    },

  {
      type: 'feature-grid-large',
      name: '功能网格-大图',
      description: '展示产品或服务主要功能，支持上传较大的图片作为功能图标',
      icon: '🌟',
      category: '卡片组件',
      defaultProps: {
        iconColorMode: 'default',
        iconColor: '#0ea5e9',

        title: '核心功能',
        subtitle: '我们提供的主要功能和服务',
        cardsPerRow: 3,
        features: [
          { icon: '', title: '功能一', description: '功能一的详细描述', link: '', backgroundColorOption: 'default' },
          { icon: '', title: '功能二', description: '功能二的详细描述', link: '' },
          { icon: '', title: '功能三', description: '功能三的详细描述', link: '' }
        ],
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '主标题', type: 'text', value: '' },
        { key: 'subtitle', label: '副标题', type: 'text', value: '' },
        { key: 'cardsPerRow', label: '每行卡片数', type: 'text', value: '3' },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: FeatureGridLargePreview
    },

  {
      type: 'pricing-cards',
      name: '价格卡片',
      description: '展示产品或服务价格方案',
      icon: '💰',
      category: '卡片组件',
      defaultProps: {
        title: '价格方案',
        subtitle: '选择最适合您的方案',
        cardsPerRow: 3,
        plans: [
          {
            name: '基础版',
            price: '99',
            period: '每月',
            features: ['功能A', '功能B', '基础支持'],
            recommended: false,
            backgroundColorOption: 'default'
          },
          {
            name: '专业版',
            price: '199',
            period: '每月',
            features: ['包含基础版', '高级功能C', '优先支持'],
            recommended: true
          }
        ],
        widthOption: 'full',
        backgroundColorOption: 'default'
      },
      editableFields: [
        { key: 'title', label: '标题', type: 'text', value: '' },
        { key: 'subtitle', label: '副标题', type: 'text', value: '' },
        { key: 'cardsPerRow', label: '每行卡片数', type: 'text', value: '3' },
        { key: 'widthOption', label: '宽度选项', type: 'text', value: 'full', options: [
          { label: '全宽', value: 'full' },
          { label: '标准宽度', value: 'standard' }
        ] },
        { key: 'backgroundColorOption', label: '背景色选项', type: 'text', value: 'default', options: [
          { label: '默认背景色', value: 'default' },
          { label: '透明背景色', value: 'transparent' }
        ] }
      ],
      previewComponent: PricingCardsPreview
    },

  {
      type: 'team-grid',
      name: '团队展示',
      description: '团队成员介绍网格',
      icon: '👥',
      category: '卡片组件',
      defaultProps: {
        title: '我们的团队',
        subtitle: '认识我们的专业团队',
        members: [
          {
            name: 'CEO姓名',
            role: '首席执行官',
            bio: '简短介绍CEO的背景和经验',
            avatar: '/images/team/ceo.jpg',
            backgroundColorOption: 'default'
          },
          {
            name: 'CTO姓名',
            role: '首席技术官',
            bio: '简短介绍CTO的背景和经验',
            avatar: '/images/team/cto.jpg'
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
      previewComponent: TeamGridPreview
    },

  {
      type: 'stats-section',
      name: '统计数据',
      description: '显示重要的数据统计',
      icon: '📈',
      category: '卡片组件',
      defaultProps: {
        iconColorMode: 'default',
        iconColor: '#0ea5e9',

        title: '我们的成就',
        subtitle: '数字说明一切',
        stats: [
          { label: '满意的客户', value: '10,000+', icon: '' ,  backgroundColorOption: 'default'},
          { label: '完成项目', value: '500+', icon: '' },
          { label: '服务年限', value: '8年', icon: '' },
          { label: '团队规模', value: '50+', icon: '' }
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
      previewComponent: StatsSectionPreview
    },

  {
      type: 'timeline',
      name: '时间轴',
      description: '展示事件或发展历程',
      icon: '🕰️',
      category: '卡片组件',
      defaultProps: {
        iconColorMode: 'default',
        iconColor: '#0ea5e9',

        title: '发展历程',
        subtitle: '我们的成长轨迹',
        events: [
          {
            date: '2020年',
            title: '公司成立',
            description: '在市中心成立，开始第一个项目',
            icon: '',
            backgroundColorOption: 'default'
          },
          {
            date: '2021年',
            title: '业务扩展',
            description: '团队扩大到50人，服务范围覆盖全国',
            icon: ''
          },
          {
            date: '2022年',
            title: '技术突破',
            description: '推出革命性产品，获得多项专利',
            icon: ''
          },
          {
            date: '2023年',
            title: '国际化',
            description: '业务拓展到海外市场，成为行业领导者',
            icon: ''
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
      previewComponent: TimelinePreview
    },

  {
      type: 'testimonials',
      name: '客户评价',
      description: '展示客户的真实评价',
      icon: '💬',
      category: '卡片组件',
      defaultProps: {
        title: '客户评价',
        subtitle: '听听客户怎么说',
        testimonials: [
          {
            name: '张三',
            role: 'CEO, ABC公司',
            content: '非常专业的团队，他们的服务质量超过了我们的期望。项目交付及时，效果出色。',
            avatar: '/images/testimonials/user1.jpg',
            rating: 5,
            backgroundColorOption: 'default'
          },
          {
            name: '李四',
            role: 'CTO, XYZ科技',
            content: '合作很愉快，技术实力强。他们能够理解我们的需求并提供创新的解决方案。',
            avatar: '/images/testimonials/user2.jpg',
            rating: 5
          },
          {
            name: '王五',
            role: '产品经理, DEF集团',
            content: '从项目开始到结束，整个流程非常透明。团队响应迅速，问题解决能力强。',
            avatar: '/images/testimonials/user3.jpg',
            rating: 4
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
      previewComponent: TestimonialsPreview
    },

  {
      type: 'news-list',
      name: '新闻卡片',
      description: '展示最新的新闻和动态',
      icon: '📰',
      category: '卡片组件',
      defaultProps: {
        title: '最新动态',
        subtitle: '了解我们的最新消息',
        articles: [
          {
            title: '公司获得重要奖项',
            summary: '在行业大会上，我们获得了"最佳创新企业"奖项...',
            excerpt: '在行业大会上，我们获得了"最佳创新企业"奖项...',
            date: '2024-01-15',
            image: '/images/news/news1.jpg',
            link: '/news/award-2024',
            backgroundColorOption: 'default'
          },
          {
            title: '新产品发布会',
            summary: '我们将于下月举办新产品发布会，欢迎关注...',
            excerpt: '我们将于下月举办新产品发布会，欢迎关注...',
            date: '2024-01-10',
            image: '/images/news/news2.jpg',
            link: '/news/product-launch'
          },
          {
            title: '客户成功案例分享',
            summary: '分享一个成功的客户案例，看看我们如何帮助他们...',
            excerpt: '分享一个成功的客户案例，看看我们如何帮助他们...',
            date: '2024-01-05',
            image: '/images/news/news3.jpg',
            link: '/news/case-study'
          }
        ],
        widthOption: 'full',
        backgroundColorOption: 'default',
        viewMode: 'latest',
        pinFirst: true
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
      previewComponent: NewsListPreview
    },
  {
    type: 'news-index',
    name: '新闻列表',
    description: '行式新闻列表：搜索、分页、置顶与日期排序，可屏蔽前 N 条。',
    icon: '📰',
    category: '卡片组件',
    defaultProps: {
      title: '',
      subtitle: '',
      titleAlign: 'left',
      pageSize: 10,
      skipFirst: 0,
      widthOption: 'full',
      backgroundColorOption: 'default'
    },
    editableFields: [],
    previewComponent: NewsIndexPreview
  }
]
