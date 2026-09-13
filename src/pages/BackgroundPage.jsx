import React, { useState, useEffect } from 'react'
import {
  Palette,
  FileText,
  Save,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import { getPdfInfo, addBackground, renderPdfToImages } from '../utils/pdfUtils.js'
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

function BackgroundPage() {
  const t = useTranslations()
  const bg = t.backgroundPage || {}
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

  const [type, setType] = useState('color')
  const [color, setColor] = useState('#f5f5dc')
  const [image, setImage] = useState(null)
  const [mode, setMode] = useState('stretch')
  const [opacity, setOpacity] = useState(0.15)
  const [scale, setScale] = useState(1)

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

  useEffect(() => {
    if (file && file.data && !currentData) {
      setCurrentData(file.data)
      setPageCount(file.pageCount || 0)
    }
  }, [file])

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 1, g: 1, b: 1 }
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
        setStatus({ type: 'error', message: (bg.loadError || '加载 PDF 失败：{error}').replace('{error}', e.message) })
      }
    }
  }

  const handleSelectImage = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
    })
    if (result.canceled) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      const fileName = filePath.split(/[\\/]/).pop()
      setImage({
        name: fileName,
        data: fileResult.data,
      })
    }
  }

  const handleApply = async () => {
    if (!currentData) return

    if (type === 'image' && !image) {
      setStatus({ type: 'error', message: bg.needImage || '请先选择背景图片' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: bg.applying || '正在设置背景...' })

    try {
      const options = {
        type,
        opacity: parseFloat(opacity),
      }
      if (type === 'color') {
        options.color = hexToRgb(color)
      } else {
        options.imageData = image.data
        options.mode = mode
        options.scale = parseFloat(scale) || 1
      }

      const result = await addBackground(currentData, options)
      setCurrentData(result)
      setStatus({ type: 'success', message: bg.applySuccess || '背景已设置' })
    } catch (error) {
      setStatus({ type: 'error', message: (bg.applyError || '设置失败：{error}').replace('{error}', error.message) })
    }

    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: 'with-background.pdf',
    })

    if (saveResult.canceled) return

    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, currentData)
    if (writeResult.success) {
      setStatus({
        type: 'success',
        message: (bg.saveSuccess || '保存成功！文件已保存到：{path}').replace('{path}', saveResult.filePath),
      })
    } else {
      setStatus({ type: 'error', message: (bg.saveError || '保存失败：{error}').replace('{error}', writeResult.error) })
    }
  }

  const handleClear = () => {
    setFile(null)
    setCurrentData(null)
    setPageCount(0)
    setStatus(null)
    setPageImages([])
  }

  const presetColors = [
    { value: '#ffffff', label: '白' },
    { value: '#f5f5dc', label: '米色' },
    { value: '#fff8e7', label: '护眼黄' },
    { value: '#e8f4e8', label: '护眼绿' },
    { value: '#e8eef4', label: '淡蓝' },
    { value: '#f0e8f4', label: '淡紫' },
  ]

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Palette}
        title={bg.title || '背景设置'}
        description={bg.description || '给 PDF 添加纯色或图片背景，图片支持拉伸和平铺两种模式'}
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
            <FileText className="mr-1.5 h-4 w-4" />
            {bg.changeFile || '更换文件'}
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          {bg.selectFile || '选择文件'}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={processing || !currentData}>
          <Save className="mr-1.5 h-4 w-4" />
          {bg.save || '保存'}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={Palette}
          title={bg.emptyTitle || '还没有选择 PDF'}
          description={bg.emptyDescription || '选择一个 PDF 后，可以给所有页面添加背景色或背景图片'}
          actionLabel={bg.emptyActionLabel || '选择 PDF 文件'}
          onAction={handleSelectFile}
          tips={[
            bg.tip1 || '纯色背景画在内容层之下，不影响原文阅读',
            bg.tip2 || '图片背景支持拉伸铺满或平铺，可调节透明度',
            bg.tip3 || '内置护眼色预设：米色、护眼黄、护眼绿等',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={(bg.meta || '共 {total} 页').replace('{total}', pageCount)}
            onRemove={!processing ? handleClear : undefined}
          />

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[360px_1fr]">
            {/* 控制面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">{bg.settingsTitle || '背景设置'}</h3>
                <p className="text-xs text-muted-foreground">{bg.settingsDesc || '选择背景类型并调整样式'}</p>
              </div>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{bg.type || '背景类型'}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setType('color')}
                      disabled={processing}
                      className={cn(
                        'rounded-md border py-2 text-xs font-medium transition-all',
                        type === 'color'
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'hover:bg-accent'
                      )}
                    >
                      {bg.typeColor || '纯色背景'}
                    </button>
                    <button
                      onClick={() => setType('image')}
                      disabled={processing}
                      className={cn(
                        'rounded-md border py-2 text-xs font-medium transition-all',
                        type === 'image'
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'hover:bg-accent'
                      )}
                    >
                      {bg.typeImage || '图片背景'}
                    </button>
                  </div>
                </div>

                {type === 'color' ? (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm">{bg.presetColors || '预设颜色'}</Label>
                      <div className="grid grid-cols-6 gap-1.5">
                        {presetColors.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setColor(c.value)}
                            disabled={processing}
                            title={c.label}
                            className={cn(
                              'h-7 w-full rounded border transition-all',
                              color === c.value ? 'ring-2 ring-primary ring-offset-1' : 'hover:scale-105'
                            )}
                            style={{ backgroundColor: c.value }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm">{bg.color || '自定义颜色'}</Label>
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
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm">{bg.image || '背景图片'}</Label>
                      {image ? (
                        <div className="flex h-9 items-center justify-between rounded-md border px-2">
                          <span className="truncate text-xs">{image.name}</span>
                          <button
                            onClick={() => setImage(null)}
                            disabled={processing}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={handleSelectImage} disabled={processing}>
                          <ImageIcon className="mr-1.5 h-4 w-4" />
                          {bg.selectImage || '选择图片'}
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="text-sm">{bg.mode || '填充模式'}</Label>
                      <Select value={mode} onValueChange={setMode} disabled={processing}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stretch">{bg.modeStretch || '拉伸铺满'}</SelectItem>
                          <SelectItem value="tile">{bg.modeTile || '平铺重复'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <Label className="text-sm">{bg.opacity || '透明度'}</Label>
                        <Input
                          type="number"
                          min="0.05"
                          max="1"
                          step="0.05"
                          value={opacity}
                          onChange={(e) => setOpacity(e.target.value)}
                          disabled={processing}
                        />
                      </div>
                      {mode === 'tile' && (
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm">{bg.tileScale || '平铺缩放'}</Label>
                          <Input
                            type="number"
                            min="0.1"
                            max="3"
                            step="0.1"
                            value={scale}
                            onChange={(e) => setScale(e.target.value)}
                            disabled={processing}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Button onClick={handleApply} disabled={processing} className="mt-2 w-full">
                  {processing ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      {bg.applying || '设置中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      {bg.apply || '应用背景'}
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* 预览面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-medium">{bg.previewLabel || '预览（第一页）'}</span>
                {renderingPreview && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {bg.rendering || '渲染中...'}
                  </span>
                )}
              </div>
              <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
                {pageImages[0] ? (
                  <img
                    src={pageImages[0].url}
                    alt={bg.previewLabel || '预览'}
                    className="max-h-full max-w-full shadow-md"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {renderingPreview ? (bg.rendering || '渲染中...') : (bg.noPreview || '无预览')}
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

export default BackgroundPage
