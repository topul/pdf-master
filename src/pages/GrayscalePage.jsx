import React, { useState, useEffect } from 'react'
import {
  Contrast,
  FileText,
  Save,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { getPdfInfo, convertToGrayscale, renderPdfToImages } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'
import useDragDrop from '../hooks/useDragDrop.js'

function GrayscalePage() {
  const t = useTranslations()
  const gs = t.grayscalePage || {}
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageImages, setPageImages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [renderingPreview, setRenderingPreview] = useState(false)
  const [progress, setProgress] = useState(null)

  useDragDrop((droppedFiles) => {
    if (droppedFiles.length > 0) {
      setFile(droppedFiles[0])
      setStatus(null)
    }
  })

  const [mode, setMode] = useState('grayscale')
  const [scale, setScale] = useState(2)
  const [bwThreshold, setBwThreshold] = useState(180)

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
        setStatus({ type: 'error', message: (gs.loadError || '加载 PDF 失败：{error}').replace('{error}', e.message) })
      }
    }
  }

  const handleApply = async () => {
    if (!currentData) return

    setProcessing(true)
    setProgress({ current: 0, total: pageCount })
    setStatus({ type: 'info', message: gs.converting || '正在转换...' })

    try {
      const result = await convertToGrayscale(currentData, {
        mode,
        scale: parseFloat(scale) || 2,
        bwThreshold: parseInt(bwThreshold, 10),
        onProgress: (current, total) => setProgress({ current, total }),
      })
      setCurrentData(result)
      setStatus({ type: 'success', message: gs.convertSuccess || '转换完成' })
    } catch (error) {
      setStatus({ type: 'error', message: (gs.convertError || '转换失败：{error}').replace('{error}', error.message) })
    }

    setProgress(null)
    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: 'grayscale.pdf',
    })

    if (saveResult.canceled) return

    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, currentData)
    if (writeResult.success) {
      setStatus({
        type: 'success',
        message: (gs.saveSuccess || '保存成功！文件已保存到：{path}').replace('{path}', saveResult.filePath),
      })
    } else {
      setStatus({ type: 'error', message: (gs.saveError || '保存失败：{error}').replace('{error}', writeResult.error) })
    }
  }

  const handleClear = () => {
    setFile(null)
    setCurrentData(null)
    setPageCount(0)
    setStatus(null)
    setPageImages([])
    setProgress(null)
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Contrast}
        title={gs.title || '灰度 / 黑白化'}
        description={gs.description || '将彩色 PDF 转为灰度或纯黑白，方便打印节省墨水'}
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
            <FileText className="mr-1.5 h-4 w-4" />
            {gs.changeFile || '更换文件'}
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          {gs.selectFile || '选择文件'}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={processing || !currentData}>
          <Save className="mr-1.5 h-4 w-4" />
          {gs.save || '保存'}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {progress && (
        <div className="flex items-center gap-3">
          <Progress value={(progress.current / progress.total) * 100} className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {progress.current} / {progress.total}
          </span>
        </div>
      )}

      {!file ? (
        <EmptyState
          icon={Contrast}
          title={gs.emptyTitle || '还没有选择 PDF'}
          description={gs.emptyDescription || '选择一个 PDF 后，可以将其转为灰度或纯黑白模式'}
          actionLabel={gs.emptyActionLabel || '选择 PDF 文件'}
          onAction={handleSelectFile}
          tips={[
            gs.tip1 || '灰度模式保留层次，黑白模式只有纯黑纯白',
            gs.tip2 || '黑白模式可调节阈值，控制文字与背景的分离度',
            gs.tip3 || '转换后文字不可选中（基于页面渲染），扫描件同样适用',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={(gs.meta || '共 {total} 页').replace('{total}', pageCount)}
            onRemove={!processing ? handleClear : undefined}
          />

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[360px_1fr]">
            {/* 控制面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">{gs.settingsTitle || '转换设置'}</h3>
                <p className="text-xs text-muted-foreground">{gs.settingsDesc || '选择灰度或黑白模式'}</p>
              </div>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{gs.mode || '转换模式'}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMode('grayscale')}
                      disabled={processing}
                      className={cn(
                        'rounded-md border py-2 text-xs font-medium transition-all',
                        mode === 'grayscale'
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'hover:bg-accent'
                      )}
                    >
                      {gs.modeGrayscale || '灰度'}
                    </button>
                    <button
                      onClick={() => setMode('bw')}
                      disabled={processing}
                      className={cn(
                        'rounded-md border py-2 text-xs font-medium transition-all',
                        mode === 'bw'
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'hover:bg-accent'
                      )}
                    >
                      {gs.modeBw || '纯黑白'}
                    </button>
                  </div>
                </div>

                {mode === 'bw' && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">{gs.bwThreshold || '黑白阈值（0-255）'}</Label>
                    <Input
                      type="number"
                      min="0"
                      max="255"
                      value={bwThreshold}
                      onChange={(e) => setBwThreshold(e.target.value)}
                      disabled={processing}
                    />
                    <p className="text-xs text-muted-foreground">
                      {gs.bwThresholdHint || '值越小保留越多内容，值越大画面越干净'}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label className="text-sm">{gs.scale || '输出清晰度'}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    step="0.5"
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    disabled={processing}
                  />
                  <p className="text-xs text-muted-foreground">
                    {gs.scaleHint || '倍数越大越清晰，文件体积也越大（建议 2）'}
                  </p>
                </div>

                <Button onClick={handleApply} disabled={processing} className="mt-2 w-full">
                  {processing ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      {gs.converting || '转换中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      {gs.convert || '开始转换'}
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* 预览面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-medium">{gs.previewLabel || '预览（第一页）'}</span>
                {renderingPreview && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {gs.rendering || '渲染中...'}
                  </span>
                )}
              </div>
              <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-4">
                {pageImages[0] ? (
                  <img
                    src={pageImages[0].url}
                    alt={gs.previewLabel || '预览'}
                    className="max-h-full max-w-full shadow-md"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {renderingPreview ? (gs.rendering || '渲染中...') : (gs.noPreview || '无预览')}
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

export default GrayscalePage
