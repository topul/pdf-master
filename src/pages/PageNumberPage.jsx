import React, { useState, useEffect } from 'react'
import {
  Hash,
  FileText,
  Save,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { getPdfInfo, addPageNumbers, renderPdfToImages } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'
import useDragDrop from '../hooks/useDragDrop.js'

function PageNumberPage() {
  const t = useTranslations()
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageImages, setPageImages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [renderingPreview, setRenderingPreview] = useState(false)

  useDragDrop((droppedFiles) => {
    if (droppedFiles.length > 0) {
      setFile(droppedFiles[0])
      setStatus(null)
    }
  })

  const [position, setPosition] = useState('bottom-center')
  const [fontSize, setFontSize] = useState(12)
  const [color, setColor] = useState('#000000')
  const [startNumber, setStartNumber] = useState(1)
  const [format, setFormat] = useState('{page}')

  const renderPreview = async (data) => {
    if (!data) return
    setRenderingPreview(true)
    try {
      const images = await renderPdfToImages(data, 0.6)
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
  }, [currentData])

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 0, g: 0, b: 0 }
  }

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
        setCurrentData(fileResult.data)
        setPageCount(info.pageCount)
        setStatus(null)
      } catch (e) {
        setStatus({ type: 'error', message: (t.pagenumPage.loadError || '加载 PDF 失败：{error}').replace('{error}', e.message) })
      }
    }
  }

  const handleApplyPageNumbers = async () => {
    if (!currentData) return

    setProcessing(true)
    setStatus({ type: 'info', message: t.pagenumPage.addingStatus || '正在添加页码...' })

    try {
      const result = await addPageNumbers(currentData, {
        position,
        fontSize: parseInt(fontSize, 10),
        color: hexToRgb(color),
        startNumber: parseInt(startNumber, 10),
        format,
      })
      setCurrentData(result)
      setStatus({ type: 'success', message: t.pagenumPage.addSuccess || '页码已添加' })
    } catch (error) {
      setStatus({ type: 'error', message: (t.pagenumPage.addError || '添加失败：{error}').replace('{error}', error.message) })
    }

    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: 'page-numbered.pdf',
    })

    if (saveResult.canceled) return

    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, currentData)
    if (writeResult.success) {
      setStatus({
        type: 'success',
        message: (t.pagenumPage.saveSuccess || '保存成功！文件已保存到：{path}').replace('{path}', saveResult.filePath),
      })
    } else {
      setStatus({ type: 'error', message: (t.pagenumPage.saveError || '保存失败：{error}').replace('{error}', writeResult.error) })
    }
  }

  const handleClear = () => {
    setFile(null)
    setCurrentData(null)
    setPageCount(0)
    setStatus(null)
    setPageImages([])
  }

  const positionOptions = [
    { value: 'bottom-center', label: t.pagenumPage.posBottomCenter || '底部居中' },
    { value: 'bottom-left', label: t.pagenumPage.posBottomLeft || '底部左' },
    { value: 'bottom-right', label: t.pagenumPage.posBottomRight || '底部右' },
    { value: 'top-center', label: t.pagenumPage.posTopCenter || '顶部居中' },
    { value: 'top-left', label: t.pagenumPage.posTopLeft || '顶部左' },
    { value: 'top-right', label: t.pagenumPage.posTopRight || '顶部右' },
  ]

  const formatOptions = [
    { value: '{page}', label: t.pagenumPage.fmtPage || '1, 2, 3...' },
    { value: '第 {page} 页', label: t.pagenumPage.fmtPageZh || '第 1 页, 第 2 页...' },
    { value: '{page} / {total}', label: t.pagenumPage.fmtPageTotal || '1 / N, 2 / N...' },
    { value: '- {page} -', label: t.pagenumPage.fmtDashPage || '- 1 -, - 2 -...' },
  ]

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Hash}
        title={t.pagenumPage.title || '添加页码'}
        description={t.pagenumPage.description || '自动给 PDF 每页添加页码，支持多种格式和位置'}
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
            <FileText className="mr-1.5 h-4 w-4" />
            {t.pagenumPage.changeFile || '更换文件'}
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          {t.pagenumPage.selectFile || '选择文件'}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={processing || !currentData}>
          <Save className="mr-1.5 h-4 w-4" />
          {t.pagenumPage.save || '保存'}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={Hash}
          title={t.pagenumPage.emptyTitle || '还没有选择 PDF'}
          description={t.pagenumPage.emptyDescription || '选择一个 PDF 后，可以批量给每页添加自定义页码'}
          actionLabel={t.pagenumPage.emptyActionLabel || '选择 PDF 文件'}
          onAction={handleSelectFile}
          tips={[
            t.pagenumPage.tip1 || '支持 6 种位置：上下左右与居中',
            t.pagenumPage.tip2 || '4 种内置格式：纯数字、第 N 页、N/总数 等',
            t.pagenumPage.tip3 || '可设置起始页码，适合多卷文档',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={(t.pagenumPage.meta || '共 {total} 页').replace('{total}', pageCount)}
            onRemove={!processing ? handleClear : undefined}
          />

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[360px_1fr]">
            {/* 控制面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">{t.pagenumPage.settingsTitle || '页码设置'}</h3>
                <p className="text-xs text-muted-foreground">{t.pagenumPage.settingsDesc || '配置位置、格式与样式'}</p>
              </div>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{t.pagenumPage.position || '位置'}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {positionOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPosition(opt.value)}
                        disabled={processing}
                        className={cn(
                          'rounded-md border py-2 text-xs font-medium transition-all',
                          position === opt.value
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
                  <Label className="text-sm">{t.pagenumPage.format || '格式'}</Label>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formatOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">{t.pagenumPage.fontSize || '字号'}</Label>
                    <Input
                      type="number"
                      min="8"
                      max="36"
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      disabled={processing}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">{t.pagenumPage.startNumber || '起始页码'}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={startNumber}
                      onChange={(e) => setStartNumber(e.target.value)}
                      disabled={processing}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{t.pagenumPage.color || '颜色'}</Label>
                  <div className="flex h-9 items-center gap-2 rounded-md border px-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      disabled={processing}
                      className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                    <span className="text-xs text-muted-foreground">{color}</span>
                  </div>
                </div>

                <Button
                  onClick={handleApplyPageNumbers}
                  disabled={processing}
                  className="mt-2 w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      {t.pagenumPage.adding || '添加中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      {t.pagenumPage.addPageNumber || '添加页码'}
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* 预览面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-medium">{t.pagenumPage.previewLabel || '预览（第一页）'}</span>
                {renderingPreview && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t.pagenumPage.rendering || '渲染中...'}
                  </span>
                )}
              </div>
              <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
                {pageImages[0] ? (
                  <img
                    src={pageImages[0].url}
                    alt={t.pagenumPage.previewLabel || '预览'}
                    className="max-h-full max-w-full shadow-md"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {renderingPreview ? (t.pagenumPage.rendering || '渲染中...') : (t.pagenumPage.noPreview || '无预览')}
                  </span>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default PageNumberPage
