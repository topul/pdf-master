import React, { useState } from 'react'
import {
  ImagePlus,
  Trash2,
  Save,
  Loader2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  FileImage,
} from 'lucide-react'
import { imagesToPdf } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'

function ImageToPdfPage() {
  const t = useTranslations()
  const [images, setImages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [pageSize, setPageSize] = useState('a4')
  const [fit, setFit] = useState(true)
  const [outputData, setOutputData] = useState(null)

  const handleSelectImages = async () => {
    const result = await window.electronAPI.openFiles({
      filters: [{ name: t.imageToPdfPage.imageFilter || '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }],
    })
    if (result.canceled) return

    const newImages = []
    for (const filePath of result.filePaths) {
      const fileResult = await window.electronAPI.readFile(filePath)
      if (fileResult.success) {
        const fileName = filePath.split(/[\\/]/).pop()
        const blob = new Blob([new Uint8Array(fileResult.data)])
        const url = URL.createObjectURL(blob)
        newImages.push({
          path: filePath,
          name: fileName,
          data: fileResult.data,
          previewUrl: url,
        })
      }
    }
    setImages((prev) => [...prev, ...newImages])
    setOutputData(null)
    setStatus(null)
  }

  const handleRemove = (index) => {
    setImages((prev) => {
      const next = [...prev]
      if (next[index]?.previewUrl) {
        URL.revokeObjectURL(next[index].previewUrl)
      }
      next.splice(index, 1)
      return next
    })
    setOutputData(null)
  }

  const handleMoveUp = (index) => {
    if (index === 0) return
    setImages((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
    setOutputData(null)
  }

  const handleMoveDown = (index) => {
    if (index === images.length - 1) return
    setImages((prev) => {
      const next = [...prev]
      ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
      return next
    })
    setOutputData(null)
  }

  const handleConvert = async () => {
    if (images.length === 0) return
    setProcessing(true)
    setStatus({ type: 'info', message: t.imageToPdfPage.convertingStatus || '正在将图片转换为 PDF...' })
    setOutputData(null)

    try {
      const result = await imagesToPdf(images, { pageSize, fit })
      setOutputData(result)
      setStatus({ type: 'success', message: (t.imageToPdfPage.convertSuccess || '转换成功！共 {count} 张图片已转为 PDF').replace('{count}', images.length) })
    } catch (error) {
      setStatus({ type: 'error', message: (t.imageToPdfPage.convertError || '转换失败：{error}').replace('{error}', error.message) })
    }
    setProcessing(false)
  }

  const handleSave = async () => {
    if (!outputData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: 'images-to-pdf.pdf',
    })
    if (saveResult.canceled) return

    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, outputData)
    if (writeResult.success) {
      setStatus({ type: 'success', message: (t.imageToPdfPage.saveSuccess || '保存成功！文件已保存到：{path}').replace('{path}', saveResult.filePath) })
    } else {
      setStatus({ type: 'error', message: (t.imageToPdfPage.saveError || '保存失败：{error}').replace('{error}', writeResult.error) })
    }
  }

  const handleClear = () => {
    images.forEach((img) => img.previewUrl && URL.revokeObjectURL(img.previewUrl))
    setImages([])
    setOutputData(null)
    setStatus(null)
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={ImagePlus}
        title={t.imageToPdfPage.title || '图片转 PDF'}
        description={t.imageToPdfPage.description || '将多张图片按顺序合并为一个 PDF 文档'}
      >
        {images.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t.imageToPdfPage.clear || '清空'}
          </Button>
        )}
        <Button size="sm" onClick={handleSelectImages} disabled={processing}>
          <FileImage className="mr-1.5 h-4 w-4" />
          {t.imageToPdfPage.selectImages || '选择图片'}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={processing || !outputData}>
          <Save className="mr-1.5 h-4 w-4" />
          {t.imageToPdfPage.save || '保存'}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {images.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title={t.imageToPdfPage.emptyTitle || '还没有选择图片'}
          description={t.imageToPdfPage.emptyDescription || '选择一张或多张图片，按顺序转换为 PDF 文档'}
          actionLabel={t.imageToPdfPage.emptyActionLabel || '选择图片文件'}
          onAction={handleSelectImages}
          tips={[
            t.imageToPdfPage.tip1 || '支持 JPG、PNG、GIF、BMP、WebP 格式',
            t.imageToPdfPage.tip2 || '可添加多张图片，按顺序排列为多页 PDF',
            t.imageToPdfPage.tip3 || '支持 A4 纸张自适应或按图片尺寸输出',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>{(t.imageToPdfPage.addedCount || '已添加 {count} 张图片').split('{count}')[0]}<span className="font-medium text-foreground">{images.length}</span>{(t.imageToPdfPage.addedCount || '已添加 {count} 张图片').split('{count}')[1]}</span>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[320px_1fr]">
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">{t.imageToPdfPage.settingsTitle || '转换设置'}</h3>
                <p className="text-xs text-muted-foreground">{t.imageToPdfPage.settingsDesc || '调整纸张与布局方式'}</p>
              </div>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{t.imageToPdfPage.pageSizeLabel || '纸张尺寸'}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'a4', label: t.imageToPdfPage.pageSizeA4 || 'A4 纸张' },
                      { value: 'fit', label: t.imageToPdfPage.pageSizeFit || '适应图片' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPageSize(opt.value)}
                        disabled={processing}
                        className={cn(
                          'rounded-md border py-2 text-xs font-medium transition-all',
                          pageSize === opt.value
                            ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                            : 'hover:bg-accent'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{t.imageToPdfPage.fitLabel || '图片适配'}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFit(true)}
                      disabled={processing}
                      className={cn(
                        'rounded-md border py-2 text-xs font-medium transition-all',
                        fit
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'hover:bg-accent'
                      )}
                    >
                      {t.imageToPdfPage.fitScale || '等比缩放'}
                    </button>
                    <button
                      onClick={() => setFit(false)}
                      disabled={processing}
                      className={cn(
                        'rounded-md border py-2 text-xs font-medium transition-all',
                        !fit
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'hover:bg-accent'
                      )}
                    >
                      {t.imageToPdfPage.fitOriginal || '原始尺寸'}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleConvert}
                  disabled={processing || images.length === 0}
                  className="mt-2 w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      {t.imageToPdfPage.converting || '转换中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      {t.imageToPdfPage.convertButton || '开始转换'}
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <Card className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-medium">{t.imageToPdfPage.imageListTitle || '图片列表（拖拽排序）'}</span>
                <span className="text-xs text-muted-foreground">{(t.imageToPdfPage.imageListCount || '共 {count} 张').replace('{count}', images.length)}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative overflow-hidden rounded-lg border bg-card"
                    >
                      <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-muted/30">
                        <img
                          src={img.previewUrl}
                          alt={img.name}
                          className="h-full w-full object-contain"
                        />
                        <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-[10px] font-medium text-foreground shadow-sm">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="border-t px-2 py-1.5">
                        <p className="truncate text-[11px] text-muted-foreground">{img.name}</p>
                      </div>
                      <div className="absolute right-1 top-1 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0 || processing}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-30"
                          title={t.imageToPdfPage.moveUp || '上移'}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === images.length - 1 || processing}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-background/90 text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-30"
                          title={t.imageToPdfPage.moveDown || '下移'}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleRemove(idx)}
                          disabled={processing}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/90 text-destructive-foreground shadow-sm transition-colors hover:bg-destructive"
                          title={t.imageToPdfPage.remove || '删除'}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageToPdfPage
