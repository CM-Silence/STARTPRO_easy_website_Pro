import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import type { GetServerSideProps } from 'next'
import type { Doc, DocNode } from '@/types'
import DOMPurify from 'isomorphic-dompurify'
import { marked } from 'marked'
import { DocsLayout } from '@/components/docs/DocsLayout'
import { DocsSidebar } from '@/components/docs/DocsSidebar'
import { DocContent } from '@/components/docs/DocContent'
import { useTranslation } from 'react-i18next'
import { useLocale } from '@/i18n/LocaleProvider'

// pdf.js 仅浏览器端可用，服务端渲染时动态加载，避免 SSR 报错
const PdfViewer = dynamic(() => import('@/components/docs/PdfViewer'), { ssr: false })

interface DocsPageProps {
  doc: Doc
  tree: DocNode[]
  slugPath: string
  settings: {
    site_name?: string | null
    site_logo?: string | null
    site_favicon?: string | null
    copyright?: string | null
    icp?: string | null
    site_statement?: string | null
    site_description?: string | null
    company_name?: string | null
  }
  initialTheme?: 'light' | 'dark' | null
}

const findFirstPublishedSlug = (nodes: DocNode[]): string | null => {
  for (const node of nodes) {
    if (node.status === 'published') return node.slug
    if (node.children) {
      const child = findFirstPublishedSlug(node.children)
      if (child) return child
    }
  }
  return null
}

// 公共侧边栏：文件夹始终保留；文档需已发布
const filterPublishedTree = (nodes: DocNode[]): DocNode[] =>
  nodes
    .filter((node) => node.type === 'folder' || node.status === 'published')
    .map((node) => ({
      ...node,
      children: node.children ? filterPublishedTree(node.children) : []
    }))

const Breadcrumbs = ({ items }: { items: { label: string; href?: string }[] }) => (
  <nav className="text-sm text-[var(--color-text-secondary)] flex flex-wrap items-center gap-x-1">
    <span>/</span>
    {items.map((item, idx) => (
      <React.Fragment key={item.href || item.label + idx}>
        {idx > 0 && <span>/</span>}
        <span className={item.href ? 'hover:underline' : 'text-[var(--color-text-primary)]'}>{item.label}</span>
      </React.Fragment>
    ))}
  </nav>
)

