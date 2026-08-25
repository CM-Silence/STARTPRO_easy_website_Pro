import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './locales/zh/common'
import en from './locales/en/common'

export const LOCALES = ['zh', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const defaultLocale: Locale = 'zh'

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      zh: { common: zh },
      en: { common: en },
    },
    // 统一初始为默认语言，避免 SSR(zh) 与客户端(localStorage) 首帧不同导致全站 hydration 错；真实语言由 LocaleProvider 在客户端按 URL 前缀收敛
    lng: defaultLocale,
    fallbackLng: defaultLocale,
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })
}

export default i18n