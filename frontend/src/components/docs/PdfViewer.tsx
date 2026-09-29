import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Loader2 } from 'lucide-react'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useTranslation } from 'react-i18next'

// 自托管 pdf.js worker（位于 /public/pdf/），不依赖外部 CDN
GlobalWorkerOptions.workerSrc = '/pdf/pdf.worker.min.mjs'

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const SCALE_STEP = 0.1
// 默认 100%，便于直接看到原大小；细粒度步长保证能精确定位到 100%
const DEFAULT_SCALE = 1

interface PdfViewerProps {
  /** PDF 文件地址（如 /uploads/files/xxx.pdf） */
  src: string
  /** 下载时使用的文件名（可省略，默认从地址取） */
  fileName?: string
}

const PdfViewer: React.FC<PdfViewerProps> = ({ src, fileName }) => {
  const { t } = useTranslation('common')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)

  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewerWidth, setViewerWidth] = useState(0)

  const downloadName = useCallback(() => {
    if (fileName) return fileName
    const base = src.split('/').pop() || 'document.pdf'
    try {
      return decodeURIComponent(base)
    } catch {
      return base
    }
  }, [fileName, src])

  // 加载 PDF 文档
  useEffect(() => {
    if (!src) {
      setError(t('docs.pdf.noFile', '未找到 PDF 文件'))
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setDoc(null)
    setPageNum(1)
    getDocument({ url: src })
      .promise.then((pdf) => {
        if (cancelled) return
        setDoc(pdf)
        setNumPages(pdf.numPages)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('PDF 加载失败', err)
        setError(t('docs.pdf.loadFailed', 'PDF 加载失败'))
        setLoading(false)
      })
    return () => {
      cancelled = true
      if (renderTaskRef.current) renderTaskRef.current.cancel()
    }
  }, [src, t])

  // 监听容器宽度（fit-width 显示基准）
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setViewerWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 渲染当前页
  useEffect(() => {
    if (!doc || !canvasRef.current || viewerWidth <= 0) return
    let cancelled = false
    if (renderTaskRef.current) renderTaskRef.current.cancel()
    setRendering(true)

    const renderPage = async () => {
      try {
        const page = await doc.getPage(pageNum)
        const baseViewport = page.getViewport({ scale: 1 })
        // 先按容器宽度 fit，再叠加用户缩放比例
        const fitScale = viewerWidth / baseViewport.width
        const viewport = page.getViewport({ scale: fitScale * scale })
        const canvas = canvasRef.current
        if (!canvas) return
        const dpr = window.devicePixelRatio || 1
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.beginPath()
        ctx.rect(0, 0, viewport.width, viewport.height)
        ctx.fillStyle = '#fff'
        ctx.fill()
        const task = page.render({ canvas: null, canvasContext: ctx, viewport })
        renderTaskRef.current = task
        await task.promise
        if (!cancelled) setRendering(false)
      } catch (err) {
        if (!cancelled && (err as any)?.name !== 'RenderingCancelledException') {
          console.error('PDF 渲染失败', err)
          setError(t('docs.pdf.renderFailed', 'PDF 渲染失败'))
        }
        if (!cancelled) setRendering(false)
      }
    }

    renderPage()
    return () => {
      cancelled = true
    }
  }, [doc, pageNum, scale, viewerWidth, t])

  const prev = () => setPageNum((p) => Math.max(1, p - 1))
  const next = () => setPageNum((p) => Math.min(numPages, p + 1))
  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))

  if (error) {
    return (
      <div className="pdf-viewer pdf-viewer--error">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="pdf-viewer" ref={containerRef}>
      <div className="pdf-viewer__toolbar">
        <div className="pdf-viewer__nav">
          <button
            type="button"
            className="pdf-viewer__btn"
            onClick={prev}
            disabled={!doc || pageNum <= 1}
            aria-label={t('docs.pdf.prev', '上一页')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            className="pdf-viewer__page-input"
            type="number"
            min={1}
            max={numPages || 1}
            value={pageNum}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (v >= 1 && v <= (numPages || 1)) setPageNum(v)
            }}
            aria-label={t('docs.pdf.pageInput', '页码')}
          />
          <span className="pdf-viewer__page-total">/ {numPages}</span>
          <button
            type="button"
            className="pdf-viewer__btn"
            onClick={next}
            disabled={!doc || pageNum >= numPages}
            aria-label={t('docs.pdf.next', '下一页')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="pdf-viewer__zoom">
          <button
            type="button"
            className="pdf-viewer__btn"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            aria-label={t('docs.pdf.zoomOut', '缩小')}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="pdf-viewer__zoom-value">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="pdf-viewer__btn"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            aria-label={t('docs.pdf.zoomIn', '放大')}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        <a
          className="pdf-viewer__btn pdf-viewer__download"
          href={src}
          download={downloadName()}
          aria-label={t('docs.pdf.download', '下载 PDF')}
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
      <div className="pdf-viewer__stage">
        {loading ? (
          <div className="pdf-viewer__hint">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>{t('docs.pdf.loading', '正在加载 PDF…')}</span>
          </div>
        ) : !doc ? (
          <div className="pdf-viewer__hint">{t('docs.pdf.noFile', '未找到 PDF 文件')}</div>
        ) : (
          <>
            {rendering && (
              <div className="pdf-viewer__loading">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            <canvas ref={canvasRef} className="pdf-viewer__canvas" />
          </>
        )}
      </div>
    </div>
  )
}

export default PdfViewer