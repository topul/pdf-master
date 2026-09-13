import React, { useState, useEffect } from 'react'
import {
  LayoutTemplate,
  FileText,
  Save,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import { getPdfInfo, addHeaderFooter, renderPdfToImages } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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

function HeaderFooterPage() {
  const t = useTranslations()
  const hf = t.headerFooter || {}
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

  const [headerEnabled, setHeaderEnabled] = useState(true)
  const [headerContent, setHeaderContent] = useState('')
  const [headerPosition, setHeaderPosition] = useState('top-center')
  const [footerEnabled, setFooterEnabled] = useState(true)
  const [footerContent, setFooterContent] = useState('{page} / {total}')
  const [footerPosition, setFooterPosition] = useState('bottom-center')
  const [fontSize, setFontSize] = useState(10)
  const [color, setColor] = useState('#555555')
  const [margin, setMargin] = useState(40)
  const [logo, setLogo] = useState(null)
  const [showLogoInHeader, setShowLogoInHeader] = useState(true)

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
        setStatus({ type: 'error', message: (hf.loadError || '加载 PDF 失败：{error}').replace('{error}', e.message) })
      }
    }
  }

  const handleSelectLogo = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }],
    })
    if (result.canceled) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      const fileName = filePath.split(/[\\/]/).pop()
      setLogo({
        name: fileName,
        data: fileResult.data,
      })
    }
  }

  const handleApply = async () => {
    if (!currentData) return

    if (!headerEnabled && !footerEnabled) {
      setStatus({ type: 'error', message: hf.needOne || '请至少启用页眉或页脚' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: hf.applying || '正在添加页眉页脚...' })

    try {
      const options = {
        fontSize: parseInt(fontSize, 10),
        color: hexToRgb(color),
        margin: parseInt(margin, 10),
      }
      if (logo) {
        options.imageData = logo.data
        options.imageHeight = Math.max(parseInt(fontSize, 10) + 8, 20)
      }
      if (headerEnabled) {
        options.header = {
          content: headerContent,
          position: headerPosition,
          showImage: showLogoInHeader && !!logo,
        }
      }
      if (footerEnabled) {
        options.footer = {
          content: footerContent,
          position: footerPosition,
          showImage: false,
        }
      }

      const result = await addHeaderFooter(currentData, options)
      setCurrentData(result)
      setStatus({ type: 'success', message: hf.applySuccess || '页眉页脚已添加' })
    } catch (error) {
      setStatus({ type: 'error', message: (hf.applyError || '添加失败：{error}').replace('{error}', error.message) })
    }

    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: 'header-footer.pdf',
    })

    if (saveResult.canceled) return

    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, currentData)
    if (writeResult.success) {
      setStatus({
        type: 'success',
        message: (hf.saveSuccess || '保存成功！文件已保存到：{path}').replace('{path}', saveResult.filePath),
      })
    } else {
      setStatus({ type: 'error', message: (hf.saveError || '保存失败：{error}').replace('{error}', writeResult.error) })
    }
  }

  const handleClear = () => {
    setFile(null)
    setCurrentData(null)
    setPageCount(0)
    setStatus(null)
    setPageImages([])
  }

  const headerPositionOptions = [
    { value: 'top-left', label: hf.posTopLeft || '顶部左' },
    { value: 'top-center', label: hf.posTopCenter || '顶部居中' },
    { value: 'top-right', label: hf.posTopRight || '顶部右' },
  ]

  const footerPositionOptions = [
    { value: 'bottom-left', label: hf.posBottomLeft || '底部左' },
    { value: 'bottom-center', label: hf.posBottomCenter || '底部居中' },
    { value: 'bottom-right', label: hf.posBottomRight || '底部右' },
  ]

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={LayoutTemplate}
        title={hf.title || '页眉页脚'}
        description={hf.description || '批量添加页眉、页脚文字或图片，支持页码占位符 {page} 和 {total}'}
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
            <FileText className="mr-1.5 h-4 w-4" />
            {hf.changeFile || '更换文件'}
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          {hf.selectFile || '选择文件'}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={processing || !currentData}>
          <Save className="mr-1.5 h-4 w-4" />
          {hf.save || '保存'}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={LayoutTemplate}
          title={hf.emptyTitle || '还没有选择 PDF'}
          description={hf.emptyDescription || '选择一个 PDF 后，可以批量给每页添加页眉和页脚'}
          actionLabel={hf.emptyActionLabel || '选择 PDF 文件'}
          onAction={handleSelectFile}
          tips={[
            hf.tip1 || '页眉页脚文字支持 {page} / {total} 页码占位符',
            hf.tip2 || '页眉可附带图片 Logo（PNG/JPG）',
            hf.tip3 || '位置、字号、颜色、边距均可自定义',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={(hf.meta || '共 {total} 页').replace('{total}', pageCount)}
            onRemove={!processing ? handleClear : undefined}
          />

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[360px_1fr]">
            {/* 控制面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">{hf.settingsTitle || '页眉页脚设置'}</h3>
                <p className="text-xs text-muted-foreground">{hf.settingsDesc || '配置页眉、页脚与公共样式'}</p>
              </div>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                {/* 页眉 */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="header-enabled"
                    checked={headerEnabled}
                    onCheckedChange={(v) => setHeaderEnabled(!!v)}
                    disabled={processing}
                  />
                  <Label htmlFor="header-enabled" className="cursor-pointer text-sm font-medium">
                    {hf.headerEnabled || '启用页眉'}
                  </Label>
                </div>

                {headerEnabled && (
                  <div className="flex flex-col gap-3 rounded-md border p-3">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">{hf.headerContent || '页眉文字'}</Label>
                      <Input
                        value={headerContent}
                        onChange={(e) => setHeaderContent(e.target.value)}
                        placeholder={hf.headerPlaceholder || '例如：公司机密'}
                        disabled={processing}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">{hf.position || '位置'}</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {headerPositionOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setHeaderPosition(opt.value)}
                            disabled={processing}
                            className={cn(
                              'rounded-md border py-1.5 text-xs font-medium transition-all',
                              headerPosition === opt.value
                                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                                : 'hover:bg-accent'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {logo && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="show-logo"
                          checked={showLogoInHeader}
                          onCheckedChange={(v) => setShowLogoInHeader(!!v)}
                          disabled={processing}
                        />
                        <Label htmlFor="show-logo" className="cursor-pointer text-xs">
                          {hf.showLogo || '页眉显示 Logo'}
                        </Label>
                      </div>
                    )}
                  </div>
                )}

                {/* 页脚 */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="footer-enabled"
                    checked={footerEnabled}
                    onCheckedChange={(v) => setFooterEnabled(!!v)}
                    disabled={processing}
                  />
                  <Label htmlFor="footer-enabled" className="cursor-pointer text-sm font-medium">
                    {hf.footerEnabled || '启用页脚'}
                  </Label>
                </div>

                {footerEnabled && (
                  <div className="flex flex-col gap-3 rounded-md border p-3">
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">{hf.footerContent || '页脚文字'}</Label>
                      <Input
                        value={footerContent}
                        onChange={(e) => setFooterContent(e.target.value)}
                        placeholder="{page} / {total}"
                        disabled={processing}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-xs">{hf.position || '位置'}</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {footerPositionOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setFooterPosition(opt.value)}
                            disabled={processing}
                            className={cn(
                              'rounded-md border py-1.5 text-xs font-medium transition-all',
                              footerPosition === opt.value
                                ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                                : 'hover:bg-accent'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Logo */}
                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{hf.logo || '图片 Logo'}</Label>
                  {logo ? (
                    <div className="flex h-9 items-center justify-between rounded-md border px-2">
                      <span className="truncate text-xs">{logo.name}</span>
                      <button
                        onClick={() => setLogo(null)}
                        disabled={processing}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleSelectLogo} disabled={processing}>
                      <ImageIcon className="mr-1.5 h-4 w-4" />
                      {hf.selectLogo || '选择 Logo 图片'}
                    </Button>
                  )}
                </div>

                {/* 公共样式 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">{hf.fontSize || '字号'}</Label>
                    <Input
                      type="number"
                      min="6"
                      max="36"
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      disabled={processing}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">{hf.margin || '边距'}</Label>
                    <Input
                      type="number"
                      min="10"
                      max="100"
                      value={margin}
                      onChange={(e) => setMargin(e.target.value)}
                      disabled={processing}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{hf.color || '颜色'}</Label>
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

                <Button onClick={handleApply} disabled={processing} className="mt-2 w-full">
                  {processing ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      {hf.applying || '添加中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      {hf.apply || '添加页眉页脚'}
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* 预览面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-medium">{hf.previewLabel || '预览（第一页）'}</span>
                {renderingPreview && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {hf.rendering || '渲染中...'}
                  </span>
                )}
              </div>
              <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
                {pageImages[0] ? (
                  <img
                    src={pageImages[0].url}
                    alt={hf.previewLabel || '预览'}
                    className="max-h-full max-w-full shadow-md"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {renderingPreview ? (hf.rendering || '渲染中...') : (hf.noPreview || '无预览')}
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

export default HeaderFooterPage
