import React, { useState, useRef, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { saveAs } from 'file-saver'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Upload,
  FileText,
  Highlighter,
  Type as TypeIcon,
  MessageSquare,
  Download,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eraser,
  Loader2,
} from 'lucide-react'
import { useTranslations } from '@/hooks/useLocale.jsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const ANNOT_TYPES = {
  HIGHLIGHT: 'highlight',
  TEXT: 'text',
  NOTE: 'note',
}

const COLORS = [
  { name: 'yellow', value: '#FFEB3B', rgb: rgb(1, 0.92, 0.23) },
  { name: 'green', value: '#A5D6A7', rgb: rgb(0.65, 0.84, 0.65) },
  { name: 'blue', value: '#90CAF9', rgb: rgb(0.56, 0.79, 0.98) },
  { name: 'pink', value: '#F48FB1', rgb: rgb(0.96, 0.56, 0.69) },
  { name: 'orange', value: '#FFCC80', rgb: rgb(1, 0.8, 0.5) },
]

export default function AnnotatePage() {
  const t = useTranslations()
  const [file, setFile] = useState(null)
  const [pdf, setPdf] = useState(null)
  const [pdfBytes, setPdfBytes] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [annotations, setAnnotations] = useState({}) // { pageNum: [...] }
  const [currentTool, setCurrentTool] = useState(ANNOT_TYPES.HIGHLIGHT)
  const [currentColor, setCurrentColor] = useState(COLORS[0])
  const [noteText, setNoteText] = useState('')
  const [textInput, setTextInput] = useState('')
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)
  const [saving, setSaving] = useState(false)
  const [scale, setScale] = useState(1.5)

  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const containerRef = useRef(null)

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const arrayBuffer = await selectedFile.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    setPdfBytes(bytes)

    const pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise
    setPdf(pdfDoc)
    setTotalPages(pdfDoc.numPages)
    setCurrentPage(1)
    setAnnotations({})
  }

  const renderPage = async () => {
    if (!pdf || !canvasRef.current) return

    const page = await pdf.getPage(currentPage)
    const viewport = page.getViewport({ scale })

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise

    drawOverlay()
  }

  // 绘制已有注释到 overlay canvas
  const drawOverlay = () => {
    if (!overlayRef.current) return
    const overlay = overlayRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    overlay.width = canvas.width
    overlay.height = canvas.height
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, overlay.width, overlay.height)

    const pageAnnots = annotations[currentPage] || []
    for (const annot of pageAnnots) {
      if (annot.type === ANNOT_TYPES.HIGHLIGHT) {
        ctx.fillStyle = annot.color.value + 'AA'
        ctx.fillRect(annot.x, annot.y, annot.width, annot.height)
        ctx.strokeStyle = annot.color.value
        ctx.lineWidth = 1
        ctx.strokeRect(annot.x, annot.y, annot.width, annot.height)
      } else if (annot.type === ANNOT_TYPES.TEXT) {
        // 文字注释
        ctx.font = `${annot.fontSize || 16}px sans-serif`
        ctx.fillStyle = annot.color.value
        ctx.fillText(annot.text, annot.x, annot.y + 16)
      } else if (annot.type === ANNOT_TYPES.NOTE) {
        // 便签
        ctx.fillStyle = annot.color.value + 'CC'
        ctx.fillRect(annot.x, annot.y, 24, 24)
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 1
        ctx.strokeRect(annot.x, annot.y, 24, 24)
        ctx.fillStyle = '#000'
        ctx.font = 'bold 14px sans-serif'
        ctx.fillText('!', annot.x + 9, annot.y + 17)
      }
    }

    // 绘制当前拖拽选区
    if (dragStart && dragEnd) {
      const x = Math.min(dragStart.x, dragEnd.x)
      const y = Math.min(dragStart.y, dragEnd.y)
      const w = Math.abs(dragEnd.x - dragStart.x)
      const h = Math.abs(dragEnd.y - dragStart.y)
      ctx.fillStyle = currentColor.value + 'AA'
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = currentColor.value
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, w, h)
    }
  }

  useEffect(() => {
    renderPage()
  }, [currentPage, pdf, scale, annotations, dragStart, dragEnd])

  // 鼠标事件
  const getMousePos = (e) => {
    const canvas = overlayRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const handleMouseDown = (e) => {
    if (currentTool === ANNOT_TYPES.HIGHLIGHT) {
      setDragStart(getMousePos(e))
      setDragEnd(getMousePos(e))
    } else if (currentTool === ANNOT_TYPES.NOTE) {
      const pos = getMousePos(e)
      addAnnotation({
        type: ANNOT_TYPES.NOTE,
        x: pos.x,
        y: pos.y,
        color: currentColor,
        text: noteText || (t.annotate?.note || '便签'),
      })
    } else if (currentTool === ANNOT_TYPES.TEXT) {
      const pos = getMousePos(e)
      if (!textInput.trim()) return
      addAnnotation({
        type: ANNOT_TYPES.TEXT,
        x: pos.x,
        y: pos.y,
        text: textInput,
        fontSize: 16,
        color: currentColor,
      })
    }
  }

  const handleMouseMove = (e) => {
    if (currentTool === ANNOT_TYPES.HIGHLIGHT && dragStart) {
      setDragEnd(getMousePos(e))
    }
  }

  const handleMouseUp = (e) => {
    if (currentTool === ANNOT_TYPES.HIGHLIGHT && dragStart) {
      const end = getMousePos(e)
      const x = Math.min(dragStart.x, end.x)
      const y = Math.min(dragStart.y, end.y)
      const w = Math.abs(end.x - dragStart.x)
      const h = Math.abs(end.y - dragStart.y)
      if (w > 3 && h > 3) {
        addAnnotation({
          type: ANNOT_TYPES.HIGHLIGHT,
          x, y, width: w, height: h,
          color: currentColor,
        })
      }
      setDragStart(null)
      setDragEnd(null)
    }
  }

  const addAnnotation = (annot) => {
    setAnnotations((prev) => {
      const page = currentPage
      const list = prev[page] || []
      return { ...prev, [page]: [...list, { ...annot, id: Date.now() + Math.random() }] }
    })
  }

  const deleteAnnotation = (id) => {
    setAnnotations((prev) => {
      const list = prev[currentPage] || []
      return { ...prev, [currentPage]: list.filter((a) => a.id !== id) }
    })
  }

  const clearPageAnnotations = () => {
    setAnnotations((prev) => ({ ...prev, [currentPage]: [] }))
  }

  const saveAnnotatedPdf = async () => {
    if (!pdfBytes) return
    setSaving(true)
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const pages = pdfDoc.getPages()

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const { height } = page.getSize()

        const pageAnnots = annotations[i + 1] || []
        for (const annot of pageAnnots) {
          // 坐标转换：canvas (Y down) -> pdf (Y up)
          const pdfX = annot.x / scale

          if (annot.type === ANNOT_TYPES.HIGHLIGHT) {
            page.drawRectangle({
              x: pdfX,
              y: height - (annot.y + annot.height) / scale,
              width: annot.width / scale,
              height: annot.height / scale,
              color: annot.color.rgb,
              opacity: 0.4,
            })
          } else if (annot.type === ANNOT_TYPES.TEXT) {
            page.drawText(annot.text, {
              x: pdfX,
              y: height - (annot.y / scale) - 16,
              size: annot.fontSize || 16,
              font,
              color: annot.color.rgb,
            })
          } else if (annot.type === ANNOT_TYPES.NOTE) {
            page.drawRectangle({
              x: pdfX,
              y: height - (annot.y / scale) - 24,
              width: 24,
              height: 24,
              color: annot.color.rgb,
              opacity: 0.8,
              borderColor: rgb(0, 0, 0),
              borderWidth: 1,
            })
            page.drawText('!', {
              x: pdfX + 9,
              y: height - (annot.y / scale) - 18,
              size: 14,
              font,
              color: rgb(0, 0, 0),
            })
          }
        }
      }

      const modifiedBytes = await pdfDoc.save()
      const blob = new Blob([modifiedBytes], { type: 'application/pdf' })
      const fileName = (file?.name?.replace(/\.pdf$/i, '') || 'document') + '_annotated.pdf'
      saveAs(blob, fileName)
    } catch (err) {
      console.error('Save annotated PDF error:', err)
      alert(t.annotate?.error || '保存失败，请重试')
    }
    setSaving(false)
  }

  const reset = () => {
    setFile(null)
    setPdf(null)
    setPdfBytes(null)
    setAnnotations({})
    setCurrentPage(1)
    setTotalPages(0)
  }

  const tools = [
    {
      type: ANNOT_TYPES.HIGHLIGHT,
      icon: Highlighter,
      label: t.annotate?.highlight || '高亮',
    },
    {
      type: ANNOT_TYPES.TEXT,
      icon: TypeIcon,
      label: t.annotate?.text || '文字',
    },
    {
      type: ANNOT_TYPES.NOTE,
      icon: MessageSquare,
      label: t.annotate?.note || '便签',
    },
  ]

  const pageAnnotations = annotations[currentPage] || []

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Highlighter className="h-6 w-6 text-primary" />
          {t.annotate?.title || 'PDF 批注'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.annotate?.desc || '高亮、添加文字和便签注释'}
        </p>
      </div>

      {!file ? (
        <Card>
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
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* 左侧工具栏 */}
          <div className="space-y-4">
            {/* 文件信息 */}
            <Card>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">{file.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  {t.common.change || '更换'}
                </Button>
              </CardContent>
            </Card>

            {/* 工具选择 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t.annotate?.tools || '工具'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tools.map((tool) => {
                  const Icon = tool.icon
                  const active = currentTool === tool.type
                  return (
                    <button
                      key={tool.type}
                      onClick={() => setCurrentTool(tool.type)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tool.label}
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            {/* 颜色选择 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t.annotate?.color || '颜色'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setCurrentColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        currentColor.name === c.name
                          ? 'border-primary ring-2 ring-primary/30 scale-110'
                          : 'border-border'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 工具参数 */}
            {currentTool === ANNOT_TYPES.TEXT && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t.annotate?.textInput || '文字内容'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={t.annotate?.textPlaceholder || '输入要添加的文字'}
                  />
                </CardContent>
              </Card>
            )}
            {currentTool === ANNOT_TYPES.NOTE && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t.annotate?.noteContent || '便签内容'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={t.annotate?.notePlaceholder || '可选：输入便签内容'}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {t.annotate?.noteHint || '点击页面任意位置添加便签'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 操作 */}
            <div className="flex gap-2">
              <Button
                onClick={saveAnnotatedPdf}
                disabled={saving}
                className="flex-1 gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t.annotate?.save || '保存 PDF'}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={clearPageAnnotations}
                title={t.annotate?.clearPage || '清空本页'}
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </div>

            {/* 当前页注释列表 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{t.annotate?.annotations || '注释列表'}</span>
                  <span className="text-xs text-muted-foreground">
                    {pageAnnotations.length} {t.annotate?.items || '项'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pageAnnotations.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    {t.annotate?.empty || '暂无注释'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {pageAnnotations.map((annot, idx) => (
                      <div
                        key={annot.id}
                        className="flex items-center gap-2 p-2 rounded-md border bg-card/50"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: annot.color.value }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium">
                            {annot.type === ANNOT_TYPES.HIGHLIGHT
                              ? t.annotate?.highlight || '高亮'
                              : annot.type === ANNOT_TYPES.TEXT
                              ? t.annotate?.text || '文字'
                              : t.annotate?.note || '便签'}
                            #{idx + 1}
                          </div>
                          {annot.text && (
                            <div className="text-xs text-muted-foreground truncate">
                              {annot.text.substring(0, 30)}
                              {annot.text.length > 30 ? '...' : ''}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteAnnotation(annot.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧 PDF 预览 */}
          <div className="space-y-3">
            {/* 工具栏 */}
            <Card>
              <CardContent className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {t.common.page || '第'} {currentPage} / {totalPages}{' '}
                    {t.common.pageSuffix || '页'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                  >
                    -
                  </Button>
                  <span className="text-xs w-12 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.min(3, scale + 0.25))}
                  >
                    +
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* PDF 画布 */}
            <div className="relative bg-muted/30 rounded-lg border overflow-auto max-h-[700px] flex items-center justify-center p-4">
              <div className="relative inline-block">
                <canvas ref={canvasRef} className="block shadow-md" />
                <canvas
                  ref={overlayRef}
                  className="absolute inset-0 cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={() => {
                    if (dragStart) {
                      setDragStart(null)
                      setDragEnd(null)
                    }
                  }}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {currentTool === ANNOT_TYPES.HIGHLIGHT
                ? t.annotate?.highlightTip || '拖拽鼠标选择高亮区域'
                : currentTool === ANNOT_TYPES.TEXT
                ? t.annotate?.textTip || '点击页面添加文字'
                : t.annotate?.noteTip || '点击页面添加便签'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
