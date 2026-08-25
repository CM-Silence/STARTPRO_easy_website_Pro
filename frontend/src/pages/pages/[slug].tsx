import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import Layout from '@/components/Layout'
import { motion, MotionConfig, useReducedMotion } from 'framer-motion'
import { useSettings } from '@/contexts/SettingsContext'
import { Share2, Eye } from 'lucide-react'
import { pagesApi } from '@/utils/api'
import { formatDateTime } from '@/utils'
import toast from 'react-hot-toast'
import type { PageContent } from '@/types'
import { componentPreviews } from '@/components/PageBuilder/previews'
import { Reveal } from '@/components/motion'
import { Parallax } from '@/components/motion/Parallax'
import { grabMotionSettings } from '@/styles/motion-presets'
import { TemplateComponent } from '@/types/templates'

interface DynamicPageProps {
  initialPage: PageContent | null
  initialError: string | null
  initialSettings?: any
}

export default function DynamicPage({ initialPage, initialError, initialSettings }: DynamicPageProps) {
  const { settings } = useSettings() || {}
  const reduceMotion = useReducedMotion()
  const parallaxEnabled = !reduceMotion
  const router = useRouter()
  const { slug } = router.query
  const [page, setPage] = useState<PageContent | null>(initialPage)
  const [isLoading, setIsLoading] = useState(!initialPage && !initialError)
  const [error, setError] = useState<string | null>(initialError)

  useEffect(() => {
    setPage(initialPage)
    setError(initialError)
    setIsLoading(!initialPage && !initialError)
  }, [initialPage, initialError])

  useEffect(() => {
    if (slug && typeof slug === 'string' && page?.slug !== slug) {
      fetchPage(slug)
    }
  }, [slug, page?.slug])

  const fetchPage = async (pageSlug: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await pagesApi.getBySlug(pageSlug)

      if (response.success) {
        if (response.data.published) {
          const pageData = { ...response.data }
          if (pageData.template_data && typeof pageData.template_data === 'string') {
            try {
              pageData.template_data = JSON.parse(pageData.template_data)
            } catch (parseError) {
              console.warn('解析 template_data 失败:', parseError)
              pageData.template_data = null
            }
          }
          setPage(pageData)
        } else {
          setError('页面未发布或不存在')
        }
      } else {
        setError('页面不存在')
      }
    } catch (err) {
      console.error('获取页面失败:', err)
      setError('加载页面时出现错误')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async () => {
    try {
      const url = window.location.href
      const shareData = {
        title: page?.title || '网站页面',
        text: page?.excerpt || page?.title || '',
        url
      }

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        toast.success('分享成功')
      } else {
        await navigator.clipboard.writeText(url)
        toast.success('链接已复制到剪贴板')
      }
    } catch (shareError) {
      console.log('分享错误:', shareError)
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('链接已复制到剪贴板')
      } catch (clipboardError) {
        console.error('复制失败:', clipboardError)
        toast.error('分享失败，请手动复制链接')
      }
    }
  }

  const renderVisualComponents = (components: TemplateComponent[]) => {
    return components.map((component, index) => {
      const PreviewComponent = componentPreviews[component.type as keyof typeof componentPreviews]

      if (!PreviewComponent) {
        return (
          <div key={component.id || index} className="p-4 border border-red-300 rounded-lg bg-red-50 dark:bg-red-900 dark:bg-opacity-20">
            <p className="text-red-600 dark:text-red-400">未知组件类型: {component.type}</p>
          </div>
        )
      }

      const motionCfg = grabMotionSettings(component.props)

      // 关闭「滚动显现」：区块完全静止显示，预览内部的进场动画一并禁用
      if (!motionCfg.reveal) {
        return (
          <div key={component.id || index} className="mb-6">
            <MotionConfig reducedMotion="always">
              <PreviewComponent component={component} />
            </MotionConfig>
          </div>
        )
      }

      if (!parallaxEnabled || !motionCfg.parallax) {
        return (
          <Reveal
            key={component.id || index}
            config={component.props?.motion}
            staggerDelay={index * 0.06}
            className="mb-6"
          >
            <PreviewComponent component={component} />
          </Reveal>
        )
      }

      // 视差默认开启：给每个区块加一段随滚动缓慢移动的伴随视差（图片/文字错层）
      return (
        <Parallax key={component.id || index} speed={motionCfg.parallaxSpeed} className="mb-6">
          <Reveal config={component.props?.motion} staggerDelay={index * 0.06}>
            <PreviewComponent component={component} />
          </Reveal>
        </Parallax>
      )
    })
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tech-accent mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">页面加载中...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !page) {
    return (
      <Layout>
        <Head>
          <title>页面不存在</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              页面不存在
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || '抱歉，您访问的页面不存在或已被删除。'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-6 py-3 bg-tech-accent text-white rounded-lg hover:bg-tech-secondary transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  const pageTitle = page.meta_title || page.title
  const pageDescription = page.meta_description || page.excerpt || settings?.site_description || ''

  return (
    <Layout settings={initialSettings}>
      <Head>
        <title key="meta:title">{pageTitle}</title>
        <meta key="meta:description" name="description" content={pageDescription} />
        <meta key="og:title" property="og:title" content={pageTitle} />
        <meta
          key="og:description"
          property="og:description"
          content={pageDescription}
        />
        {page.featured_image && (
          <meta key="og:image" property="og:image" content={page.featured_image} />
        )}
        <meta key="og:type" property="og:type" content="article" />
        <meta
          key="og:url"
          property="og:url"
          content={`${typeof window !== 'undefined' ? window.location.origin : ''}/pages/${page.slug}`}
        />
      </Head>

      <div className="min-h-screen">
        <div className="w-full px-0 py-0">
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            {page.featured_image && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="rounded-2xl overflow-hidden shadow-xl mb-6"
              >
                <img
                  src={page.featured_image}
                  alt={page.title}
                  className="w-full h-[420px] object-cover"
                />
              </motion.div>
            )}

            {/* 主体内容 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="w-full space-y-8"
            >
              {page.template_data && Array.isArray((page.template_data as any).components)
                ? renderVisualComponents((page.template_data as any).components)
                : (
                  <div
                    className="prose prose-lg dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: page.content?.replace(/\n/g, '<br>') || '暂无内容'
                    }}
                  />
                )}
            </motion.div>

            {page.show_updated_date && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-end mt-10 pt-4 text-text-secondary"
              >
                <Eye className="w-4 h-4 mr-2" />
                <span className="text-sm">
                  最后更新 {formatDateTime(page.updated_at)}
                </span>
              </motion.div>
            )}
          </motion.article>
        </div>
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = context.params?.slug
  if (!slug || Array.isArray(slug)) {
    return { notFound: true }
  }

  const apiBase = process.env.API_BASE_URL || 'http://localhost:3003'
  const url = `${apiBase}/api/pages/slug/${encodeURIComponent(slug)}`
  const settingsUrl = `${apiBase}/api/settings`

  try {
    const response = await fetch(url, {
      headers: {
        // 携带 cookie 便于登录状态预览未发布页面
        cookie: context.req.headers.cookie || ''
      }
    })

    const data = await response.json()

    let initialSettings: any = null
    try {
      const settingsRes = await fetch(settingsUrl, {
        headers: { cookie: context.req.headers.cookie || '' }
      })
      const settingsJson = await settingsRes.json()
      if (settingsJson?.success && settingsJson?.data) {
        initialSettings = settingsJson.data
      }
    } catch (err) {
      console.warn('SSR 获取站点设置失败:', err)
    }

    if (!data?.success || !data?.data) {
      return {
        props: {
          initialPage: null,
          initialError: data?.message || '页面不存在',
          initialSettings
        }
      }
    }

    const pageData = data.data
    if (pageData.template_data && typeof pageData.template_data === 'string') {
      try {
        pageData.template_data = JSON.parse(pageData.template_data)
      } catch {
        pageData.template_data = null
      }
    }

    return {
      props: {
        initialPage: pageData,
        initialError: null,
        initialSettings
      }
    }
  } catch (error) {
    console.error('SSR 获取页面失败:', error)
    return {
      props: {
        initialPage: null,
        initialError: '加载页面时出错',
        initialSettings: null
      }
    }
  }
}
