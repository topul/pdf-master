import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  PenTool,
  FileText,
  Save,
  Undo2,
  Download,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Move,
} from 'lucide-react'
import { signPdf, renderPdfToImages } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'
import { cn } from '@/lib/utils'

function SignaturePage() {
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)

  const [pageImages, setPageImages] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [previewScale, setPreviewScale] = useState(0.4)
  const [renderingPreview, setRenderingPreview] = useState(false)

  const [signatureColor, setSignatureColor] = useState('#000000')
  const [signatureWidth, setSignatureWidth] = useState(3)

  const [hasSignature, setHasSignature] = useState(false)
  const [signatures, setSignatures] = useState([])

  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  const renderPreview = async (data) => {
    if (!data) return
    setRenderingPreview(true)
    try {
      const images = await renderPdfToImages(data, previewScale)
      setPageImages(images)
    } catch (e) {
      console.error('预览渲染失败:', e)
      setPageImages([])
    }
    setRenderingPreview(false)
  }

  useEffect(() => {
    if (currentData) {
      renderPreview(currentData)
    }
  }, [currentData, previewScale])

  const handleSelectFile = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })
    if (result.canceled) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      const fileName = filePath.split(/[\\/]/).pop()
      setFile({
        path: filePath,
        name: fileName,
        data: fileResult.data,
        size: fileResult.data.length,
      })
      setCurrentData(fileResult.data)
      setSignatures([])
      setHasSignature(false)
      clearCanvas()
      setStatus(null)
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = useCallback((e) => {
    isDrawingRef.current = true
    const pos = getCanvasCoordinates(e)
    lastPosRef.current = pos

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.strokeStyle = signatureColor
    ctx.lineWidth = signatureWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [signatureColor, signatureWidth])

  const draw = useCallback((e) => {
    if (!isDrawingRef.current) return
    e.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getCanvasCoordinates(e)

    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()

    lastPosRef.current = pos
    setHasSignature(true)
  }, [])

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseleave', stopDrawing)

    canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0]
      startDrawing({ clientX: touch.clientX, clientY: touch.clientY })
    })
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const touch = e.touches[0]
      draw({ clientX: touch.clientX, clientY: touch.clientY })
    })
    canvas.addEventListener('touchend', stopDrawing)

    return () => {
      canvas.removeEventListener('mousedown', startDrawing)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stopDrawing)
      canvas.removeEventListener('mouseleave', stopDrawing)
      canvas.removeEventListener('touchstart', startDrawing)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stopDrawing)
    }
  }, [startDrawing, draw, stopDrawing])

  const handleAddSignature = () => {
    if (!hasSignature) {
      setStatus({ type: 'error', message: '请先在画板上签名' })
      return
    }

    const canvas = canvasRef.current
    const dataUrl = canvas.toDataURL('image/png')
    const newSig = {
      id: Date.now(),
      dataUrl,
      color: signatureColor,
      width: signatureWidth,
      x: 100,
      y: 100,
      pageIndex: 0,
    }
    setSignatures((prev) => [...prev, newSig])
    clearCanvas()
    setStatus({ type: 'success', message: '签名已添加，可在预览中调整位置' })
  }

  const handleRemoveSignature = (id) => {
    setSignatures((prev) => prev.filter((s) => s.id !== id))
  }

  const handlePreviewClick = (e, pageIndex) => {
    if (signatures.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 612
    const y = ((rect.height - (e.clientY - rect.top)) / rect.height) * 792

    const lastSig = signatures[signatures.length - 1]
    setSignatures((prev) =>
      prev.map((s) => (s.id === lastSig.id ? { ...s, x, y, pageIndex } : s))
    )
    setStatus({ type: 'info', message: `签名位置已更新到第 ${pageIndex + 1} 页` })
  }

  const handleApply = async () => {
    if (!currentData || signatures.length === 0) {
      setStatus({ type: 'error', message: '请添加至少一个签名' })
      return
    }

    setProcessing(true)
    try {
      const result = await signPdf(currentData, signatures)
      setCurrentData(result)
      setStatus({ type: 'success', message: '签名已应用到 PDF' })
    } catch (error) {
      setStatus({ type: 'error', message: `应用失败：${error.message}` })
    }
    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return
    const saveResult = await window.electronAPI.saveFile({
      defaultPath: file?.name?.replace(/\.pdf$/i, '_signed.pdf') || 'signed.pdf',
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })
    if (saveResult.canceled) return
    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, currentData)
    if (writeResult.success) {
      setStatus({ type: 'success', message: `已保存到：${saveResult.filePath}` })
    } else {
      setStatus({ type: 'error', message: `保存失败：${writeResult.error}` })
    }
  }

  const colors = ['#000000', '#FF0000', '#0066CC', '#333333', '#666666']
  const widths = [2, 3, 4, 5, 6]

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={PenTool}
        title="PDF 签名"
        description="手写签名并添加到 PDF 指定位置，支持调整大小和颜色"
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleSelectFile} disabled={processing}>
            <FileText className="mr-1.5 h-4 w-4" />
            更换文件
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          选择文件
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!currentData || signatures.length === 0 || processing}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          应用签名
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!currentData || processing}
        >
          <Save className="mr-1.5 h-4 w-4" />
          保存 PDF
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={PenTool}
          title="还没有选择 PDF"
          description="选择一个 PDF 文件，添加手写签名"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            '在画板上手写签名',
            '调整签名颜色和粗细',
            '点击预览页面放置签名',
            '支持添加多个签名',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={`${pageImages.length} 页 · ${(file.size / 1024 / 1024).toFixed(2)} MB`}
            onRemove={!processing ? handleSelectFile : undefined}
          />

          <div className="flex flex-1 gap-4 overflow-hidden">
            {/* 左侧：签名画板 */}
            <Card className="flex w-72 shrink-0 flex-col">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">签名画板</h3>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="relative flex-1 overflow-hidden rounded-lg border bg-white">
                  <canvas
                    ref={canvasRef}
                    width={300}
                    height={150}
                    className="h-full w-full cursor-crosshair"
                  />
                  {!hasSignature && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-xs text-muted-foreground">
                      <PenTool className="mb-1.5 h-6 w-6 opacity-30" />
                      <span>在此处签名</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-3">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>颜色</span>
                    </div>
                    <div className="flex gap-1.5">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSignatureColor(color)}
                          className={cn(
                            'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                            signatureColor === color
                              ? 'border-primary scale-110'
                              : 'border-muted-foreground/30'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>粗细</span>
                      <span className="font-medium">{signatureWidth}px</span>
                    </div>
                    <div className="flex gap-1">
                      {widths.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setSignatureWidth(w)}
                          className={cn(
                            'flex-1 rounded-md border py-1.5 text-xs transition-colors',
                            signatureWidth === w
                              ? 'border-primary bg-primary/10'
                              : 'hover:bg-accent/50'
                          )}
                        >
                          {w}px
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCanvas}
                    className="flex-1"
                  >
                    <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                    清除
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddSignature}
                    disabled={!hasSignature}
                    className="flex-1"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    添加
                  </Button>
                </div>
              </div>
            </Card>

            {/* 中间：签名列表 */}
            <Card className="flex w-64 shrink-0 flex-col">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">签名列表</h3>
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {signatures.length} 个
                </Badge>
              </div>
              <ScrollArea className="flex-1 p-3">
                {signatures.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-xs text-muted-foreground">
                    <PenTool className="mb-1.5 h-6 w-6 opacity-30" />
                    <span>暂无签名</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {signatures.map((sig, idx) => (
                      <div
                        key={sig.id}
                        className="group flex items-center gap-2 rounded-md border p-2"
                      >
                        <div className="h-8 w-8 overflow-hidden rounded border">
                          <img
                            src={sig.dataUrl}
                            alt={`签名 ${idx + 1}`}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium">
                            签名 {idx + 1}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            第 {sig.pageIndex + 1} 页
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveSignature(sig.id)}
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="border-t p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Move className="h-3 w-3" />
                  <span>点击预览页面调整签名位置</span>
                </div>
              </div>
            </Card>

            {/* 右侧：PDF 预览 */}
            <Card className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">PDF 预览</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewScale((s) => Math.max(0.2, s - 0.1))}
                    disabled={previewScale <= 0.2}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-12 text-center">
                    {(previewScale * 100).toFixed(0)}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewScale((s) => Math.min(0.8, s + 0.1))}
                    disabled={previewScale >= 0.8}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                {renderingPreview ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>正在渲染预览...</span>
                    </div>
                  </div>
                ) : pageImages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    加载预览失败
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pageImages.map((img, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'relative mx-auto overflow-hidden rounded-lg border bg-white',
                          signatures.some((s) => s.pageIndex === idx) && 'ring-2 ring-primary'
                        )}
                        style={{
                          width: img.width * previewScale,
                          height: img.height * previewScale,
                        }}
                        onClick={(e) => handlePreviewClick(e, idx)}
                      >
                        <img
                          src={img.url}
                          alt={`第 ${idx + 1} 页`}
                          className="h-full w-full"
                        />
                        {signatures
                          .filter((s) => s.pageIndex === idx)
                          .map((sig) => (
                            <img
                              key={sig.id}
                              src={sig.dataUrl}
                              alt=""
                              className="pointer-events-none absolute"
                              style={{
                                left: (sig.x / 612) * (img.width * previewScale),
                                top: (1 - sig.y / 792) * (img.height * previewScale) - 40,
                                height: 40,
                                opacity: 0.9,
                              }}
                            />
                          ))}
                        <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                          {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default SignaturePage
