import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { settingsApi, navigationApi } from '@/utils/api'
import { useLocale } from '@/i18n/LocaleProvider'
import { coveredNavigate } from '@/lib/transitionNavigation'
import type { NavigationItem } from '@/types'
import { getCurrentThemeId, getThemeById } from '@/styles/themes'
import type { NavItem, ThemeAwareHeaderProps, NavStyles } from '@/types/navigation'

const makeDefaultNavigation = (t: TFunction): NavItem[] => [
  { label: t('nav.home'), href: '/' },
  {
    label: t('nav.products'),
    href: '/services',
    children: [
      { label: t('nav.consulting'), href: '/services/consulting' },
      { label: t('nav.software'), href: '/services/development' },
      { label: t('nav.integration'), href: '/services/integration' }
    ]
  },
  { label: t('nav.solutions'), href: '/solutions' },
  { label: t('nav.cases'), href: '/cases' },
  { label: t('nav.about'), href: '/about' },
  { label: t('nav.contact'), href: '/contact' }
]

/** 深色主题 ID 列表 — 这些主题的浅色文字在白色毛玻璃上不可读 */
const DARK_THEME_IDS = ['neo-futuristic', 'elegant-dark', 'starry-night', 'mystic-purple', 'minimal-pro']

/** 十六进制颜色转 RGB 数组 */
const hexToRgb = (hex: string): number[] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0]
}

/** 从主题计算导航栏所需的完整样式 */
const computeNavStyles = (themeId: string): NavStyles => {
  const theme = getThemeById(themeId)
  const isDark = DARK_THEME_IDS.includes(themeId)

  const primary = theme.colors.primary
  const accent = theme.colors.accent
  const secondary = theme.colors.secondary || accent

  // 深色主题下使用深色文字以确保在白色毛玻璃上可读
  const textColor = isDark ? '#1F2937' : theme.colors.text.primary

  const [accentR, accentG, accentB] = hexToRgb(accent)

  return {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    textColor,
    borderColor: `rgba(148, 163, 184, 0.15)`,
    hoverColor: accent,
    activeColor: primary,
    dropdownBgColor: 'rgba(255, 255, 255, 0.85)',
    dropdownBorderColor: `rgba(148, 163, 184, 0.1)`,
    shadowColor: `rgba(${accentR}, ${accentG}, ${accentB}, 0.1)`,
    // 新增字段
    gradientTextColors: [primary, accent, secondary, primary],
    underlineGlowColor: `rgba(${accentR}, ${accentG}, ${accentB}, 0.4)`,
    accentGradientLeftBar: `linear-gradient(180deg, ${primary}, ${accent})`,
  }
}

/**
 * 主题感知炫酷导航栏组件
 * 整合 Legacy 项目的毛玻璃、渐变文字、发光下划线、下拉动画等效果
 */
