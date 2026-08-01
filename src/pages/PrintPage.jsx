import React, { useState, useEffect } from 'react'
import {
  Printer,
  FileText,
  Loader2,
  Info,
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
import useDragDrop from '../hooks/useDragDrop.js'
import { useAutoLoadCurrentFile } from '@/hooks/useCurrentFile.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'

function PrintPage() {
  const t = useTranslations()
  useAutoLoadCurrentFile()
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageImages, setPageImages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [renderingPreview, setRenderingPreview] = useState(false)
  const [printRange, setPrintRange] = useState('all')
  const [customRange, setCustomRange] = useState('')

  useDragDrop((droppedFiles) => {
    if (droppedFiles.length > 0) {
      setFile(droppedFiles[0])
      setStatus(null)
    }
  })

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
        setStatus({ type: 'error', message: (t.printPage.loadError || '加载 PDF 失败：{error}').replace('{error}', e.message) })
      }
    }
  }

  const parsePrintRange = () => {
    if (printRange === 'all') {
      return Array.from({ length: pageCount }, (_, i) => i)
    }
    if (printRange === 'custom' && customRange.trim()) {
      const indices = []
      const parts = customRange.split(',')
      for (const part of parts) {
        const trimmed = part.trim()
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map((s) => parseInt(s.trim(), 10))
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start - 1; i < end && i < pageCount; i++) {
              if (i >= 0) indices.push(i)
            }
          }
        } else {
          const num = parseInt(trimmed, 10)
          if (!isNaN(num) && num >= 1 && num <= pageCount) {
            indices.push(num - 1)
          }
        }
      }
      return indices
    }
    return Array.from({ length: pageCount }, (_, i) => i)
  }

  const handlePrint = async () => {
    if (!currentData) return

    setProcessing(true)
    setStatus({ type: 'info', message: t.printPage.preparingStatus || '正在准备打印...' })

    try {
      const indices = parsePrintRange()
      if (indices.length === 0) {
        setStatus({ type: 'error', message: t.printPage.noPagesError || '没有可打印的页面，请检查打印范围' })
        setProcessing(false)
        return
      }

      const images = await renderPdfToImages(currentData, 2.0)
      const selectedImages = indices.map((i) => images[i]).filter(Boolean)

      if (selectedImages.length === 0) {
        setStatus({ type: 'error', message: t.printPage.generateContentError || '无法生成打印内容' })
        setProcessing(false)
        return
      }

      const printTitle = (t.printPage.printTitle || '打印 - {name}').replace('{name}', file.name)
      const printContent = `
        <html>
          <head>
            <title>${printTitle}</title>
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 0; }
              .page { page-break-after: always; text-align: center; }
              .page:last-child { page-break-after: auto; }
              img { max-width: 100%; max-height: 100vh; }
            </style>
          </head>
          <body>
            ${selectedImages.map((img) => `<div class="page"><img src="${img.url}" /></div>`).join('')}
          </body>
        </html>
      `

      const printFrame = document.createElement('iframe')
      printFrame.style.position = 'fixed'
      printFrame.style.right = '0'
      printFrame.style.bottom = '0'
      printFrame.style.width = '0'
      printFrame.style.height = '0'
      printFrame.style.border = '0'
      document.body.appendChild(printFrame)

      printFrame.onload = () => {
        try {
          printFrame.contentWindow.print()
          setTimeout(() => {
            document.body.removeChild(printFrame)
          }, 1000)
        } catch (e) {
          console.error('打印失败:', e)
        }
      }

      printFrame.srcdoc = printContent
      setStatus({ type: 'success', message: t.printPage.printDialogOpened || '打印对话框已打开，请在系统对话框中确认打印' })
    } catch (error) {
      setStatus({ type: 'error', message: (t.printPage.printError || '打印失败：{error}').replace('{error}', error.message) })
    }

    setProcessing(false)
  }

  const handleClear = () => {
    setFile(null)
    setCurrentData(null)
    setPageCount(0)
    setStatus(null)
    setPageImages([])
  }

  const rangeOptions = [
    { value: 'all', label: t.printPage.rangeAll || '全部页面', desc: (t.printPage.rangeAllDesc || '共 {count} 页').replace('{count}', pageCount) },
    { value: 'custom', label: t.printPage.rangeCustom || '自定义范围', desc: t.printPage.rangeCustomDesc || '指定页码或范围' },
  ]

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Printer}
        title={t.printPage.title || '打印 PDF'}
        description={t.printPage.description || '预览并打印 PDF 文件，支持选择打印范围'}
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
            <FileText className="mr-1.5 h-4 w-4" />
            {t.printPage.changeFile || '更换文件'}
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          {t.printPage.selectFile || '选择文件'}
        </Button>
        <Button size="sm" onClick={handlePrint} disabled={processing || !currentData}>
          {processing ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              {t.printPage.preparing || '准备中...'}
            </>
          ) : (
            <>
              <Printer className="mr-1.5 h-4 w-4" />
              {t.printPage.print || '打印'}
            </>
          )}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={Printer}
          title={t.printPage.emptyTitle || '还没有选择 PDF'}
          description={t.printPage.emptyDescription || '选择一个 PDF 后，可预览页面内容并调用系统打印对话框'}
          actionLabel={t.printPage.emptyActionLabel || '选择 PDF 文件'}
          onAction={handleSelectFile}
          tips={[
            t.printPage.tip1 || '支持打印全部页面或自定义范围',
            t.printPage.tip2 || '范围格式：1-3, 5, 8-10',
            t.printPage.tip3 || '点击“打印”后将弹出系统打印对话框',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={(t.printPage.metaPages || '共 {count} 页').replace('{count}', pageCount)}
            onRemove={!processing ? handleClear : undefined}
          />

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[320px_1fr]">
            {/* 打印选项 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">{t.printPage.rangeTitle || '打印范围'}</h3>
                <p className="text-xs text-muted-foreground">{t.printPage.rangeDesc || '选择需要打印的页面'}</p>
              </div>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col gap-2">
                  {rangeOptions.map((opt) => {
                    const active = printRange === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setPrintRange(opt.value)}
                        disabled={processing}
                        className={cn(
                          'flex items-center justify-between rounded-lg border p-3 text-left transition-all',
                          active
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-accent/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'flex h-3.5 w-3.5 items-center justify-center rounded-full border-2',
                              active ? 'border-primary' : 'border-muted-foreground/40'
                            )}
                          >
                            {active && (
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                          </span>
                          <div>
                            <div className="text-sm font-medium">{opt.label}</div>
                            <div className="text-xs text-muted-foreground">{opt.desc}</div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {printRange === 'custom' && (
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">{t.printPage.pageRangeLabel || '页码范围'}</Label>
                    <Input
                      type="text"
                      value={customRange}
                      onChange={(e) => setCustomRange(e.target.value)}
                      placeholder={t.printPage.pageRangePlaceholder || '例如：1-3, 5, 8-10'}
                      disabled={processing}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.printPage.pageRangeHint || '支持单页与范围，多个用英文逗号分隔'}
                    </p>
                  </div>
                )}

                <div className="mt-auto flex gap-2 rounded-md border bg-muted/30 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">
                    {t.printPage.printHint || '点击“打印”按钮后将调用系统打印对话框，可在对话框中选择打印机、纸张、份数等参数。'}
                  </div>
                </div>
              </div>
            </Card>

            {/* 预览面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-medium">{t.printPage.pagePreview || '页面预览'}</span>
                {renderingPreview && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t.printPage.rendering || '渲染中...'}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto bg-muted/30 p-4">
                {pageImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {pageImages.map((img, i) => (
                      <div
                        key={i}
                        className="overflow-hidden rounded-md border bg-white shadow-sm"
                      >
                        <div className="aspect-[3/4] w-full">
                          <img
                            src={img.url}
                            alt={(t.printPage.pageAlt || '第 {n} 页').replace('{n}', i + 1)}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="border-t px-2 py-1 text-center text-xs text-muted-foreground">
                          {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {renderingPreview ? (t.printPage.rendering || '渲染中...') : (t.printPage.noPreview || '无预览')}
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

export default PrintPage
