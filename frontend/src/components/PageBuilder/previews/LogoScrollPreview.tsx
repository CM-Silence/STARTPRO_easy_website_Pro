import React, { useEffect, useRef, useState } from 'react'
import { TemplateComponent } from '@/types/templates'
import { resolveLogoScrollHeight } from '@/lib/logoScroll'

export const LogoScrollPreview: React.FC<{ component: TemplateComponent }> = ({ component }) => {
  const {
    title = '合作伙伴',
    subtitle = '值得信赖的合作伙伴网络',
    logos = [],
    widthOption = 'full',
    backgroundColorOption = 'default',
    scrollSpeed
  } = component.props || {}

  const speedSetting = (scrollSpeed || component.props?.logoScrollSpeed || 'slow') as 'slow' | 'fast'

  const containerClass = `${widthOption === 'standard' ? 'max-w-screen-2xl mx-auto' : 'w-full'} ${
    backgroundColorOption === 'transparent' ? '' : 'bg-color-surface'
  }`

  const displayLogos = logos.length > 0
    ? logos
    : Array.from({ length: 8 }).map((_, idx) => ({ alt: `合作伙伴 ${idx + 1}`, image: '' }))

  const viewportRef = useRef<HTMLDivElement>(null)
  const sequenceRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ copies: 1, distance: 0 })
  const logoHeight = resolveLogoScrollHeight(component.props)

  useEffect(() => {
    const viewport = viewportRef.current
    const sequence = sequenceRef.current
    if (!viewport || !sequence) return

    const measure = () => {
      const sequenceWidth = sequence.getBoundingClientRect().width
      if (!sequenceWidth) return
      // Each half of the track must cover the viewport, even with a single logo.
      const copies = Math.max(1, Math.ceil(viewport.clientWidth / sequenceWidth))
      const distance = sequenceWidth * copies
      setLayout(previous => previous.copies === copies && previous.distance === distance
        ? previous
        : { copies, distance })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(sequence)
    return () => observer.disconnect()
  }, [displayLogos.length, logoHeight])

  // Keep a constant pixel speed as the number of logos (and track length) changes.
  const duration = layout.distance / (speedSetting === 'fast' ? 120 : 70)

  return (
    <div className={containerClass}>
      <div className={`p-8 rounded-lg shadow-sm w-full ${backgroundColorOption === 'transparent' ? '' : 'bg-color-surface'}`}>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2 text-text-primary">{title}</h2>
          {subtitle && <p className="text-lg text-text-secondary">{subtitle}</p>}
        </div>

        <div ref={viewportRef} className="logo-viewport relative overflow-hidden py-4 max-w-full">
          <div
            className="logo-track"
            style={{
              '--logo-height': `${logoHeight}px`,
              '--logo-width': `${Math.max(192, logoHeight * 1.8)}px`,
              animationDuration: `${duration || 1}s`,
              animationPlayState: layout.distance ? 'running' : 'paused'
            } as React.CSSProperties}
          >
            {Array(2)
              .fill(0)
              .map((_, groupIndex) => (
                <div key={groupIndex} className="logo-group" aria-hidden={groupIndex === 1 ? true : undefined}>
                  {Array.from({ length: layout.copies }, (_, copyIndex) => (
                    <div
                      key={copyIndex}
                      ref={groupIndex === 0 && copyIndex === 0 ? sequenceRef : undefined}
                      className="logo-sequence"
                      aria-hidden={copyIndex > 0 ? true : undefined}
                    >
                      {displayLogos.map((logo: any, index: number) => (
                        <div
                          key={`${groupIndex}-${index}`}
                          className="logo-item"
                        >
                          {logo.image ? (
                            <img
                              src={logo.image}
                              alt={logo.alt || `Logo ${index + 1}`}
                              className="logo-image"
                              onLoad={(e) => { e.currentTarget.style.visibility = 'visible' }}
                              onError={(e) => {
                                console.error('Logo image failed to load:', logo.image)
                                const target = e.target as HTMLImageElement
                                target.style.visibility = 'hidden'
                              }}
                            />
                          ) : (
                            <div className="text-text-tertiary flex items-center justify-center w-24">
                              <div className="text-2xl">🏢</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>

        <style jsx>{`
          .logo-track, .logo-group, .logo-sequence {
            display: flex;
            flex: 0 0 auto;
            width: max-content;
          }

          .logo-track {
            animation: logo-scroll linear infinite;
          }

          .logo-item {
            /* Reserve the image box before loading so intrinsic sizes cannot move the seam. */
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            width: var(--logo-width);
            height: var(--logo-height);
            margin: 0 32px;
          }

          .logo-image {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          @keyframes logo-scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }

          @media (max-width: 768px) {
            .logo-item {
              width: calc(var(--logo-width) * 0.75);
              margin-left: 1rem;
              margin-right: 1rem;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .logo-viewport { overflow-x: auto; }
            .logo-track { animation: none; }
            .logo-group[aria-hidden], .logo-sequence[aria-hidden] { display: none; }
          }
        `}</style>
      </div>
    </div>
  )
}