export default function DocsPage({ doc, tree, slugPath, settings, initialTheme }: DocsPageProps) {
  const { t } = useTranslation('common')
  const { localize } = useLocale()
  // 主题初始值来自请求 Cookie（SSR 已按用户上次选择渲染），避免切换语言/导航时闪回默认暗色
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme || 'dark')
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      try {
        document.cookie = `docs-theme=${next};path=/;max-age=31536000`
        window.localStorage.setItem('docs-theme', next)
      } catch {
        /* ignore */
      }
      return next
    })
  }
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([])
  const [activeHeadingId, setActiveHeadingId] = useState<string>('')
  const isPdf = doc.content_format === 'pdf'
  const pdfUrl = isPdf ? doc.content || '' : ''
  const rawHtml = useMemo(() => {
    if (isPdf) return ''
    const content = doc.content || ''
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content)
    const format = doc.content_format || (looksLikeHtml ? 'html' : 'markdown')
    if (format === 'markdown') return marked.parse(content)
    return content
  }, [doc.content, doc.content_format, isPdf])
  const safeHtml = useMemo(() => DOMPurify.sanitize(rawHtml), [rawHtml])
  const siteName = settings.site_name || doc.title
  const logoName = siteName || t('docs.home')

  // 避免被全局标题覆盖，强制文档页标题
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `${t('docs.title')} - ${doc.title}`
    }
  }, [doc.title])

  const findPath = useCallback((nodes: DocNode[], target: string, path: string[] = []): string[] | null => {
    for (const node of nodes) {
      const nextPath = [...path, node.slug]
      if (node.slug === target) return nextPath
      if (node.children) {
        const found = findPath(node.children, target, nextPath)
        if (found) return found
      }
    }
    return null
  }, [])

  const defaultExpanded = useMemo(() => {
    const path = findPath(tree, slugPath) || []
    return new Set(path)
  }, [tree, slugPath, findPath])

  // 仅展示文件夹 + 其文档（保持与后台一致）
  const sidebarTree = useMemo(
    () =>
      tree
        .filter((n) => n.type === 'folder')
        .map((folder) => ({
          ...folder,
          children: (folder.children || []).filter((c) => c.type !== 'folder' && c.status === 'published')
        })),
    [tree]
  )

  const [expanded, setExpanded] = useState<Set<string>>(defaultExpanded)

  useEffect(() => {
    setExpanded(defaultExpanded)
  }, [defaultExpanded])

  const toggle = (slug: string) => {
    setExpanded((prev) => {
      const next = new Set<string>()
      if (slug && !prev.has(slug)) next.add(slug)
      return next
    })
  }

  const findNodeBySlug = useCallback((nodes: DocNode[], target: string): DocNode | null => {
    for (const node of nodes) {
      if (node.slug === target) return node
      if (node.children) {
        const found = findNodeBySlug(node.children, target)
        if (found) return found
      }
    }
    return null
  }, [])

  const breadcrumbItems = useMemo(() => {
    const parts = slugPath.split('/').filter(Boolean)
    const items: { label: string; href?: string }[] = []
    let current = ''
    parts.forEach((part, idx) => {
      current = current ? `${current}/${part}` : part
      const node = findNodeBySlug(tree, current)
      const label = node?.title || part
      const isLast = idx === parts.length - 1
      items.push({ label: isLast ? doc.title : label, href: isLast ? undefined : localize(`/docs/${current}`) })
    })
    return items
  }, [slugPath, tree, findNodeBySlug, doc.title])

  const Toc = () => {
    if (!headings.length) return null
    const handleClick = (id: string) => {
      const target = document.getElementById(id)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    return (
      <nav aria-label={t('docs.toc')} className="doc-toc__nav">
        <div className="doc-toc__title">{t('docs.toc')}</div>
        <ul className="doc-toc__list">
          {headings.map((h) => (
            <li key={h.id} className={`doc-toc__item level-${h.level} ${activeHeadingId === h.id ? 'is-active' : ''}`}>
              <button type="button" onClick={() => handleClick(h.id)} className="doc-toc__link">
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    )
  }

  return (
    <>
        <Head>
          <title>{t('docs.title')} - {doc.title}</title>
          {settings.site_favicon ? (
            <>
              <link id="favicon" rel="icon" href={settings.site_favicon} />
              <link rel="shortcut icon" href={settings.site_favicon} />
            </>
          ) : null}
        </Head>
      <DocsLayout
        theme={theme}
        onToggleTheme={toggleTheme}
        logo={{ url: settings.site_logo || undefined, name: logoName }}
        footer={{
          copyright: settings.copyright,
          statement: settings.site_statement
        }}
        breadcrumbs={<Breadcrumbs items={breadcrumbItems} />}
        sidebar={<DocsSidebar nodes={sidebarTree} activeSlug={slugPath} expanded={expanded} onToggle={toggle} />}
        toc={<Toc />}
      >
        <DocContent
          title={doc.title}
          summary={doc.summary}
          html={safeHtml}
          pdfViewer={
            isPdf ? <PdfViewer src={pdfUrl} fileName={doc.title ? `${doc.title}.pdf` : undefined} /> : undefined
          }
          onHeadingsChange={setHeadings}
          onActiveHeadingChange={setActiveHeadingId}
        />
      </DocsLayout>

      
    </>
  )
}

export const getServerSideProps: GetServerSideProps<DocsPageProps> = async (context) => {
  const slugParam = context.params?.slug
  const slugPath = Array.isArray(slugParam) ? slugParam.join('/') : ''
  const locale = ((context.req.headers['x-locale'] as string) || 'zh').toString()
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3003'

  // 读取用户上次选择的文档主题，SSR 直接按该主题渲染，避免导航时闪回默认暗色
  const cookie = (context.req.headers.cookie || '').split(';').reduce<Record<string, string>>((acc, c) => {
    const idx = c.indexOf('=')
    if (idx === -1) return acc
    const k = c.slice(0, idx).trim()
    const v = c.slice(idx + 1).trim()
    if (k === 'docs-theme' && (v === 'light' || v === 'dark')) acc[k] = v
    return acc
  }, {})
  const cookieTheme = cookie['docs-theme'] ? (cookie['docs-theme'] as 'light' | 'dark') : null

  try {
    const [treeRes, settingsRes] = await Promise.all([
      fetch(`${baseUrl}/api/docs/tree?lang=${locale}`),
      fetch(`${baseUrl}/api/settings?lang=${locale}`).catch(() => null)
    ])
    if (!treeRes.ok) return { notFound: true }
    const treeData = await treeRes.json()
    const tree: DocNode[] = filterPublishedTree(treeData.data || [])

    if (!slugPath) {
      const first = findFirstPublishedSlug(tree)
      if (first) {
        const prefix = locale === 'zh' ? '' : `/${locale}`
        return {
          redirect: { destination: `${prefix}/docs/${first}`, permanent: false }
        }
      }
      return { notFound: true }
    }

    const docRes = await fetch(`${baseUrl}/api/docs/${slugPath}?lang=${locale}`)
    if (docRes.status === 404) return { notFound: true }
    const docData = await docRes.json()

    const settingsJson = settingsRes && settingsRes.ok ? await settingsRes.json() : { data: {} }
    const settings = settingsJson?.data || {}

    // 主题：用户已在 Cookie 保存的选择优先；否则用后台配置的「前台默认主题」
    const initialTheme =
      cookieTheme || (settings.docs_default_theme === 'light' ? 'light' : 'dark')

    return {
      props: {
        doc: docData.data,
        tree,
        slugPath,
        settings: {
          site_name: settings.site_name || settings.siteName || '',
          site_logo: settings.site_logo || settings.logo_url || settings.logoUrl || '',
          site_favicon: settings.site_favicon || settings.favicon_url || settings.faviconUrl || settings.icon_url || settings.favicon || '',
          copyright: settings.copyright || '',
          icp: settings.icp || settings.icp_number || '',
          site_statement: settings.site_statement || '',
          site_description: settings.site_description || '',
          company_name: settings.company_name || ''
        },
        initialTheme
      }
    }
  } catch (error) {
    console.error('获取文档失败', error)
    return { notFound: true }
  }
}