export default function ThemeAwareHeader({
  logo,
  siteName,
  navigation
}: ThemeAwareHeaderProps) {
  const { t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const defaultNavigation = useMemo(() => makeDefaultNavigation(t), [t])
  const [dynamicNavigation, setDynamicNavigation] = useState<NavItem[]>(defaultNavigation)
  const [dynamicSettings, setDynamicSettings] = useState<{ site_name?: string; site_logo?: string; company_name?: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [currentThemeId, setCurrentThemeId] = useState('neo-futuristic')
  const [headerStyles, setHeaderStyles] = useState<NavStyles>(() => computeNavStyles('neo-futuristic'))

  const router = useRouter()

  // --- 主题样式更新 ---
  const updateThemeStyles = useCallback(() => {
    const themeId = getCurrentThemeId()
    setCurrentThemeId(themeId)
    setHeaderStyles(computeNavStyles(themeId))
  }, [])

  // --- 初始化 & 事件监听 ---
  useEffect(() => {
    updateThemeStyles()

    const handleThemeChange = () => updateThemeStyles()
    const handleScroll = () => setScrolled(window.scrollY > 10)

    window.addEventListener('themeChanged', handleThemeChange)
    window.addEventListener('scroll', handleScroll, { passive: true })

    // 初始检查滚动位置
    handleScroll()

    return () => {
      window.removeEventListener('themeChanged', handleThemeChange)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [updateThemeStyles])

  // --- 获取动态导航数据 ---
  const { locale, suffix, localize, languages } = useLocale()
  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        const navResponse = await navigationApi.getAll(locale)
        if (navResponse.success && navResponse.data) {
          const navItems = navResponse.data.map((item: NavigationItem) => ({
            label: item.name,
            href: item.url,
            external: item.target === '_blank',
            children: item.children?.map(child => ({
              label: child.name,
              href: child.url,
              external: child.target === '_blank'
            }))
          }))
          setDynamicNavigation(navItems)
        } else {
          setDynamicNavigation(defaultNavigation)
        }

        try {
          const settingsResponse = await settingsApi.get(locale)
          if (settingsResponse.success && settingsResponse.data) {
            setDynamicSettings(settingsResponse.data)
          }
        } catch {
          // 静默回退
        }
      } catch {
        setDynamicNavigation(defaultNavigation)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDynamicData()
  }, [locale, defaultNavigation])

  // --- 语言切换器：已启用语言由 LocaleProvider 提供（缓存驱动，自动隐藏已禁用语言） ---

  // --- 辅助函数 ---
  const isActiveLink = (href: string) => {
    if (href === '/') return router.pathname === '/'
    return router.pathname.startsWith(href)
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen)
    setActiveDropdown(null)
  }

  const toggleDropdown = (label: string) => {
    setActiveDropdown(activeDropdown === label ? null : label)
  }

  const switchLocale = (target: { code: string; suffix: string }) => {
    setLangOpen(false)
    const hasQuery = router.asPath.includes('?')
    const query = hasQuery ? router.asPath.slice(router.asPath.indexOf('?')) : ''
    const raw = hasQuery ? router.asPath.split('?')[0] : router.asPath
    const inner = suffix && raw.startsWith(`/${suffix}`) ? raw.slice(suffix.length + 1) : raw
    const next = target.suffix ? `/${target.suffix}${inner}` : inner
    const to = (next || '/') + query
    // 对齐项目转场：先让幕布盖满再导航；幕布不可用时直接跳转
    if (!coveredNavigate(to)) router.push(to)
  }

  // --- 数据合并 ---
  const currentNavigation = navigation || dynamicNavigation
  const currentSiteName = siteName || dynamicSettings.company_name || dynamicSettings.site_name || ''
  const currentLogo = logo || dynamicSettings.site_logo || ''

  // --- 构建 CSS 变量 ---
  const gradientColors = headerStyles.gradientTextColors || [headerStyles.activeColor, headerStyles.hoverColor, headerStyles.activeColor]
  const gradientTextValue = `linear-gradient(90deg, ${gradientColors.join(', ')})`

  const rootCssVars = {
    '--gradient-text': gradientTextValue,
    '--underline-glow': headerStyles.underlineGlowColor || `rgba(59, 130, 246, 0.4)`,
    '--accent-gradient-bar': headerStyles.accentGradientLeftBar || `linear-gradient(180deg, #3b82f6, #8b5cf6)`,
  } as React.CSSProperties

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        ...rootCssVars,
        color: headerStyles.textColor,
      }}
      className={`nav-glass sticky top-0 left-0 right-0 z-[9999] transition-all duration-300 ${scrolled ? 'scrolled py-1' : 'py-2'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between" style={{ height: '70px' }}>

          {/* === Logo === */}
          <Link href={localize('/')} className="flex items-center space-x-3 group no-underline">
            {currentLogo ? (
              <div className="animate-logo-float">
                <img
                  src={currentLogo}
                  alt={currentSiteName || 'logo'}
                  className="h-9 w-auto logo-icon-glow"
                />
              </div>
            ) : null}
            {currentSiteName ? (
              <span
                className="text-xl font-bold hidden sm:block"
                style={{ color: headerStyles.textColor }}
              >
                {currentSiteName}
              </span>
            ) : null}
          </Link>

          {/* === Desktop Navigation === */}
          <nav className="hidden md:flex items-center space-x-1">
            {currentNavigation.map((item: NavItem) => (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => setActiveDropdown(item.label)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                  {item.children ? (
                  <>
                    <Link
                      href={localize(item.href)}
                      className={`flex items-center px-4 py-2 rounded-md text-sm font-medium nav-link-gradient nav-link-underline ${isActiveLink(item.href) ? 'nav-active font-semibold' : ''}`}
                      style={{
                        backgroundImage: `linear-gradient(90deg, ${headerStyles.textColor}, ${headerStyles.textColor})`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundImage = gradientTextValue
                      }}
                      onMouseLeave={(e) => {
                        if (!isActiveLink(item.href)) {
                          e.currentTarget.style.backgroundImage = `linear-gradient(90deg, ${headerStyles.textColor}, ${headerStyles.textColor})`
                        }
                      }}
                    >
                      <span className="relative z-20">{item.label}</span>
                    </Link>

                    {/* 下拉菜单 */}
                    <AnimatePresence>
                      {activeDropdown === item.label && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute top-full left-0 pt-1.5 w-52 z-[1200]"
                          style={{ transformOrigin: 'top left' }}
                        >
                          <div className="dropdown-glass dropdown-arrow overflow-hidden">
                          <div className="py-1">
                            {item.children.map((child: NavItem) => (
                              <Link
                                key={child.label}
                                href={localize(child.href)}
                                className={`dropdown-item-accent block px-6 py-3 text-sm transition-colors duration-200 ${isActiveLink(child.href) ? 'font-semibold' : ''}`}
                                style={{
                                  color: isActiveLink(child.href) ? headerStyles.activeColor : headerStyles.textColor,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = headerStyles.hoverColor
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = isActiveLink(child.href) ? headerStyles.activeColor : headerStyles.textColor
                                }}
                              >
                                <span>{child.label}</span>
                              </Link>
                            ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <Link
                    href={localize(item.href)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium nav-link-gradient nav-link-underline ${isActiveLink(item.href) ? 'nav-active font-semibold' : ''}`}
                    style={{
                      backgroundImage: `linear-gradient(90deg, ${headerStyles.textColor}, ${headerStyles.textColor})`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundImage = gradientTextValue
                    }}
                    onMouseLeave={(e) => {
                      if (!isActiveLink(item.href)) {
                        e.currentTarget.style.backgroundImage = `linear-gradient(90deg, ${headerStyles.textColor}, ${headerStyles.textColor})`
                      }
                    }}
                    {...(item.external && { target: '_blank', rel: 'noopener noreferrer' })}
                  >
                    <span className="relative z-20">{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* === 右侧操作区：语言切换 + 汉堡菜单 === */}
          <div className="flex items-center">
            {/* 语言切换器：停留在当前路径，仅切换语言前缀 */}
            {languages.length > 1 && (
            <div
              className="relative mr-1"
              onMouseEnter={() => setLangOpen(true)}
              onMouseLeave={() => setLangOpen(false)}
            >
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: headerStyles.textColor }}
                aria-haspopup="menu"
                aria-expanded={langOpen}
              >
                <img
                  src="/system-default/bootstrap-icons/globe2.svg"
                  alt=""
                  className="w-4 h-4"
                />
                <span>{languages.find((l) => l.code === locale)?.display_name || locale}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full pt-1.5 w-28 z-[1200]"
                    style={{ transformOrigin: 'top right' }}
                  >
                    <div className="dropdown-glass overflow-hidden rounded-lg">
                      <div className="py-1">
                        {languages.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => switchLocale(l)}
                            className={`block w-full text-left px-4 py-2 text-sm transition-colors ${locale === l.code ? 'font-semibold' : ''}`}
                            style={{
                              color: locale === l.code ? headerStyles.activeColor : headerStyles.textColor,
                            }}
                          >
                            {l.display_name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}

            <div
              className={`hamburger ${isOpen ? 'active' : ''}`}
              onClick={toggleMenu}
              role="button"
              aria-label={t('nav.toggleMenu')}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') toggleMenu() }}
            >
              <span className="hamburger-line" style={{ background: headerStyles.hoverColor }} />
              <span className="hamburger-line" style={{ background: headerStyles.hoverColor }} />
              <span className="hamburger-line" style={{ background: headerStyles.hoverColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* === 移动端菜单 === */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden absolute top-full left-0 right-0 dropdown-glass rounded-b-2xl overflow-hidden border-t"
            style={{ borderColor: headerStyles.dropdownBorderColor }}
          >
            <div className="px-4 py-6 space-y-3">
              {currentNavigation.map((item: NavItem) => (
                <div key={item.label} className="rounded-xl overflow-hidden">
                  {item.children ? (
                    <div className="rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between">
                        <Link
                          href={localize(item.href)}
                          onClick={() => setIsOpen(false)}
                          className={`flex-1 px-5 py-4 text-left text-base font-medium transition-colors duration-200 ${isActiveLink(item.href) ? 'font-semibold' : ''}`}
                          style={{
                            color: isActiveLink(item.href) ? headerStyles.activeColor : headerStyles.textColor,
                          }}
                        >
                          {item.label}
                        </Link>
                        <button
                          onClick={() => toggleDropdown(item.label)}
                          className="p-4 transition-colors duration-200"
                          style={{ color: headerStyles.textColor }}
                          aria-label={t('nav.expandSubmenu', { label: item.label })}
                        >
                          <svg
                            className={`w-5 h-5 transition-transform duration-300 ${activeDropdown === item.label ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>

                      <AnimatePresence>
                        {activeDropdown === item.label && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-black/5"
                          >
                            <div className="py-2 space-y-1">
                              {item.children.map((child: NavItem) => (
                                <Link
                                  key={child.label}
                                  href={localize(child.href)}
                                  onClick={() => setIsOpen(false)}
                                  className={`dropdown-item-accent block px-8 py-4 text-sm transition-all duration-200`}
                                  style={{
                                    color: isActiveLink(child.href) ? headerStyles.activeColor : headerStyles.textColor,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = headerStyles.hoverColor
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = isActiveLink(child.href) ? headerStyles.activeColor : headerStyles.textColor
                                  }}
                                >
                                  <div className="flex items-center">
                                    <span className="w-2 h-2 rounded-full opacity-30 mr-3" style={{ background: headerStyles.hoverColor }}></span>
                                    <span>{child.label}</span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      href={localize(item.href)}
                      onClick={() => setIsOpen(false)}
                      className={`block px-5 py-4 text-base font-medium transition-colors duration-200 rounded-lg ${isActiveLink(item.href) ? 'font-semibold' : ''}`}
                      style={{
                        color: isActiveLink(item.href) ? headerStyles.activeColor : headerStyles.textColor,
                      }}
                      {...(item.external && { target: '_blank', rel: 'noopener noreferrer' })}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
