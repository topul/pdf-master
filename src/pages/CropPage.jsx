import React, { useState, useEffect, useRef } from 'react'
import {
  Scissors,
  FileText,
  Save,
  ZoomIn,
  ZoomOut,
  Loader2,
} from 'lucide-react'
import { cropPdf, renderPdfToImages } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'
import { cn } from '@/lib/utils'

function CropPage() {
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)

  const [pageImages, setPageImages] = useState([])
  const [pageCount, setPageCount] = useState(0)
  const [previewScale, setPreviewScale] = useState(0.4)
  const [renderingPreview, setRenderingPreview] = useState(false)

  const [selectedPage, setSelectedPage] = useState(0)
  const [crops, setCrops] = useState({})

  const [marginTop, setMarginTop] = useState(0)
  const [marginBottom, setMarginBottom] = useState(0)
  const [marginLeft, setMarginLeft] = useState(0)
  const [marginRight, setMarginRight] = useState(0)

  const previewRef = useRef(null)

  const renderPreview = async (data) => {
    if (!data) return
    setRenderingPreview(true)
    try {
      const images = await renderPdfToImages(data, previewScale)
      setPageImages(images)
      setPageCount(images.length)
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
      setCrops({})
      setSelectedPage(0)
      setMarginTop(0)
      setMarginBottom(0)
      setMarginLeft(0)
      setMarginRight(0)
      setStatus(null)
    }
  }

  const handleApply = async () => {
    if (!currentData) {
      setStatus({ type: 'error', message: '请选择文件' })
      return
    }

    const allZero = marginTop === 0 && marginBottom === 0 && marginLeft === 0 && marginRight === 0
    if (allZero) {
      setStatus({ type: 'error', message: '请设置裁剪边距' })
      return
    }

    setProcessing(true)
    try {
      const result = await cropPdf(currentData, {
        top: marginTop,
        bottom: marginBottom,
        left: marginLeft,
        right: marginRight,
      })
      setCurrentData(result)
      setStatus({ type: 'success', message: '裁剪完成' })
    } catch (error) {
      setStatus({ type: 'error', message: `裁剪失败：${error.message}` })
    }
    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return
    const saveResult = await window.electronAPI.saveFile({
      defaultPath: file?.name?.replace(/\.pdf$/i, '_cropped.pdf') || 'cropped.pdf',
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

  const handleReset = () => {
    setMarginTop(0)
    setMarginBottom(0)
    setMarginLeft(0)
    setMarginRight(0)
  }

  const currentPageImg = pageImages[selectedPage]

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Scissors}
        title="页面裁剪"
        description="调整 PDF 页面边距，裁剪空白区域"
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
          disabled={!currentData || processing}
        >
          <Scissors className="mr-1.5 h-4 w-4" />
          应用裁剪
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
          icon={Scissors}
          title="还没有选择 PDF"
          description="选择一个 PDF 文件调整页面边距"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            '设置上下左右边距',
            '实时预览裁剪效果',
            '应用到所有页面',
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
            {/* 左侧：裁剪设置 */}
            <Card className="flex w-64 shrink-0 flex-col">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">裁剪设置</h3>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">上边距 (pt)</Label>
                    <Input
                      type="number"
                      value={marginTop}
                      onChange={(e) => setMarginTop(parseInt(e.target.value) || 0)}
                      className="mt-1 h-9 text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">下边距 (pt)</Label>
                    <Input
                      type="number"
                      value={marginBottom}
                      onChange={(e) => setMarginBottom(parseInt(e.target.value) || 0)}
                      className="mt-1 h-9 text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">左边距 (pt)</Label>
                    <Input
                      type="number"
                      value={marginLeft}
                      onChange={(e) => setMarginLeft(parseInt(e.target.value) || 0)}
                      className="mt-1 h-9 text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">右边距 (pt)</Label>
                    <Input
                      type="number"
                      value={marginRight}
                      onChange={(e) => setMarginRight(parseInt(e.target.value) || 0)}
                      className="mt-1 h-9 text-sm"
                      min="0"
                    />
                  </div>
                </div>

                <div className="mt-3 rounded-md border border-dashed p-2 text-center text-xs text-muted-foreground">
                  A4 页面：595 × 842 pt
                </div>

                <Button
                  variant="outline"
                  className="mt-auto"
                  onClick={handleReset}
                  disabled={processing}
                >
                  重置边距
                </Button>
              </div>
            </Card>

            {/* 右侧：预览 */}
            <Card className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">预览</h3>
                  {pageCount > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedPage + 1} / {pageCount}
                    </Badge>
                  )}
                </div>
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
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !currentPageImg ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    加载预览失败
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div
                      ref={previewRef}
                      className="relative"
                      style={{
                        width: currentPageImg.width * previewScale,
                        height: currentPageImg.height * previewScale,
                      }}
                    >
                      <img
                        src={currentPageImg.url}
                        alt={`第 ${selectedPage + 1} 页`}
                        className="rounded border bg-white"
                        style={{
                          width: '100%',
                          height: '100%',
                        }}
                      />
                      {marginTop > 0 && (
                        <div
                          className="absolute inset-x-0 top-0 bg-black/30"
                          style={{ height: (marginTop / 842) * (currentPageImg.height * previewScale) }}
                        />
                      )}
                      {marginBottom > 0 && (
                        <div
                          className="absolute inset-x-0 bottom-0 bg-black/30"
                          style={{ height: (marginBottom / 842) * (currentPageImg.height * previewScale) }}
                        />
                      )}
                      {marginLeft > 0 && (
                        <div
                          className="absolute inset-y-0 left-0 bg-black/30"
                          style={{ width: (marginLeft / 595) * (currentPageImg.width * previewScale) }}
                        />
                      )}
                      {marginRight > 0 && (
                        <div
                          className="absolute inset-y-0 right-0 bg-black/30"
                          style={{ width: (marginRight / 595) * (currentPageImg.width * previewScale) }}
                        />
                      )}
                      <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                        第 {selectedPage + 1} 页
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>
              {pageCount > 1 && (
                <div className="border-t px-4 py-2">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setSelectedPage((p) => Math.max(0, p - 1))}
                      disabled={selectedPage === 0}
                    >
                      ←
                    </Button>
                    <div className="flex gap-1">
                      {pageImages.slice(Math.max(0, selectedPage - 2), selectedPage + 3).map((_, idx) => {
                        const actualIdx = Math.max(0, selectedPage - 2) + idx
                        return (
                          <button
                            key={actualIdx}
                            onClick={() => setSelectedPage(actualIdx)}
                            className={cn(
                              'h-7 w-7 rounded-md text-xs transition-colors',
                              selectedPage === actualIdx
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-input hover:bg-accent'
                            )}
                          >
                            {actualIdx + 1}
                          </button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setSelectedPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={selectedPage === pageCount - 1}
                    >
                      →
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default CropPage
