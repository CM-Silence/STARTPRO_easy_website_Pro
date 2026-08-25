import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'react-i18next'
import { pagesApi } from '@/utils/api'
import { useLocale } from '@/i18n/LocaleProvider'

export default function HomePage() {
  const router = useRouter()
  const { t } = useTranslation('common')
  const { locale, localize } = useLocale()
  const [loading, setLoading] = useState(true)

  const features = [
    { title: t('home.feature1Title'), description: t('home.feature1Desc') },
    { title: t('home.feature2Title'), description: t('home.feature2Desc') },
    { title: t('home.feature3Title'), description: t('home.feature3Desc') }
  ]

  useEffect(() => {
    const redirectToFrontPage = async () => {
      try {
        const lang = locale
        const response = await pagesApi.getBySlug('home', lang)
        if (response.success && response.data.published) {
          // 中文落 /pages/home，其它语言落 /<suffix>/pages/home
          router.replace(localize('/pages/home'))
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('获取首页失败:', error)
        setLoading(false)
      }
    }

    redirectToFrontPage()
  }, [router, locale, localize])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--semantic-hero-bg)] text-theme-text transition-colors">
        <div className="h-12 w-12 rounded-full border-2 border-t-transparent border-[rgba(var(--color-primary-rgb),1)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--semantic-hero-bg)] text-theme-text transition-colors">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `radial-gradient(circle at 20% 20%, rgba(var(--color-accent-rgb),0.25), transparent 40%), radial-gradient(circle at 80% 0%, rgba(var(--color-accent-rgb),0.4), transparent 45%)`
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[rgba(0,0,0,0.45)]/30 to-transparent pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 py-24 lg:py-32">
        <div className="text-center space-y-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] rounded-full border border-semantic-panelBorder/70 bg-semantic-panel/60 text-theme-textSecondary backdrop-blur">
            {t('home.welcome')}
          </span>

          <h1 className="text-4xl md:text-6xl font-bold leading-tight text-theme-text">
            {t('home.subtitle')}
          </h1>

          <p className="text-lg md:text-xl text-theme-textSecondary max-w-3xl mx-auto">
            {t('home.intro')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/admin/login"
              className="px-8 py-3 rounded-full font-semibold text-sm tracking-wide shadow-[0_20px_60px_rgba(var(--color-primary-rgb),0.35)] transition-transform hover:-translate-y-0.5"
              style={{
                background: 'var(--semantic-cta-primary-bg)',
                color: 'var(--semantic-cta-primary-text)'
              }}
            >
              {t('home.enterAdmin')}
            </a>
            <a
              href="/admin/pages"
              className="px-8 py-3 rounded-full font-semibold text-sm tracking-wide border border-semantic-cta-secondary-border text-theme-text hover:bg-semantic-mutedBg/70 transition-colors"
            >
              {t('home.goPageManager')}
            </a>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(feature => (
            <div
              key={feature.title}
              className="bg-semantic-panel/90 border border-semantic-panelBorder rounded-2xl p-6 backdrop-blur shadow-[0_25px_80px_rgba(15,23,42,0.12)]"
            >
              <h3 className="text-xl font-semibold text-theme-text mb-3">{feature.title}</h3>
              <p className="text-sm text-theme-textSecondary leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
