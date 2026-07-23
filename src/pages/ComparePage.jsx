import React, { useState, useRef, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, GitCompare, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react'
import { useTranslations } from '@/hooks/useLocale.jsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export default function ComparePage() {
  const t = useTranslations()
  const [file1, setFile1] = useState(null)
  const [file2, setFile2] = useState(null)
  const [pdf1, setPdf1] = useState(null)
  const [pdf2, setPdf2] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [comparing, setComparing] = useState(false)
  const [diffResults, setDiffResults] = useState(null)
  const [pageDiffs, setPageDiffs] = useState({})
  const [diffStats, setDiffStats] = useState(null)

  const canvasRef1 = useRef(null)
  const canvasRef2 = useRef(null)
  const diffCanvasRef = useRef(null)

  const handleFileSelect = async (e, fileNum) => {
    const file = e.target.files[0]
    if (!file) return

    if (fileNum === 1) {
      setFile1(file)
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setPdf1(pdf)
    } else {
      setFile2(file)
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      setPdf2(pdf)
    }
  }

  useEffect(() => {
    if (pdf1 && pdf2) {
      const minPages = Math.min(pdf1.numPages, pdf2.numPages)
      setTotalPages(minPages)
      setCurrentPage(1)
      setPageDiffs({})
      setDiffResults(null)
      setDiffStats(null)
    }
  }, [pdf1, pdf2])

  const renderPage = async (pdf, canvasRef, pageNum) => {
    if (!pdf || !canvasRef.current) return

    const page = await pdf.getPage(pageNum)
    const scale = 1.5
    const viewport = page.getViewport({ scale })

    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise
  }

  useEffect(() => {
    if (pdf1 && pdf2 && currentPage > 0) {
      renderPage(pdf1, canvasRef1, currentPage)
      renderPage(pdf2, canvasRef2, currentPage)
    }
  }, [pdf1, pdf2, currentPage])

  const comparePages = async () => {
    if (!pdf1 || !pdf2) return

    setComparing(true)
    setDiffResults(null)

    try {
      const minPages = Math.min(pdf1.numPages, pdf2.numPages)
      const diffs = {}
      let totalDiffPixels = 0
      let totalPixels = 0

      for (let pageNum = 1; pageNum <= minPages; pageNum++) {
        const canvas1 = document.createElement('canvas')
        const canvas2 = document.createElement('canvas')

        const page1 = await pdf1.getPage(pageNum)
        const page2 = await pdf2.getPage(pageNum)

        const scale = 1.0
        const viewport1 = page1.getViewport({ scale })
        const viewport2 = page2.getViewport({ scale })

        canvas1.width = viewport1.width
        canvas1.height = viewport1.height
        canvas2.width = viewport2.width
        canvas2.height = viewport2.height

        const ctx1 = canvas1.getContext('2d')
        const ctx2 = canvas2.getContext('2d')

        await page1.render({ canvasContext: ctx1, viewport: viewport1 }).promise
        await page2.render({ canvasContext: ctx2, viewport: viewport2 }).promise

        const diffResult = pixelDiff(canvas1, canvas2)
        diffs[pageNum] = diffResult
        totalDiffPixels += diffResult.diffPixels
        totalPixels += diffResult.totalPixels
      }

      setPageDiffs(diffs)
      setDiffStats({
        totalPages: minPages,
        totalPagesDiff: Math.max(pdf1.numPages, pdf2.numPages),
        diffPages: Object.values(diffs).filter(d => d.diffPercent > 0).length,
        totalDiffPixels,
        totalPixels,
        overallDiffPercent: totalPixels > 0 ? ((totalDiffPixels / totalPixels) * 100).toFixed(2) : 0,
      })

      renderDiffOverlay(currentPage, diffs[currentPage])
      setDiffResults(diffs[currentPage])
    } catch (err) {
      console.error('Compare error:', err)
    }

    setComparing(false)
  }

  const pixelDiff = (canvas1, canvas2) => {
    const ctx1 = canvas1.getContext('2d')
    const ctx2 = canvas2.getContext('2d')

    const width = Math.min(canvas1.width, canvas2.width)
    const height = Math.min(canvas1.height, canvas2.height)

    const data1 = ctx1.getImageData(0, 0, width, height).data
    const data2 = ctx2.getImageData(0, 0, width, height).data

    let diffPixels = 0
    const diffData = new Uint8ClampedArray(width * height * 4)

    for (let i = 0; i < data1.length; i += 4) {
      const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2]
      const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2]

      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)

      if (diff > 30) {
        diffPixels++
        diffData[i] = 255
        diffData[i + 1] = 0
        diffData[i + 2] = 0
        diffData[i + 3] = 180
      } else {
        diffData[i] = 0
        diffData[i + 1] = 0
        diffData[i + 2] = 0
        diffData[i + 3] = 0
      }
    }

    return {
      diffPixels,
      totalPixels: width * height,
      diffPercent: ((diffPixels / (width * height)) * 100).toFixed(2),
      diffData,
      width,
      height,
    }
  }

  const renderDiffOverlay = (pageNum, diffResult) => {
    if (!diffResult || !diffCanvasRef.current) return

    const canvas = diffCanvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = diffResult.width
    canvas.height = diffResult.height

    const imageData = new ImageData(diffResult.diffData, diffResult.width, diffResult.height)
    ctx.putImageData(imageData, 0, 0)
  }

  useEffect(() => {
    if (pageDiffs[currentPage]) {
      renderDiffOverlay(currentPage, pageDiffs[currentPage])
      setDiffResults(pageDiffs[currentPage])
    }
  }, [currentPage, pageDiffs])

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const reset = () => {
    setFile1(null)
    setFile2(null)
    setPdf1(null)
    setPdf2(null)
    setCurrentPage(1)
    setTotalPages(0)
    setDiffResults(null)
    setPageDiffs({})
    setDiffStats(null)
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t.common.compare}</h1>
        <p className="text-muted-foreground mt-1">{t.compare?.desc || '对比两个 PDF 文件，高亮显示差异'}</p>
      </div>

      {/* 文件选择区域 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className={file1 ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t.compare?.file1 || '文件 1'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {file1 ? (
              <div className="flex items-center justify-between">
                <span className="text-sm truncate">{file1.name}</span>
                <Button variant="ghost" size="sm" onClick={reset}>
                  {t.common.change || '更换'}
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">{t.common.selectFile || '选择文件'}</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 1)}
                />
              </label>
            )}
          </CardContent>
        </Card>

        <Card className={file2 ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t.compare?.file2 || '文件 2'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {file2 ? (
              <div className="flex items-center justify-between">
                <span className="text-sm truncate">{file2.name}</span>
                <Button variant="ghost" size="sm" onClick={reset}>
                  {t.common.change || '更换'}
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">{t.common.selectFile || '选择文件'}</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 2)}
                />
              </label>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 对比按钮 */}
      {pdf1 && pdf2 && (
        <div className="flex justify-center mb-6">
          <Button onClick={comparePages} disabled={comparing} size="lg" className="gap-2">
            <GitCompare className="h-5 w-5" />
            {comparing ? (t.compare?.comparing || '对比中...') : (t.compare?.startCompare || '开始对比')}
          </Button>
        </div>
      )}

      {/* 差异统计 */}
      {diffStats && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.compare?.diffStats || '差异统计'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{diffStats.totalPagesDiff}</div>
                <div className="text-xs text-muted-foreground">{t.compare?.totalPages || '总页数'}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-500">{diffStats.diffPages}</div>
                <div className="text-xs text-muted-foreground">{t.compare?.diffPages || '差异页数'}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{diffStats.overallDiffPercent}%</div>
                <div className="text-xs text-muted-foreground">{t.compare?.overallDiff || '总体差异'}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">{diffStats.totalPagesDiff - diffStats.diffPages}</div>
                <div className="text-xs text-muted-foreground">{t.compare?.samePages || '相同页数'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 对比结果 */}
      {pdf1 && pdf2 && totalPages > 0 && (
        <div>
          {/* 页面导航 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {t.common.page || '第'} {currentPage} / {totalPages} {t.common.pageSuffix || '页'}
              </span>
              <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {diffResults && (
              <div className="flex items-center gap-2 text-sm">
                {parseFloat(diffResults.diffPercent) > 0 ? (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">
                      {t.compare?.diffPercent || '差异'}: {diffResults.diffPercent}%
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">{t.compare?.identical || '页面相同'}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* PDF 预览 */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.compare?.file1 || '文件 1'}</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="overflow-auto max-h-[500px] bg-muted/30 rounded-lg">
                  <canvas ref={canvasRef1} className="w-full" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.compare?.file2 || '文件 2'}</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="relative overflow-auto max-h-[500px] bg-muted/30 rounded-lg">
                  <canvas ref={canvasRef2} className="w-full" />
                  <canvas ref={diffCanvasRef} className="absolute top-0 left-0 w-full pointer-events-none" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 页面差异列表 */}
          {Object.keys(pageDiffs).length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t.compare?.pageList || '页面列表'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-10 gap-1">
                  {Object.entries(pageDiffs).map(([pageNum, diff]) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(parseInt(pageNum))}
                      className={`p-2 text-xs rounded ${
                        parseInt(pageNum) === currentPage
                          ? 'bg-primary text-primary-foreground'
                          : parseFloat(diff.diffPercent) > 0
                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}