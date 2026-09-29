import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Globe, Home } from 'lucide-react'
import { DocsThemeToggle } from './DocsThemeToggle'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/i18n/LocaleProvider'
import { coveredNavigate } from '@/lib/transitionNavigation'

interface DocsFooter {
  /** 版权 / 网站声明（来自系统设置） */
  copyright?: string | null
  statement?: string | null
}

interface DocsLayoutProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  logo?: { url?: string | null; name?: string | null }
  footer?: DocsFooter
  breadcrumbs: React.ReactNode
  sidebar: React.ReactNode
  toc?: React.ReactNode
  children: React.ReactNode
}

export const DocsLayout: React.FC<DocsLayoutProps> = ({
  theme,
  onToggleTheme,
  logo,
  footer,
  breadcrumbs,
  sidebar,
  toc,
  children
}) => {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { locale, suffix, languages, localize } = useLocale()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)

  React.useEffect(() => {
    const handler = () => setSidebarOpen(false)
    if (typeof window !== 'undefined') {
      window.addEventListener('docs-sidebar-navigate', handler)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('docs-sidebar-navigate', handler)
      }
    }
  }, [])

  // 切换语言：保持当前 docs 路径，仅替换语言前缀（zh 无前缀）。
  // 走 coveredNavigate，让站点「滑块」幕布先盖满再导航，避免切换语言时闪屏
  const switchLocale = (target: { code: string; suffix: string }) => {
    setLangOpen(false)
    const { asPath } = router
    const hasQuery = asPath.includes('?')
    const query = hasQuery ? asPath.slice(asPath.indexOf('?')) : ''
    const raw = hasQuery ? asPath.split('?')[0] : asPath
    const inner = suffix && raw.startsWith(`/${suffix}`) ? raw.slice(suffix.length + 1) : raw
    const next = target.suffix ? `/${target.suffix}${inner}` : inner
    const to = (next || '/') + query
    if (!coveredNavigate(to)) router.push(to)
  }

  const switcherLanguages = languages
  const currentLangName = switcherLanguages.find((l) => l.code === locale)?.display_name || locale

  return (
    <div className={`docs-shell ${theme === 'light' ? 'docs-theme-light' : 'docs-theme-dark'}`}>
      <div className="doc-layout">
        {/* 顶部导航 */}
        <div className="doc-topbar">
          <div className="doc-logo flex items-center gap-2">
            <button
              type="button"
              className="doc-menu-btn"
              aria-label="打开导航"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            {logo?.url ? (
              <img src={logo.url} alt={logo.name || 'logo'} className="h-8 w-auto object-contain" />
            ) : null}
            <Link href="/" className="text-lg font-semibold text-[var(--color-text-primary)]">
              {logo?.name || t('docs.home')}
            </Link>
          </div>
          <div className="doc-topbar__right flex items-center gap-3">
            <div className="doc-breadcrumb text-base font-semibold text-[var(--color-text-primary)]">{breadcrumbs}</div>
            {switcherLanguages.length > 1 && (
              <div
                className="doc-lang-switch relative"
                onMouseEnter={() => setLangOpen(true)}
                onMouseLeave={() => setLangOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setLangOpen((v) => !v)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm transition hover:opacity-80"
                  style={{
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    background: 'var(--color-surface-alt)'
                  }}
                  aria-haspopup="menu"
                  aria-expanded={langOpen}
                >
                  <Globe
                    className="w-4 h-4"
                    aria-hidden="true"
                  />
                  <span>{currentLangName}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {langOpen && switcherLanguages.length > 1 && (
                  <div className="absolute right-0 top-full pt-1 z-[1200]">
                    <div
                      className="overflow-hidden rounded-lg border"
                      style={{
                        borderColor: 'var(--color-border)',
                        background: 'var(--color-surface-alt)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
                      }}
                    >
                      {switcherLanguages.map((l) => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => switchLocale(l)}
                          className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                            locale === l.code ? 'font-semibold' : ''
                          }`}
                          style={{ color: locale === l.code ? 'var(--color-primary, var(--color-text-primary))' : 'var(--color-text-primary)' }}
                        >
                          {l.display_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DocsThemeToggle theme={theme} onToggle={onToggleTheme} />
            <Link
              href={localize('/')}
              aria-label="返回主页"
              className="flex items-center justify-center w-9 h-9 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)]/80 hover:border-[var(--color-text-primary)] text-[var(--color-text-primary)] transition-colors"
            >
              <Home className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="doc-breadcrumb-bar">{breadcrumbs}</div>

        <div className={`doc-grid ${toc ? 'has-toc' : ''}`}>
          <aside className={`doc-aside ${sidebarOpen ? 'is-open' : ''}`}>
            <div className="doc-aside__inner">
              {sidebar}
            </div>
          </aside>
          <main className="doc-main">{children}</main>
          {toc ? (
            <aside className="doc-toc">
              <div className="doc-toc__inner">{toc}</div>
            </aside>
          ) : null}
        </div>
      </div>

      {sidebarOpen && <div className="doc-aside__mask" onClick={() => setSidebarOpen(false)} />}

      <footer className="doc-footer">
        <div className="doc-footer__inner">
          <span>
            {footer?.statement || footer?.copyright || ''} | Powered by STARTPRO_easy_website
          </span>
        </div>
      </footer>
    </div>
  )
}