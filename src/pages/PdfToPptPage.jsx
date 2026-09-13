import React, { useState, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import PptxGenJS from 'pptxgenjs'
import { saveAs } from 'file-saver'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FileText,
  Presentation,
  Download,
  Loader2,
  Settings,
  Eye,
} from 'lucide-react'
import { useTranslations } from '@/hooks/useLocale.jsx'
import useDragDrop from '../hooks/useDragDrop.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfToPptPage() {
  const t = useTranslations()
  const [file, setFile] = useState(null)
  const [pdf, setPdf] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState(null)
  const [options, setOptions] = useState({
    pageMode: 'all', // all | current
    currentPage: 1,
    scale: 2, // 渲染清晰度倍数
  })

  useDragDrop((droppedFiles) => {
    if (droppedFiles.length > 0) {
      setFile(droppedFiles[0])
    }
  })

  // 统一加载 pdf：同时支持 input File 对象和拖拽进来的 { data } 结构
  useEffect(() => {
    if (!file) {
      setPdf(null)
      setTotalPages(0)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        let data
        if (typeof file.arrayBuffer === 'function') {
          data = await file.arrayBuffer()
        } else if (file.data) {
          data = new Uint8Array(file.data)
        } else {
          return
        }
        const pdfDoc = await pdfjsLib.getDocument({ data }).promise
        if (cancelled) return
        setPdf(pdfDoc)
        setTotalPages(pdfDoc.numPages)
        setPreview(null)
        setProgress(0)
      } catch (err) {
        console.error('Load PDF error:', err)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [file])

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    setFile(selectedFile)
  }

  // 渲染单页为 PNG dataURL
  const renderPageToDataUrl = async (pageNum) => {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: options.scale })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: context, viewport }).promise
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: viewport.width / options.scale,
      height: viewport.height / options.scale,
    }
  }

  const convertToPpt = async () => {
    if (!pdf) return
    setConverting(true)
    setProgress(0)

    try {
      const pptx = new PptxGenJS()

      // 用第一页尺寸定义 slide 布局（pt 转英寸）
      const first = await renderPageToDataUrl(1)
      const slideW = +(first.width / 72).toFixed(2)
      const slideH = +(first.height / 72).toFixed(2)
      pptx.defineLayout({ name: 'PDF_PAGE', width: slideW, height: slideH })
      pptx.layout = 'PDF_PAGE'

      const pages =
        options.pageMode === 'all'
          ? Array.from({ length: totalPages }, (_, i) => i + 1)
          : [Math.min(Math.max(1, options.currentPage), totalPages)]

      for (let i = 0; i < pages.length; i++) {
        const pageNum = pages[i]
        setProgress(Math.round(((i + 1) / pages.length) * 100))

        // 第一页已渲染过，避免重复渲染
        const rendered = pageNum === 1 ? first : await renderPageToDataUrl(pageNum)

        const slide = pptx.addSlide()
        slide.addImage({
          data: rendered.dataUrl,
          x: 0,
          y: 0,
          w: slideW,
          h: slideH,
        })
      }

      const blob = await pptx.write({ outputType: 'blob' })
      const fileName = (file?.name?.replace(/\.pdf$/i, '') || 'presentation') + '.pptx'

      setPreview({
        fileName,
        size: blob.size,
        slides: pages.length,
      })

      saveAs(blob, fileName)
    } catch (err) {
      console.error('Convert to PPT error:', err)
      alert(t.pdfToPpt?.error || '转换失败，请重试')
    }

    setConverting(false)
    setProgress(0)
  }

  const reset = () => {
    setFile(null)
    setPdf(null)
    setTotalPages(0)
    setPreview(null)
    setProgress(0)
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Presentation className="h-6 w-6 text-primary" />
          {t.pdfToPpt?.title || 'PDF 转 PPT'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.pdfToPpt?.desc || '将 PDF 每页渲染为高清图片，生成对应的 PPT 幻灯片'}
        </p>
      </div>

      {!file ? (
        <Card className="mb-6">
          <CardContent className="py-8">
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                {t.common.selectFile || '选择 PDF 文件'}
              </span>
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
                <span className="text-sm text-muted-foreground">
                  ({totalPages} {t.common.pages || '页'})
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                {t.common.change || '更换'}
              </Button>
            </CardContent>
          </Card>

          {/* 转换选项 */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t.pdfToPpt?.options || '转换选项'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-sm w-20">
                  {t.pdfToPpt?.pageRange || '页面范围'}:
                </span>
                <select
                  value={options.pageMode}
                  onChange={(e) =>
                    setOptions({ ...options, pageMode: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-sm bg-background"
                >
                  <option value="all">
                    {t.pdfToPpt?.allPages || '全部页面'}
                  </option>
                  <option value="current">
                    {t.pdfToPpt?.currentPage || '指定页'}
                  </option>
                </select>
                {options.pageMode === 'current' && (
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={options.currentPage}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        currentPage: parseInt(e.target.value) || 1,
                      })
                    }
                    className="border rounded px-2 py-1 text-sm bg-background w-20"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm w-20">
                  {t.pdfToPpt?.scale || '清晰度'}:
                </span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.5"
                  value={options.scale}
                  onChange={(e) =>
                    setOptions({ ...options, scale: parseFloat(e.target.value) })
                  }
                  className="flex-1"
                />
                <span className="text-sm w-8 text-right">{options.scale}x</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.pdfToPpt?.hint || '提示：每页将作为一张图片插入幻灯片，保持原始排版不失真；清晰度越高文件越大（建议 2x）。'}
              </p>
            </CardContent>
          </Card>

          {/* 操作 */}
          <div className="flex gap-2 mb-4">
            <Button onClick={convertToPpt} disabled={converting || !pdf} className="gap-2">
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.pdfToPpt?.converting || '转换中'}... {progress}%
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {t.pdfToPpt?.convert || '开始转换'}
                </>
              )}
            </Button>
          </div>

          {/* 转换结果 */}
          {preview && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {t.pdfToPpt?.result || '转换结果'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">
                      {t.pdfToPpt?.fileName || '文件名'}
                    </div>
                    <div className="font-medium truncate">{preview.fileName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t.pdfToPpt?.fileSize || '文件大小'}
                    </div>
                    <div className="font-medium">{formatSize(preview.size)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t.pdfToPpt?.slides || '幻灯片数'}
                    </div>
                    <div className="font-medium">{preview.slides}</div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t.pdfToPpt?.success || 'PPT 文档已生成并开始下载'}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
