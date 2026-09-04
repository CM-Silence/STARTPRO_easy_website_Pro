import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { settingsApi } from '@/utils/api'
import { getCachedData, registerSource, onCacheChanged } from '@/utils/dataCache'
import type { Settings } from '@/types'
import { setCustomThemePalette } from '@/styles/themes'
import { getDefaultFooterLayout, getDefaultFooterSocialLinks } from '@/constants/footerDefaults'
import { useLocale } from '@/i18n/LocaleProvider'

interface SettingsContextType {
  settings: Settings | null
  isLoading: boolean
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType>({
  settings: null,
  isLoading: true,
  refreshSettings: async () => {}
})

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

interface SettingsProviderProps {
  children: React.ReactNode
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { locale } = useLocale()

  const fetchSettings = async () => {
    try {
      setIsLoading(true)

      // 登记数据源注册表，使全局「刷新」按钮能命中站点设置强制重拉；刷新成功后回到本流程兜底缓存。
      registerSource({
        key: `settings:${locale}`,
        entity: 'settings',
        lang: locale,
        fetcher: () => settingsApi.get(locale),
        onFresh: () => {
          void fetchSettings()
        }
      })

      // 走条件更新式缓存：无缓存/内容已变→拉新；内容未变→用缓存；弱网→回退旧缓存并标记。
      const response = await getCachedData({
        key: `settings:${locale}`,
        entity: 'settings',
        lang: locale,
        fetcher: () => settingsApi.get(locale)
      })

      if (response.success) {
        const { site_record: _removedRecord, nav_layout_style: _removedLayout, theme_overrides: _removedOverrides, ...rest } =
          response.data || {}
        const settingsWithDefaults: Settings = {
          ...rest,
          site_keywords: (response.data as any)?.site_keywords || '',
          site_statement: (response.data as any)?.site_statement || '',
          icp_link: (response.data as any)?.icp_link || '',
          site_font: (response.data as any)?.site_font || 'inter',
          site_font_custom_name: (response.data as any)?.site_font_custom_name || '',
          site_font_url: (response.data as any)?.site_font_url || '',
          footer_layout: response.data.footer_layout ?? getDefaultFooterLayout(),
          footer_social_links: response.data.footer_social_links ?? [],
          theme_background: response.data.theme_background ?? 'theme-default',
          allow_search_index: (response.data as any)?.allow_search_index !== false,
          verification_tags: (response.data as any)?.verification_tags || {},
          custom_theme: (response.data as any)?.custom_theme || undefined
        }
        setCustomThemePalette(settingsWithDefaults.custom_theme)
        setSettings(settingsWithDefaults)
      } else {
        const defaultSettings: Settings = {
          site_name: '',
          company_name: '',
          site_description: '',
          site_keywords: '',
          site_font: 'inter',
          site_font_custom_name: '',
          site_font_url: '',
          site_statement: '',
          icp_link: '',
          site_logo: '',
          site_favicon: '',
          contact_email: 'contact@example.com',
          contact_phone: '400-123-4567',
          address: '',
          icp_number: '',
          analytics_code: '',
          site_theme: 'neo-futuristic',
          allow_search_index: true,
          verification_tags: {},
          social_links: {
            weibo: '',
            wechat: '',
            qq: '',
            email: ''
          },
          quick_links: [],
          footer_layout: getDefaultFooterLayout(),
          footer_social_links: getDefaultFooterSocialLinks(),
          theme_background: 'theme-default',
        page_transition: 'slide',
        transition_main_title: '',
        transition_subtitle: '',
        smooth_scroll: 'on',
        smooth_scroll_duration: '0.9',
          custom_theme: undefined
        }
        setCustomThemePalette(defaultSettings.custom_theme)
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('获取设置失败:', error)
      const fallbackSettings: Settings = {
        site_name: '',
        company_name: '',
        site_description: '',
        site_keywords: '',
        site_font: 'inter',
        site_font_custom_name: '',
        site_font_url: '',
        site_statement: '',
        icp_link: '',
        site_logo: '',
        site_favicon: '',
        contact_email: 'contact@example.com',
        contact_phone: '400-123-4567',
        address: '',
        icp_number: '',
        analytics_code: '',
        site_theme: 'neo-futuristic',
        allow_search_index: true,
        verification_tags: {},
        social_links: {
          weibo: '',
          wechat: '',
          qq: '',
          email: ''
        },
        quick_links: [],
        footer_layout: getDefaultFooterLayout(),
        footer_social_links: getDefaultFooterSocialLinks(),
        theme_background: 'theme-default',
        page_transition: 'slide',
        transition_main_title: '',
        transition_subtitle: '',
        smooth_scroll: 'on',
        smooth_scroll_duration: '0.9',
        custom_theme: undefined
      }
      setCustomThemePalette(fallbackSettings.custom_theme)
      setSettings(fallbackSettings)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSettings = async () => {
    await fetchSettings()
  }

  // ref 注入，供「缓存后台刷新」回调读取最新的 fetchSettings（避免过期闭包）
  const fetchSettingsRef = useRef(fetchSettings)
  fetchSettingsRef.current = fetchSettings

  // 站点设置缓存被后台重新拉取（内容已变）后，自动重读并套用最新设置
  useEffect(() => {
    return onCacheChanged(`settings:${locale}`, () => {
      void fetchSettingsRef.current()
    })
  }, [locale])

  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        refreshSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}
