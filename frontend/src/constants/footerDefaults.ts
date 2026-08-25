import { FooterLayout, FooterSocialLink } from '@/types'
import type { TFunction } from 'i18next'

export const getDefaultFooterLayout = (t?: TFunction): FooterLayout => ({
  brand: {
    name: t?.('footer.brandName') ?? '某某科技有限公司',
    description: t?.('footer.brandDescription') ?? '致力于为客户提供专业的数字化解决方案，助力企业完成数字化转型与业务升级。',
    logo: ''
  },
  sections: [
    {
      id: 'about',
      title: t?.('footer.sectionAbout') ?? '关于我们',
      description: '',
      links: [
        { id: 'about-company', label: t?.('footer.linkAbout') ?? '公司简介', url: '/about', target: '_self' },
        { id: 'news', label: t?.('footer.linkNews') ?? '新闻动态', url: '/news', target: '_self' },
        { id: 'contact', label: t?.('footer.linkContact') ?? '联系我们', url: '/contact', target: '_self' }
      ]
    },
    {
      id: 'products',
      title: t?.('footer.sectionProducts') ?? '产品与服务',
      description: '',
      links: [
        { id: 'solutions', label: t?.('footer.linkSolutions') ?? '解决方案', url: '/solutions', target: '_self' },
        { id: 'cases', label: t?.('footer.linkCases') ?? '客户案例', url: '/cases', target: '_self' },
        { id: 'services', label: t?.('footer.linkCustomDev') ?? '定制开发', url: '/services', target: '_self' }
      ]
    },
    {
      id: 'support',
      title: t?.('footer.sectionSupport') ?? '支持中心',
      description: '',
      links: [
        { id: 'docs', label: t?.('footer.linkDocs') ?? '帮助文档', url: '/docs', target: '_self' },
        { id: 'support', label: t?.('footer.linkTickets') ?? '服务工单', url: '/support', target: '_self' },
        { id: 'faq', label: t?.('footer.linkFaq') ?? '常见问题', url: '/faq', target: '_self' }
      ]
    }
  ]
})

export const getDefaultFooterSocialLinks = (t?: TFunction): FooterSocialLink[] => [
  {
    id: 'wechat',
    label: t?.('footer.socialWechat') ?? '官方微信',
    icon: '/system-default/icons/wechat.svg',
    url: 'https://weixin.qq.com',
    target: '_blank',
    color: '',
    show_hover_image: false,
    hover_image: ''
  },
  {
    id: 'weibo',
    label: t?.('footer.socialWeibo') ?? '新浪微博',
    icon: '/system-default/icons/weibo.svg',
    url: 'https://weibo.com',
    target: '_blank',
    color: '',
    show_hover_image: false,
    hover_image: ''
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '/system-default/icons/linkedin.svg',
    url: 'https://www.linkedin.com',
    target: '_blank',
    color: '',
    show_hover_image: false,
    hover_image: ''
  }
]