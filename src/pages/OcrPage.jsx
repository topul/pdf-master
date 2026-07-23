import React, { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import Tesseract from 'tesseract.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Scan, Copy, Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useTranslations } from '@/hooks/useLocale.jsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

export default function OcrPage() {
  const t = useTranslations()
  const [file, setFile] = useState(null)
  const [pdf, setPdf] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [recognizing, setRecognizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [recognizedText, setRecognizedText] = useState('')
  const [pageTexts, setPageTexts] = useState({})
  const [language, setLanguage] = useState('chi_sim+eng')
  const [currentCanvas, setCurrentCanvas] = useState(null)

  const canvasRef = useRef(null)

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const arrayBuffer = await selectedFile.arrayBuffer()
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    setPdf(pdfDoc)
    setTotalPages(pdfDoc.numPages)
    setCurrentPage(1)
    setPageTexts({})
    setRecognizedText('')
  }

  const renderPage = async (pageNum) => {
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

    setCurrentCanvas(canvas)
  }

  React.useEffect(() => {
    if (pdf && currentPage > 0) {
      renderPage(currentPage)
      if (pageTexts[currentPage]) {
        setRecognizedText(pageTexts[currentPage])
      } else {
        setRecognizedText('')
      }
    }
  }, [pdf, currentPage])

  const recognizeCurrentPage = async () => {
    if (!currentCanvas) return

    setRecognizing(true)
    setProgress(0)

    try {
      const result = await Tesseract.recognize(currentCanvas, language, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })

      const text = result.data.text
      setRecognizedText(text)
      setPageTexts((prev) => ({ ...prev, [currentPage]: text }))
    } catch (err) {
      console.error('OCR error:', err)
      setRecognizedText(t.ocr?.error || '识别失败，请重试')
    }

    setRecognizing(false)
    setProgress(0)
  }

  const recognizeAllPages = async () => {
    if (!pdf) return

    setRecognizing(true)
    const allTexts = {}

    for (let i = 1; i <= totalPages; i++) {
      setProgress(Math.round((i / totalPages) * 100))

      const canvas = document.createElement('canvas')
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 1.5 })

      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')

      await page.render({ canvasContext: ctx, viewport }).promise

      const result = await Tesseract.recognize(canvas, language, {
        logger: (m) => {},
      })

      allTexts[i] = result.data.text
    }

    setPageTexts(allTexts)
    setRecognizedText(allTexts[currentPage] || '')
    setRecognizing(false)
    setProgress(0)
  }

  const copyText = () => {
    if (recognizedText) {
      navigator.clipboard.writeText(recognizedText)
    }
  }

  const downloadText = () => {
    const allText = Object.entries(pageTexts)
      .sort(([a], [b]) => a - b)
      .map(([_, text]) => text)
      .join('\n\n--- Page Break ---\n\n')

    const blob = new Blob([allText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (file?.name?.replace('.pdf', '') || 'ocr') + '_text.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const reset = () => {
    setFile(null)
    setPdf(null)
    setCurrentPage(1)
    setTotalPages(0)
    setPageTexts({})
    setRecognizedText('')
    setCurrentCanvas(null)
  }

  const languages = [
    { value: 'chi_sim+eng', label: '中文 + 英文' },
    { value: 'chi_sim', label: '简体中文' },
    { value: 'chi_tra', label: '繁体中文' },
    { value: 'eng', label: 'English' },
    { value: 'jpn', label: '日本語' },
    { value: 'kor', label: '한국어' },
  ]

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t.ocr?.title || 'OCR 文字识别'}</h1>
        <p className="text-muted-foreground mt-1">{t.ocr?.desc || '识别扫描版 PDF 中的文字'}</p>
      </div>

      {/* 文件选择 */}
      {!file ? (
        <Card className="mb-6">
          <CardContent className="py-8">
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{t.common.selectFile || '选择 PDF 文件'}</span>
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            </label>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 文件信息 */}
          <Card className="mb-4">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium truncate">{file.name}</span>
                <span className="text-sm text-muted-foreground">({totalPages} {t.common.pages || '页'})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                {t.common.change || '更换'}
              </Button>
            </CardContent>
          </Card>

          {/* 语言选择 */}
          <Card className="mb-4">
            <CardContent className="py-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">{t.ocr?.language || '识别语言'}:</span>
                <div className="flex gap-2 flex-wrap">
                  {languages.map((lang) => (
                    <Button
                      key={lang.value}
                      variant={language === lang.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLanguage(lang.value)}
                    >
                      {lang.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex gap-2 mb-4">
            <Button onClick={recognizeCurrentPage} disabled={recognizing} className="gap-2">
              {recognizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scan className="h-4 w-4" />}
              {recognizing ? `${t.ocr?.recognizing || '识别中'}... ${progress}%` : (t.ocr?.recognizeCurrent || '识别当前页')}
            </Button>
            <Button onClick={recognizeAllPages} disabled={recognizing} variant="outline" className="gap-2">
              {t.ocr?.recognizeAll || '识别全部'}
            </Button>
            {Object.keys(pageTexts).length > 0 && (
              <>
                <Button onClick={copyText} variant="outline" size="sm" className="gap-2">
                  <Copy className="h-4 w-4" />
                  {t.ocr?.copy || '复制'}
                </Button>
                <Button onClick={downloadText} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  {t.ocr?.download || '下载'}
                </Button>
              </>
            )}
          </div>

          {/* 页面导航 */}
          <div className="flex items-center gap-2 mb-4">
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

          {/* 识别区域 */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t.ocr?.preview || '页面预览'}</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="overflow-auto max-h-[500px] bg-muted/30 rounded-lg">
                  <canvas ref={canvasRef} className="w-full" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{t.ocr?.result || '识别结果'}</span>
                  {pageTexts[currentPage] && (
                    <span className="text-xs text-green-500">✓ {t.ocr?.recognized || '已识别'}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="h-[500px] overflow-auto bg-muted/30 rounded-lg p-3">
                  {recognizing ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                        <p className="text-sm text-muted-foreground">
                          {t.ocr?.recognizing || '识别中'}... {progress}%
                        </p>
                      </div>
                    </div>
                  ) : recognizedText ? (
                    <pre className="whitespace-pre-wrap text-sm font-sans">{recognizedText}</pre>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p className="text-sm">{t.ocr?.clickRecognize || '点击"识别当前页"开始识别'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 页面识别状态 */}
          {Object.keys(pageTexts).length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t.ocr?.pageStatus || '页面识别状态'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`p-2 text-xs rounded ${
                        pageNum === currentPage
                          ? 'bg-primary text-primary-foreground'
                          : pageTexts[pageNum]
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}