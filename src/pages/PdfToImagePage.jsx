import React, { useState, useEffect } from 'react'
import {
  Image as ImageIcon,
  FileText,
  Save,
  Loader2,
  Sparkles,
  Download,
  FolderOpen,
} from 'lucide-react'
import { getPdfInfo, renderPdfToImages } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'
import useDragDrop from '../hooks/useDragDrop.js'

function PdfToImagePage() {
  const t = useTranslations()
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageImages, setPageImages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [rendering, setRendering] = useState(false)
  const [format, setFormat] = useState('png')
  const [quality, setQuality] = useState(90)
  const [scale, setScale] = useState(2)

  useDragDrop((droppedFiles) => {
    if (droppedFiles.length > 0) {
      setFile(droppedFiles[0])
      setStatus(null)
    }
  })

  const handleSelectFile = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
    })
    if (result.canceled) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      try {
        const info = await getPdfInfo(fileResult.data)
        const fileName = filePath.split(/[\\/]/).pop()
        setFile({
          path: filePath,
          name: fileName,
          data: fileResult.data,
          pageCount: info.pageCount,
        })
        setPageCount(info.pageCount)
        setPageImages([])
        setStatus(null)
      } catch (e) {
        setStatus({ type: 'error', message: (t.pdfToImagePage.loadError || '加载 PDF 失败：{error}').replace('{error}', e.message) })
      }
    }
  }

  const handleConvert = async () => {
    if (!file) return
    setProcessing(true)
    setRendering(true)
    setStatus({ type: 'info', message: t.pdfToImagePage.convertingStatus || '正在将 PDF 转换为图片...' })
    setPageImages([])

    try {
      const images = await renderPdfToImages(file.data, scale)

      if (format === 'jpg' || format === 'jpeg') {
        const jpgImages = []
        for (let i = 0; i < images.length; i++) {
          const img = new Image()
          img.src = images[i].url
          await new Promise((resolve) => {
            img.onload = resolve
          })
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', quality / 100)
          )
          jpgImages.push({
            url: URL.createObjectURL(blob),
            width: img.naturalWidth,
            height: img.naturalHeight,
          })
        }
        images.forEach((img) => URL.revokeObjectURL(img.url))
        setPageImages(jpgImages)
      } else {
        setPageImages(images)
      }

      setStatus({ type: 'success', message: (t.pdfToImagePage.convertSuccess || '转换成功！共 {count} 页已转为图片').replace('{count}', images.length) })
    } catch (error) {
      setStatus({ type: 'error', message: (t.pdfToImagePage.convertError || '转换失败：{error}').replace('{error}', error.message) })
    }
    setProcessing(false)
    setRendering(false)
  }

  const handleSaveAll = async () => {
    if (pageImages.length === 0) return

    const dirResult = await window.electronAPI.openDirectory()
    if (dirResult.canceled) return

    const dirPath = dirResult.filePaths[0]
    const baseName = file.name.replace(/\.pdf$/i, '')
    const files = []

    for (let i = 0; i < pageImages.length; i++) {
      const response = await fetch(pageImages[i].url)
      const blob = await response.blob()
      const buffer = await blob.arrayBuffer()
      const padNum = String(i + 1).padStart(String(pageImages.length).length, '0')
      files.push({
        path: `${dirPath}/${baseName}_page_${padNum}.${format}`,
        data: Array.from(new Uint8Array(buffer)),
      })
    }

    const writeResult = await window.electronAPI.writeFiles(files)
    if (writeResult.success) {
      setStatus({ type: 'success', message: (t.pdfToImagePage.saveSuccess || '保存成功！已保存 {count} 张图片到：{path}').replace('{count}', files.length).replace('{path}', dirPath) })
    } else {
      setStatus({ type: 'error', message: (t.pdfToImagePage.saveError || '保存失败：{error}').replace('{error}', writeResult.error) })
    }
  }

  const handleClear = () => {
    pageImages.forEach((img) => img.url && URL.revokeObjectURL(img.url))
    setFile(null)
    setPageCount(0)
    setPageImages([])
    setStatus(null)
  }

  const formatOptions = [
    { value: 'png', label: t.pdfToImagePage.formatPng || 'PNG（无损）' },
    { value: 'jpg', label: t.pdfToImagePage.formatJpg || 'JPG（有损）' },
  ]

  const scaleOptions = [
    { value: 1, label: t.pdfToImagePage.scale1x || '1x（标准）' },
    { value: 2, label: t.pdfToImagePage.scale2x || '2x（高清）' },
    { value: 3, label: t.pdfToImagePage.scale3x || '3x（超清）' },
  ]

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={ImageIcon}
        title={t.pdfToImagePage.title || 'PDF 转图片'}
        description={t.pdfToImagePage.description || '将 PDF 的每一页导出为高清图片'}
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
            <FileText className="mr-1.5 h-4 w-4" />
            {t.pdfToImagePage.changeFile || '更换文件'}
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          {t.pdfToImagePage.selectFile || '选择文件'}
        </Button>
        <Button size="sm" onClick={handleSaveAll} disabled={processing || pageImages.length === 0}>
          <Download className="mr-1.5 h-4 w-4" />
          {t.pdfToImagePage.saveAll || '全部保存'}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={ImageIcon}
          title={t.pdfToImagePage.emptyTitle || '还没有选择 PDF'}
          description={t.pdfToImagePage.emptyDescription || '选择一个 PDF，将每一页导出为 PNG 或 JPG 图片'}
          actionLabel={t.pdfToImagePage.emptyActionLabel || '选择 PDF 文件'}
          onAction={handleSelectFile}
          tips={[
            t.pdfToImagePage.tip1 || '支持 PNG（无损）和 JPG（有损）两种格式',
            t.pdfToImagePage.tip2 || '可调节输出分辨率：1x / 2x / 3x',
            t.pdfToImagePage.tip3 || '所有页面一次性批量导出',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={(t.pdfToImagePage.metaPages || '共 {count} 页').replace('{count}', pageCount)}
            onRemove={!processing ? handleClear : undefined}
          />

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[320px_1fr]">
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">{t.pdfToImagePage.settingsTitle || '导出设置'}</h3>
                <p className="text-xs text-muted-foreground">{t.pdfToImagePage.settingsDesc || '调整图片格式与分辨率'}</p>
              </div>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{t.pdfToImagePage.formatLabel || '图片格式'}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {formatOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFormat(opt.value)}
                        disabled={processing}
                        className={cn(
                          'rounded-md border py-2 text-xs font-medium transition-all',
                          format === opt.value
                            ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                            : 'hover:bg-accent'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {format === 'jpg' && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{t.pdfToImagePage.jpgQuality || 'JPG 质量'}</Label>
                      <span className="text-xs text-muted-foreground">{quality}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                      disabled={processing}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{t.pdfToImagePage.scaleLabel || '输出分辨率'}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {scaleOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setScale(opt.value)}
                        disabled={processing}
                        className={cn(
                          'rounded-md border py-2 text-xs font-medium transition-all',
                          scale === opt.value
                            ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                            : 'hover:bg-accent'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleConvert}
                  disabled={processing || !file}
                  className="mt-2 w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      {t.pdfToImagePage.converting || '转换中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      {t.pdfToImagePage.convertButton || '开始转换'}
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <Card className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-medium">
                  {pageImages.length > 0 ? (t.pdfToImagePage.previewCount || '图片预览（{count} 页）').replace('{count}', pageImages.length) : (t.pdfToImagePage.previewTitle || '图片预览')}
                </span>
                {rendering && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t.pdfToImagePage.rendering || '渲染中...'}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {pageImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {pageImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="group relative overflow-hidden rounded-lg border bg-card"
                      >
                        <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-muted/30">
                          <img
                            src={img.url}
                            alt={(t.pdfToImagePage.pageAlt || '第 {n} 页').replace('{n}', idx + 1)}
                            className="h-full w-full object-contain"
                          />
                          <div className="absolute left-1.5 top-1.5 flex h-5 items-center justify-center rounded-full bg-background/90 px-1.5 text-[10px] font-medium text-foreground shadow-sm">
                            {(t.pdfToImagePage.pageAlt || '第 {n} 页').replace('{n}', idx + 1)}
                          </div>
                        </div>
                        <div className="border-t px-2 py-1.5">
                          <p className="truncate text-[11px] text-muted-foreground">
                            {Math.round(img.width)} × {Math.round(img.height)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {rendering ? (t.pdfToImagePage.renderingStatus || '正在渲染...') : (t.pdfToImagePage.clickToConvert || '点击「开始转换」生成图片预览')}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default PdfToImagePage
