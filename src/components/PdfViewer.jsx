import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Search,
  X,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  FileText,
  Loader2,
  Minus,
  Plus,
  AlignJustify,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

let pdfjsLib = null
let workerLoaded = false

async function loadPdfJs() {
  if (pdfjsLib && workerLoaded) return pdfjsLib
  pdfjsLib = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default
  workerLoaded = true
  return pdfjsLib
}

function PdfViewer({ fileData, fileName = 'document.pdf' }) {
  const containerRef = useRef(null)
  const pagesContainerRef = useRef(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarTab, setSidebarTab] = useState('outline')
  const [outline, setOutline] = useState([])
  const [thumbnails, setThumbnails] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [currentSearchIdx, setCurrentSearchIdx] = useState(-1)
  const [searching, setSearching] = useState(false)
  const [fitMode, setFitMode] = useState('width')
  const [viewMode, setViewMode] = useState('scroll')
  const pageCanvasesRef = useRef([])
  const renderTasksRef = useRef([])
  const isScrollingRef = useRef(false)
  const pageSizeRef = useRef({ width: 0, height: 0 })

  const loadPdf = useCallback(async () => {
    if (!fileData) return
    setLoading(true)
    try {
      const pdfjs = await loadPdfJs()
      const uint8Array = new Uint8Array(fileData)
      const loadingTask = pdfjs.getDocument({ data: uint8Array })
      const pdf = await loadingTask.promise
      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(1)
      setLoading(false)

      try {
        const outlineData = await pdf.getOutline()
        if (outlineData) {
          setOutline(outlineData)
        }
      } catch {
        setOutline([])
      }

      try {
        const firstPage = await pdf.getPage(1)
        const viewport = firstPage.getViewport({ scale: 1 })
        pageSizeRef.current = { width: viewport.width, height: viewport.height }
      } catch {
        // ignore
      }
    } catch (error) {
      console.error('Failed to load PDF:', error)
      setLoading(false)
    }
  }, [fileData])

  useEffect(() => {
    loadPdf()
  }, [loadPdf])

  const renderSinglePage = useCallback(async (pageNum, canvas) => {
    if (!pdfDoc || !canvas) return
    if (renderTasksRef.current[pageNum]) {
      try {
        renderTasksRef.current[pageNum].cancel()
      } catch {}
      renderTasksRef.current[pageNum] = null
    }
    try {
      const page = await pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale })
      const context = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1

      canvas.width = viewport.width * dpr
      canvas.height = viewport.height * dpr
      canvas.style.width = viewport.width + 'px'
      canvas.style.height = viewport.height + 'px'
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      const renderTask = page.render({
        canvasContext: context,
        viewport,
      })
      renderTasksRef.current[pageNum] = renderTask
      await renderTask.promise
    } catch (error) {
      if (error.name !== 'RenderingCancelledException') {
        console.error(`Failed to render page ${pageNum}:`, error)
      }
    }
  }, [pdfDoc, scale])

  const renderVisiblePages = useCallback(() => {
    if (!pdfDoc || !pagesContainerRef.current || viewMode !== 'scroll') return
    const container = pagesContainerRef.current
    const containerTop = container.scrollTop
    const containerBottom = containerTop + container.clientHeight

    for (let i = 1; i <= totalPages; i++) {
      const pageEl = document.getElementById(`pdf-page-${i}`)
      if (!pageEl) continue
      const pageTop = pageEl.offsetTop
      const pageBottom = pageTop + pageEl.offsetHeight

      if (pageBottom >= containerTop - 500 && pageTop <= containerBottom + 500) {
        const canvas = pageEl.querySelector('canvas')
        if (canvas && !canvas.dataset.rendered) {
          canvas.dataset.rendered = 'true'
          renderSinglePage(i, canvas)
        }
      }
    }
  }, [pdfDoc, totalPages, viewMode, renderSinglePage])

  useEffect(() => {
    if (pdfDoc && viewMode === 'scroll' && !loading) {
      const timer = setTimeout(() => {
        renderVisiblePages()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [pdfDoc, viewMode, loading, renderVisiblePages, scale])

  const handleScroll = useCallback(() => {
    if (isScrollingRef.current) return
    isScrollingRef.current = true
    requestAnimationFrame(() => {
      renderVisiblePages()
      updateCurrentPageFromScroll()
      isScrollingRef.current = false
    })
  }, [renderVisiblePages])

  const updateCurrentPageFromScroll = useCallback(() => {
    if (!pagesContainerRef.current || viewMode !== 'scroll') return
    const container = pagesContainerRef.current
    const scrollTop = container.scrollTop + container.clientHeight / 3

    let newPage = 1
    for (let i = 1; i <= totalPages; i++) {
      const pageEl = document.getElementById(`pdf-page-${i}`)
      if (pageEl && pageEl.offsetTop <= scrollTop) {
        newPage = i
      }
    }
    if (newPage !== currentPage) {
      setCurrentPage(newPage)
    }
  }, [totalPages, viewMode, currentPage])

  const goToPage = useCallback((page) => {
    const p = Math.max(1, Math.min(totalPages, page))
    setCurrentPage(p)

    if (viewMode === 'scroll' && pagesContainerRef.current) {
      const pageEl = document.getElementById(`pdf-page-${p}`)
      if (pageEl) {
        pagesContainerRef.current.scrollTo({
          top: pageEl.offsetTop - 20,
          behavior: 'smooth',
        })
      }
    }
  }, [totalPages, viewMode])

  const handlePrevPage = () => goToPage(currentPage - 1)
  const handleNextPage = () => goToPage(currentPage + 1)

  const handleZoomIn = () => {
    setFitMode(null)
    setScale((s) => Math.min(5, s + 0.25))
  }

  const handleZoomOut = () => {
    setFitMode(null)
    setScale((s) => Math.max(0.25, s - 0.25))
  }

  const fitWidth = useCallback(() => {
    if (!pagesContainerRef.current && viewMode === 'single') return
    const container = pagesContainerRef.current || containerRef.current
    if (!container) return
    const containerWidth = container.clientWidth - 40
    if (!pdfDoc) return
    pdfDoc.getPage(1).then((page) => {
      const viewport = page.getViewport({ scale: 1 })
      const newScale = containerWidth / viewport.width
      setScale(newScale)
      setFitMode('width')
    })
  }, [pdfDoc, viewMode])

  const fitPage = useCallback(() => {
    if (!pagesContainerRef.current && viewMode === 'single') return
    const container = pagesContainerRef.current || containerRef.current
    if (!container || !pdfDoc) return
    pdfDoc.getPage(1).then((page) => {
      const viewport = page.getViewport({ scale: 1 })
      const containerWidth = container.clientWidth - 40
      const containerHeight = container.clientHeight - 40
      const scaleX = containerWidth / viewport.width
      const scaleY = containerHeight / viewport.height
      const newScale = Math.min(scaleX, scaleY)
      setScale(newScale)
      setFitMode('page')
    })
  }, [pdfDoc, viewMode])

  useEffect(() => {
    if (pdfDoc && !loading && fitMode === 'width') {
      const timer = setTimeout(fitWidth, 100)
      return () => clearTimeout(timer)
    }
  }, [pdfDoc, loading, fitMode, fitWidth, totalPages, viewMode])

  useEffect(() => {
    const handleResize = () => {
      if (fitMode === 'width') {
        fitWidth()
      } else if (fitMode === 'page') {
        fitPage()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [fitMode, fitWidth, fitPage])

  const searchText = useCallback(async () => {
    if (!pdfDoc || !searchQuery.trim()) return
    setSearching(true)
    setSearchResults([])
    setCurrentSearchIdx(-1)

    const results = []
    const query = searchQuery.toLowerCase()

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      try {
        const page = await pdfDoc.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item) => item.str)
          .join(' ')
          .toLowerCase()

        let idx = 0
        while ((idx = pageText.indexOf(query, idx)) !== -1) {
          results.push({ page: i, index: idx })
          idx += query.length
        }
      } catch {
        // skip page
      }
    }

    setSearchResults(results)
    if (results.length > 0) {
      setCurrentSearchIdx(0)
      goToPage(results[0].page)
    }
    setSearching(false)
  }, [pdfDoc, searchQuery, goToPage])

  const goToNextSearch = () => {
    if (searchResults.length === 0) return
    const next = (currentSearchIdx + 1) % searchResults.length
    setCurrentSearchIdx(next)
    goToPage(searchResults[next].page)
  }

  const goToPrevSearch = () => {
    if (searchResults.length === 0) return
    const prev = (currentSearchIdx - 1 + searchResults.length) % searchResults.length
    setCurrentSearchIdx(prev)
    goToPage(searchResults[prev].page)
  }

  const navigateToDest = async (dest) => {
    if (!pdfDoc) return
    try {
      let pageIndex
      let destObj = dest

      if (typeof dest === 'string') {
        const explicitDest = await pdfDoc.getDestination(dest)
        if (explicitDest) {
          destObj = explicitDest
        }
      }

      if (Array.isArray(destObj)) {
        if (typeof destObj[0] === 'number') {
          pageIndex = destObj[0]
        } else if (destObj[0] && typeof destObj[0].pageIndex === 'number') {
          pageIndex = destObj[0].pageIndex
        }
      }

      if (pageIndex != null) {
        const pageNum = pageIndex + 1
        goToPage(pageNum)
      }
    } catch (e) {
      console.error('Navigate to dest error:', e)
    }
  }

  const renderOutlineItem = (item, depth = 0) => {
    return (
      <div key={item.title || Math.random()}>
        <button
          className="w-full truncate rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => navigateToDest(item.dest)}
          title={item.title}
        >
          {item.title}
        </button>
        {item.items && item.items.length > 0 && (
          <div>{item.items.map((child) => renderOutlineItem(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  const loadThumbnails = useCallback(async () => {
    if (!pdfDoc || thumbnails.length > 0) return
    const thumbs = []
    for (let i = 1; i <= Math.min(pdfDoc.numPages, 20); i++) {
      try {
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale: 0.2 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: context, viewport }).promise
        thumbs.push({ page: i, url: canvas.toDataURL() })
      } catch {
        // skip
      }
    }
    setThumbnails(thumbs)
  }, [pdfDoc, thumbnails.length])

  useEffect(() => {
    if (sidebarTab === 'thumbnails' && pdfDoc) {
      loadThumbnails()
    }
  }, [sidebarTab, pdfDoc, loadThumbnails])

  const toggleViewMode = () => {
    const newMode = viewMode === 'scroll' ? 'single' : 'scroll'
    setViewMode(newMode)
    pageCanvasesRef.current = []
    renderTasksRef.current = []
  }

  useEffect(() => {
    if (viewMode === 'scroll' && pdfDoc && !loading) {
      renderTasksRef.current.forEach((task, idx) => {
        if (task && idx > 0) {
          try {
            task.cancel()
          } catch {}
        }
      })
      renderTasksRef.current = []
      const canvases = document.querySelectorAll('[id^="pdf-page-"] canvas')
      canvases.forEach((canvas) => {
        delete canvas.dataset.rendered
      })
      setTimeout(() => {
        renderVisiblePages()
      }, 30)
    }
  }, [scale, viewMode, pdfDoc, loading, renderVisiblePages])

  useEffect(() => {
    const container = pagesContainerRef.current
    if (container && viewMode === 'scroll') {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [viewMode, handleScroll])

  useEffect(() => {
    if (viewMode === 'single' && pdfDoc && !loading) {
      if (renderTasksRef.current[0]) {
        try {
          renderTasksRef.current[0].cancel()
        } catch {}
      }
      const canvas = document.querySelector('.relative.shadow-lg canvas')
      if (canvas) {
        renderSinglePage(currentPage, canvas)
      }
    }
  }, [currentPage, scale, viewMode, pdfDoc, loading, renderSinglePage])

  return (
    <TooltipProvider>
      <div className="flex h-full w-full overflow-hidden">
        {sidebarOpen && (
          <div className="flex w-64 shrink-0 flex-col border-r bg-card">
            <div className="flex border-b">
              <button
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                  sidebarTab === 'outline' && 'bg-accent text-foreground',
                  sidebarTab !== 'outline' && 'text-muted-foreground hover:bg-accent/50'
                )}
                onClick={() => setSidebarTab('outline')}
              >
                <BookOpen className="mx-auto h-4 w-4" />
              </button>
              <button
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                  sidebarTab === 'thumbnails' && 'bg-accent text-foreground',
                  sidebarTab !== 'thumbnails' && 'text-muted-foreground hover:bg-accent/50'
                )}
                onClick={() => setSidebarTab('thumbnails')}
              >
                <FileText className="mx-auto h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {sidebarTab === 'outline' && (
                outline.length > 0 ? (
                  <div className="space-y-0.5">
                    {outline.map((item) => renderOutlineItem(item))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                    <BookOpen className="mb-2 h-6 w-6 opacity-30" />
                    无目录
                  </div>
                )
              )}
              {sidebarTab === 'thumbnails' && (
                <div className="space-y-2">
                  {thumbnails.map((t) => (
                    <button
                      key={t.page}
                      className={cn(
                        'block w-full overflow-hidden rounded border-2 p-1 transition-all',
                        currentPage === t.page
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent hover:border-muted-foreground/30'
                      )}
                      onClick={() => goToPage(t.page)}
                    >
                      <img src={t.url} alt={`Page ${t.page}`} className="w-full" />
                      <div className="mt-1 text-center text-[10px] text-muted-foreground">
                        {t.page}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 border-b bg-card px-3 py-2">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                  >
                    {sidebarOpen ? (
                      <PanelLeftClose className="h-4 w-4" />
                    ) : (
                      <PanelLeft className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{sidebarOpen ? '隐藏侧栏' : '显示侧栏'}</TooltipContent>
              </Tooltip>

              <div className="mx-2 h-5 w-px bg-border" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleViewMode}
                  >
                    {viewMode === 'scroll' ? (
                      <AlignJustify className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {viewMode === 'scroll' ? '单页模式' : '滚动模式'}
                </TooltipContent>
              </Tooltip>

              <div className="mx-1 h-5 w-px bg-border" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handlePrevPage}
                    disabled={currentPage <= 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>上一页</TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-1 text-sm">
                <Input
                  type="number"
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val)) goToPage(val)
                  }}
                  className="h-7 w-12 px-2 text-center"
                  min={1}
                  max={totalPages}
                />
                <span className="text-muted-foreground">/ {totalPages}</span>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages || loading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>下一页</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1">
              <div className="relative mr-2">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchText()}
                  className="h-7 w-40 pl-7 pr-16 text-xs"
                />
                {searchQuery && (
                  <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                    {searching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    {searchResults.length > 0 && (
                      <span className="px-1 text-[10px] text-muted-foreground">
                        {currentSearchIdx + 1}/{searchResults.length}
                      </span>
                    )}
                    {searchResults.length > 0 && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={goToPrevSearch}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={goToNextSearch}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setSearchQuery('')
                        setSearchResults([])
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomOut}
                    disabled={loading}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>缩小</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 min-w-[60px] text-xs"
                    onClick={() => (fitMode === 'width' ? fitPage() : fitWidth())}
                    disabled={loading}
                  >
                    {Math.round(scale * 100)}%
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {fitMode === 'width' ? '适合宽度' : fitMode === 'page' ? '适合页面' : '缩放比例'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomIn}
                    disabled={loading}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>放大</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div
            ref={containerRef}
            className="flex-1 overflow-auto bg-muted/30 p-5"
          >
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">加载中...</p>
              </div>
            ) : viewMode === 'scroll' ? (
              <div
                ref={pagesContainerRef}
                className="mx-auto flex flex-col items-center gap-4"
                style={{ maxWidth: '100%' }}
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <div
                    key={pageNum}
                    id={`pdf-page-${pageNum}`}
                    className="relative shadow-lg bg-white"
                  >
                    <canvas className="block" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="relative shadow-lg">
                  <canvas
                    ref={(canvas) => {
                      if (canvas && pdfDoc) {
                        canvas.dataset.rendered = 'true'
                        renderSinglePage(currentPage, canvas)
                      }
                    }}
                    className="bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default PdfViewer
