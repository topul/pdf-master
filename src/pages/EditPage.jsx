import React, { useState, useEffect } from 'react'
import {
  PencilLine,
  FileText,
  RotateCw,
  RotateCcw,
  Trash2,
  FileOutput,
  ListOrdered,
  Save,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Loader2,
} from 'lucide-react'
import {
  getPdfInfo,
  rotatePages,
  deletePages,
  extractPages,
  reorderPages,
  renderPdfToImages,
} from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'
import useDragDrop from '../hooks/useDragDrop.js'
import { useTranslations } from '@/hooks/useLocale.jsx'

function EditPage() {
  const t = useTranslations()
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [selectedPages, setSelectedPages] = useState(new Set())
  const [pageCount, setPageCount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('rotate')
  const [newOrder, setNewOrder] = useState('')
  const [pageImages, setPageImages] = useState([])
  const [renderingPreview, setRenderingPreview] = useState(false)
  const [previewScale, setPreviewScale] = useState(0.5)

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
        setSelectedPages(new Set())
        setStatus(null)
      } catch (e) {
        setStatus({ type: 'error', message: (t.edit.loadError || '加载 PDF 失败：{error}').replace('{error}', e.message) })
      }
    }
  }

  const togglePageSelection = (pageIndex) => {
    const newSelection = new Set(selectedPages)
    if (newSelection.has(pageIndex)) {
      newSelection.delete(pageIndex)
    } else {
      newSelection.add(pageIndex)
    }
    setSelectedPages(newSelection)
  }

  const selectAllPages = () => {
    const all = new Set()
    for (let i = 0; i < pageCount; i++) {
      all.add(i)
    }
    setSelectedPages(all)
  }

  const deselectAllPages = () => {
    setSelectedPages(new Set())
  }

  const handleRotate = async (degrees) => {
    if (!currentData) return
    if (selectedPages.size === 0) {
      setStatus({ type: 'error', message: t.edit.selectRotateError || '请先选择要旋转的页面' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: (t.edit.rotatingStatus || '正在旋转 {count} 页...').replace('{count}', selectedPages.size) })

    try {
      const result = await rotatePages(currentData, Array.from(selectedPages), degrees)
      setCurrentData(result)
      const info = await getPdfInfo(result)
      setPageCount(info.pageCount)
      setStatus({ type: 'success', message: (t.edit.rotateSuccess || '已旋转 {count} 页').replace('{count}', selectedPages.size) })
    } catch (error) {
      setStatus({ type: 'error', message: (t.edit.rotateError || '旋转失败：{error}').replace('{error}', error.message) })
    }

    setProcessing(false)
  }

  const handleDelete = async () => {
    if (!currentData) return
    if (selectedPages.size === 0) {
      setStatus({ type: 'error', message: t.edit.selectDeleteError || '请先选择要删除的页面' })
      return
    }
    if (selectedPages.size >= pageCount) {
      setStatus({ type: 'error', message: t.edit.deleteAllError || '不能删除所有页面' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: (t.edit.deletingStatus || '正在删除 {count} 页...').replace('{count}', selectedPages.size) })

    try {
      const result = await deletePages(currentData, Array.from(selectedPages))
      setCurrentData(result)
      const info = await getPdfInfo(result)
      setPageCount(info.pageCount)
      setSelectedPages(new Set())
      setStatus({ type: 'success', message: (t.edit.deleteSuccess || '已删除，剩余 {count} 页').replace('{count}', info.pageCount) })
    } catch (error) {
      setStatus({ type: 'error', message: (t.edit.deleteError || '删除失败：{error}').replace('{error}', error.message) })
    }

    setProcessing(false)
  }

  const handleExtract = async () => {
    if (!currentData) return
    if (selectedPages.size === 0) {
      setStatus({ type: 'error', message: t.edit.selectExtractError || '请先选择要提取的页面' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: (t.edit.extractingStatus || '正在提取 {count} 页...').replace('{count}', selectedPages.size) })

    try {
      const result = await extractPages(
        currentData,
        Array.from(selectedPages).sort((a, b) => a - b)
      )

      const saveResult = await window.electronAPI.saveFile({
        defaultPath: 'extracted.pdf',
      })

      if (saveResult.canceled) {
        setProcessing(false)
        setStatus(null)
        return
      }

      const writeResult = await window.electronAPI.writeFile(saveResult.filePath, result)
      if (writeResult.success) {
        setStatus({
          type: 'success',
          message: (t.edit.extractSuccess || '提取成功！共 {count} 页，已保存到：{path}')
            .replace('{count}', selectedPages.size)
            .replace('{path}', saveResult.filePath),
        })
      } else {
        setStatus({ type: 'error', message: (t.edit.saveError || '保存失败：{error}').replace('{error}', writeResult.error) })
      }
    } catch (error) {
      setStatus({ type: 'error', message: (t.edit.extractError || '提取失败：{error}').replace('{error}', error.message) })
    }

    setProcessing(false)
  }

  const handleReorder = async () => {
    if (!currentData) return
    if (!newOrder.trim()) {
      setStatus({ type: 'error', message: t.edit.reorderEmptyError || '请输入新的页面顺序' })
      return
    }

    const order = newOrder
      .split(',')
      .map((s) => parseInt(s.trim(), 10) - 1)
      .filter((n) => !isNaN(n) && n >= 0 && n < pageCount)

    if (order.length !== pageCount) {
      setStatus({
        type: 'error',
        message: (t.edit.reorderCountError || '页码数量不匹配。PDF 共 {total} 页，请提供 {total} 个页码')
          .replace(/\{total\}/g, pageCount),
      })
      return
    }

    const unique = new Set(order)
    if (unique.size !== pageCount) {
      setStatus({ type: 'error', message: t.edit.reorderDuplicateError || '页码不能重复' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: t.edit.reorderingStatus || '正在重新排序页面...' })

    try {
      const result = await reorderPages(currentData, order)
      setCurrentData(result)
      setSelectedPages(new Set())
      setNewOrder('')
      setStatus({ type: 'success', message: t.edit.reorderSuccess || '页面已重新排序' })
    } catch (error) {
      setStatus({ type: 'error', message: (t.edit.reorderError || '排序失败：{error}').replace('{error}', error.message) })
    }

    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: 'edited.pdf',
    })

    if (saveResult.canceled) return

    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, currentData)
    if (writeResult.success) {
      setStatus({
        type: 'success',
        message: (t.edit.saveSuccess || '保存成功！文件已保存到：{path}').replace('{path}', saveResult.filePath),
      })
    } else {
      setStatus({ type: 'error', message: (t.edit.saveError || '保存失败：{error}').replace('{error}', writeResult.error) })
    }
  }

  const handleReset = async () => {
    if (!file) return
    setCurrentData(file.data)
    setPageCount(file.pageCount)
    setSelectedPages(new Set())
    setStatus({ type: 'info', message: t.edit.resetStatus || '已重置为原始文件' })
  }

  const handleClear = () => {
    setFile(null)
    setCurrentData(null)
    setPageCount(0)
    setSelectedPages(new Set())
    setStatus(null)
    setPageImages([])
  }

  const tabsConfig = [
    { key: 'rotate', label: t.edit.tabRotate || '旋转', icon: RotateCw },
    { key: 'delete', label: t.edit.tabDelete || '删除', icon: Trash2 },
    { key: 'extract', label: t.edit.tabExtract || '提取', icon: FileOutput },
    { key: 'reorder', label: t.edit.tabReorder || '排序', icon: ListOrdered },
  ]

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={PencilLine}
        title={t.edit.title || '编辑 PDF'}
        description={t.edit.pageDescription || '旋转、删除、提取和重新排序 PDF 页面，支持实时预览'}
      >
        {file && (
          <>
            <Button variant="outline" size="sm" onClick={handleReset} disabled={processing}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              {t.edit.resetButton || '重置'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
              <FileText className="mr-1.5 h-4 w-4" />
              {t.edit.changeFile || '更换文件'}
            </Button>
          </>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          {t.edit.selectFileButton || '选择文件'}
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={processing || !currentData}
        >
          <Save className="mr-1.5 h-4 w-4" />
          {t.edit.saveButton || '保存'}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={PencilLine}
          title={t.edit.emptyTitle || '还没有选择 PDF'}
          description={t.edit.emptyDescription || '选择一个 PDF 后，可以在此页面进行旋转、删除、提取和重新排序等编辑操作'}
          actionLabel={t.edit.emptyActionLabel || '选择 PDF 文件'}
          onAction={handleSelectFile}
          tips={[
            t.edit.tip1 || '可点击缩略图选择一个或多个页面',
            t.edit.tip2 || '所有操作都会实时反映在预览中',
            t.edit.tip3 || '编辑完成后点击“保存”导出新文件',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={(t.edit.metaText || '共 {total} 页 · 已选 {selected} 页')
              .replace('{total}', pageCount)
              .replace('{selected}', selectedPages.size)}
            onRemove={!processing ? handleClear : undefined}
          />

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_320px]">
            {/* 缩略图面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-medium">{t.edit.pagePreview || '页面预览'}</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllPages}
                    disabled={processing}
                    className="h-7 px-2 text-xs"
                  >
                    {t.edit.selectAll || '全选'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllPages}
                    disabled={processing}
                    className="h-7 px-2 text-xs"
                  >
                    {t.edit.deselect || '取消'}
                  </Button>
                  <div className="mx-1 h-4 w-px bg-border" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewScale(Math.max(0.2, previewScale - 0.1))}
                    disabled={processing}
                    title={t.edit.zoomOut || '缩小'}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center text-xs text-muted-foreground">
                    {Math.round(previewScale * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewScale(Math.min(1.5, previewScale + 0.1))}
                    disabled={processing}
                    title={t.edit.zoomIn || '放大'}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-muted/30 p-4">
                {renderingPreview ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">{t.edit.renderingPreview || '渲染预览中...'}</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                    {(pageImages.length > 0
                      ? pageImages
                      : Array.from({ length: pageCount }, () => ({ url: null }))
                    ).map((img, i) => {
                      const selected = selectedPages.has(i)
                      return (
                        <button
                          key={i}
                          onClick={() => togglePageSelection(i)}
                          className={cn(
                            'group relative overflow-hidden rounded-md border-2 bg-white shadow-sm transition-all hover:shadow-md',
                            selected
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-transparent'
                          )}
                        >
                          <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
                            {img?.url ? (
                              <img
                                src={img.url}
                                alt={(t.edit.pageAlt || '第 {n} 页').replace('{n}', i + 1)}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                                <FileText className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <div
                            className={cn(
                              'absolute left-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-medium',
                              selected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-black/60 text-white'
                            )}
                          >
                            {i + 1}
                          </div>
                          {selected && (
                            <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* 工具面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">{t.edit.editTools || '编辑工具'}</h3>
                <p className="text-xs text-muted-foreground">
                  {(t.edit.selectedPagesText || '已选择 {count} 页').replace('{count}', selectedPages.size)}
                </p>
              </div>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <TabsList className="m-3 grid grid-cols-4">
                  {tabsConfig.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <TabsTrigger
                        key={tab.key}
                        value={tab.key}
                        className="flex flex-col items-center gap-1 py-2 text-xs"
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  <TabsContent value="rotate" className="mt-0">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="text-sm font-medium">{t.edit.rotateTitle || '旋转页面'}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t.edit.rotateDesc || '将选中的页面旋转 90° 或 180°'}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotate(-90)}
                          disabled={processing || selectedPages.size === 0}
                          className="flex flex-col items-center gap-1 py-3"
                        >
                          <RotateCcw className="h-5 w-5" />
                          <span className="text-xs">{t.edit.rotateCCW || '逆时针 90°'}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotate(90)}
                          disabled={processing || selectedPages.size === 0}
                          className="flex flex-col items-center gap-1 py-3"
                        >
                          <RotateCw className="h-5 w-5" />
                          <span className="text-xs">{t.edit.rotateCW || '顺时针 90°'}</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotate(180)}
                          disabled={processing || selectedPages.size === 0}
                          className="flex flex-col items-center gap-1 py-3"
                        >
                          <RotateCw className="h-5 w-5" />
                          <span className="text-xs">{t.edit.rotate180 || '180°'}</span>
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="delete" className="mt-0">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="text-sm font-medium">{t.edit.deleteTitle || '删除页面'}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t.edit.deleteDesc || '删除选中的页面（不可恢复，建议先备份）'}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={
                          processing ||
                          selectedPages.size === 0 ||
                          selectedPages.size >= pageCount
                        }
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        {(t.edit.deleteButton || '删除选中的 {count} 页').replace('{count}', selectedPages.size)}
                      </Button>
                      {selectedPages.size >= pageCount && selectedPages.size > 0 && (
                        <p className="text-xs text-amber-600">{t.edit.deleteAllWarning || '不能删除所有页面'}</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="extract" className="mt-0">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="text-sm font-medium">{t.edit.extractTitle || '提取页面'}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t.edit.extractDesc || '将选中的页面提取为新的 PDF 文件'}
                        </p>
                      </div>
                      <Button
                        onClick={handleExtract}
                        disabled={processing || selectedPages.size === 0}
                      >
                        <FileOutput className="mr-1.5 h-4 w-4" />
                        {(t.edit.extractButton || '提取选中的 {count} 页').replace('{count}', selectedPages.size)}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="reorder" className="mt-0">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="text-sm font-medium">{t.edit.reorderTitle || '重新排序'}</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t.edit.reorderDesc || '输入新的页面顺序，用逗号分隔页码（从 1 开始）'}
                        </p>
                      </div>
                      <Textarea
                        value={newOrder}
                        onChange={(e) => setNewOrder(e.target.value)}
                        placeholder={(t.edit.reorderPlaceholder || '例如：3, 1, 2, 5, 4（共 {count} 页）').replace('{count}', pageCount)}
                        rows={4}
                        disabled={processing}
                      />
                      <Button
                        onClick={handleReorder}
                        disabled={processing || !newOrder.trim()}
                      >
                        <ListOrdered className="mr-1.5 h-4 w-4" />
                        {t.edit.applyReorder || '应用排序'}
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditPage
