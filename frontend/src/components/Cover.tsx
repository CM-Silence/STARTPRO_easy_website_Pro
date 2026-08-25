import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useReducedMotion } from 'framer-motion'
import { useSettings } from '@/contexts/SettingsContext'
import { useTranslation } from 'react-i18next'
import { registerTransitionNavigator } from '@/lib/transitionNavigation'

const CURTAIN_EASE = 'cubic-bezier(0.76, 0, 0.24, 1)'
const SLIDE = 560
const TEXT_FADE = 160
const TEXT_DELAY = 330

/**
 * 白色幕布式转场（自包含、元素常驻缓存、WAAPI/合成器驱动）：
 * - 滑块是单个常驻 DOM 节点（挂在 _app，不随路由挂载/销毁），复用缓存避免卡顿。
 * - 首屏不播滑块动画，幕布初始即藏在屏外；仅后续真实导航时取出。
 * - 拦截页面内锚点点击：先让滑块从底部上划遮满全屏（这段动画独占、不含并加载任务）→
 *   遮满后才发起 router.push（加载新页，被幕布盖住，无跳变）→ 等页面加载完成 → 再连同文字上移漏出新页。
 * - 文字（湃联智能™+副标题）固定在滑块中央，到达中央时快速渐显，随幕布一起上移。
 * - 打开相同地址静默；后退/前进等非点击导航走回退路径（遮罩一致）。
 * - armed 在 800ms 后永久开启（避开启动期重定向）；开启「减弱动态效果」时不用幕布。
 */
export function Cover({ enabled }: { enabled: boolean }) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const { t } = useTranslation('common')
  const { settings } = useSettings()
  const curtainRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const armed = useRef(false)       // 首屏结束即永久开启，此后导航可用幕布
  const active = useRef(false)      // 是否正在处理一次「上划→加载→上移」
  const navGen = useRef(0)          // 导航代际，防止旧导航的延迟上移误触新导航
  const revealedGen = useRef(0)     // 已上移的代际，确保每次切换只播一次上移、绝不漏播
  const pushTimer = useRef<number | null>(null)
  const [mountedWithMotion, setMountedWithMotion] = useState(!reduceMotion)

  useEffect(() => {
    setMountedWithMotion(!reduceMotion)
  }, [reduceMotion])

  // 命令式 WAAPI（合成器线程），无 React 中途渲染
  const runEnter = () => {
    const c = curtainRef.current
    const t = textRef.current
    if (!c) return
    const clear = (el: HTMLElement) => el.getAnimations().forEach((a) => a.cancel())
    clear(c)
    if (t) clear(t)
    c.style.pointerEvents = 'auto'
    if (typeof c.animate === 'function') {
      c.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0%)' }], {
        duration: SLIDE,
        easing: CURTAIN_EASE,
        fill: 'forwards'
      })
      t?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: TEXT_FADE,
        easing: 'ease-out',
        fill: 'forwards',
        delay: TEXT_DELAY
      })
    } else {
      c.style.transform = 'translateY(0%)'
    }
  }

  const runExit = () => {
    const c = curtainRef.current
    if (!c) return
    if (typeof c.animate === 'function') {
      c.getAnimations().forEach((a) => a.cancel())
      c.animate([{ transform: 'translateY(0%)' }, { transform: 'translateY(-100%)' }], {
        duration: SLIDE,
        easing: CURTAIN_EASE,
        fill: 'forwards'
      })
    } else {
      c.style.transform = 'translateY(-100%)'
    }
    c.style.pointerEvents = 'none'
  }

  // 开启一次切换：标记当时代际并盖上幕布
  const beginTransition = () => {
    navGen.current += 1
    runEnter()
  }

  // 上移（带代际 + 只播一次守卫，确保每次切换都真正显现上移动画、不跳变不漏播）
  const revealOnce = (gen: number) => {
    if (navGen.current !== gen) return // 已不是最新导航，跳过旧上移
    if (revealedGen.current === gen) return // 本次已上移过，避免重复
    revealedGen.current = gen
    runExit()
  }

  // 新页就绪后上移：图片解码最多等 0.6s + 保证画一帧；另设兜底超时，永不卡住/漏播
  const settleAndReveal = (gen: number) => {
    const images = Array.from(document.images)
    const imageWait = images.length
      ? Promise.race([
          Promise.all(
            images.map((img) =>
              img.complete ? Promise.resolve() : img.decode ? img.decode().catch(() => {}) : Promise.resolve()
            )
          ),
          new Promise<void>((r) => window.setTimeout(r, 600))
        ]).then(() => {})
      : Promise.resolve()
    imageWait.then(() => {
      requestAnimationFrame(() => revealOnce(gen))
    })
    window.setTimeout(() => revealOnce(gen), 2200) // 兜底：即便资源异常也必上移
  }

  // 首屏：不播动画，幕布藏在屏外；约 800ms 后永久启用幕布（避开启动期重定向）
  useEffect(() => {
    if (!enabled || reduceMotion) return
    const c = curtainRef.current
    if (c) {
      c.getAnimations().forEach((a) => a.cancel())
      c.style.transform = 'translateY(-100%)'
    }
    const t = window.setTimeout(() => {
      armed.current = true
    }, 800)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reduceMotion])

  const samePath = (url: string) => {
    const norm = (s: string) => String(s || '').split('?')[0].split('#')[0]
    return norm(url) === norm(typeof window !== 'undefined' ? window.location.pathname : '')
  }

  // 拦截页面内导航：先上划盖满，再 push，加载完再上移
  useEffect(() => {
    if (!enabled || !router?.events) return

    const fireNav = (href: string) => {
      if (!armed.current || active.current) return
      if (samePath(href)) return // 相同地址静默
      active.current = true
      beginTransition()
      // 等滑块完全盖满后再发路由加载，避免与动画争抢主线程/合成器
      pushTimer.current = window.setTimeout(() => {
        router.push(href).catch(() => {})
      }, SLIDE + 40)
    }

    // 供程序化导航（如语言切换器）复用同一套「先盖幕布→再导航」：就绪则接管并返回 true，否则返回 false 由调用方直接跳转
    const unregisterNav = registerTransitionNavigator((href: string): boolean => {
      if (!armed.current || active.current) return false
      if (samePath(href)) return true
      fireNav(href)
      return true
    })

    const onDocClick = (e: MouseEvent) => {
      if (!armed.current || active.current) return // 首屏期间或已有切换进行中，走默认行为
      const el = (e.target as HTMLElement)?.closest?.('a[href]')
      if (!el) return
      const href = el.getAttribute('href') || ''
      if (!href || href.startsWith('#')) return
      if (el.getAttribute('target') === '_blank' || el.hasAttribute('download')) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return
      const isInternal = href.startsWith('/') || href.startsWith(`${window.location.origin}/`)
      if (!isInternal) return
      // 后台/登录不拦截
      if (href.startsWith('/admin') || href.startsWith('/login')) return
      e.preventDefault()
      fireNav(href)
    }

    // 回退路径：后退/前进/程序化导航（未被点击拦截的）
    const onStart = (url: string) => {
      if (!enabled) return
      if (active.current) return // 本次 push 已盖幕布
      if (!armed.current || samePath(url)) return
      active.current = true
      beginTransition()
    }
    const onDone = () => {
      if (!active.current) return
      active.current = false
      const gen = navGen.current
      window.setTimeout(() => settleAndReveal(gen), 150)
    }

    document.addEventListener('click', onDocClick, true)
    router.events.on('routeChangeStart', onStart)
    router.events.on('routeChangeComplete', onDone)
    router.events.on('routeChangeError', onDone)
    return () => {
      document.removeEventListener('click', onDocClick, true)
      router.events.off('routeChangeStart', onStart)
      router.events.off('routeChangeComplete', onDone)
      router.events.off('routeChangeError', onDone)
      if (pushTimer.current) window.clearTimeout(pushTimer.current)
      unregisterNav()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, router, reduceMotion])

  const brand = useMemo(
    () =>
      (((settings as any)?.transition_main_title as string) ||
        (settings?.site_name as string) ||
        t('transition.brand')).replace(/™$/, '') + '™',
    [settings?.site_name, (settings as any)?.transition_main_title, t]
  )
  const tagline = (settings as any)?.transition_subtitle || t('transition.tagline')
  const accent = 'rgba(var(--color-accent-rgb, 0, 212, 255), 1)'
  const primary = 'rgba(var(--color-primary-rgb, 59, 130, 246), 1)'

  if (!enabled || !mountedWithMotion) return null

  return (
    <div
      ref={curtainRef}
      className="fixed inset-0 z-[10000] overflow-hidden will-change-transform"
      style={{ backgroundColor: '#ffffff', transform: 'translateY(-100%)', pointerEvents: 'none' }}
    >
      {/* 主题色渐变花纹（柔光 + 细网格） */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            `radial-gradient(circle at 14% 22%, rgba(var(--color-accent-rgb, 0,212,255), 0.16) 0%, transparent 44%)`,
            `radial-gradient(circle at 86% 18%, rgba(var(--color-primary-rgb, 59,130,246), 0.15) 0%, transparent 46%)`,
            `radial-gradient(circle at 55% 96%, rgba(var(--color-accent-rgb, 0,212,255), 0.11) 0%, transparent 50%)`,
            'linear-gradient(115deg, #ffffff 55%, #f4f7ff 100%)'
          ].join(', ')
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: [
            `linear-gradient(${primary} 1px, transparent 1px)`,
            `linear-gradient(90deg, ${primary} 1px, transparent 1px)`
          ].join(', '),
          backgroundSize: '46px 46px'
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[3px] pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {/* 品牌大字 + 副标题：固定在滑块中央，初始不可见；到达中央时快速渐显，随后随幕布一起上移 */}
      <div
        ref={textRef}
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6"
        style={{ opacity: 0, transform: 'translateZ(0)' }}
      >
        <div
          className="text-4xl md:text-6xl font-bold tracking-[0.18em] whitespace-nowrap"
          style={{ color: 'var(--color-text-primary, #0f172a)' }}
        >
          {brand}
        </div>
        <div
          className="text-xl md:text-2xl tracking-[0.24em] font-light"
          style={{ color: 'var(--color-text-secondary, #64748b)' }}
        >
          {tagline}
        </div>
      </div>
    </div>
  )
}

export default Cover