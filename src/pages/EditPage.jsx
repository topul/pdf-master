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

function EditPage() {
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
        setStatus({ type: 'error', message: `加载 PDF 失败：${e.message}` })
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
      setStatus({ type: 'error', message: '请先选择要旋转的页面' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: `正在旋转 ${selectedPages.size} 页...` })

    try {
      const result = await rotatePages(currentData, Array.from(selectedPages), degrees)
      setCurrentData(result)
      const info = await getPdfInfo(result)
      setPageCount(info.pageCount)
      setStatus({ type: 'success', message: `已旋转 ${selectedPages.size} 页` })
    } catch (error) {
      setStatus({ type: 'error', message: `旋转失败：${error.message}` })
    }

    setProcessing(false)
  }

  const handleDelete = async () => {
    if (!currentData) return
    if (selectedPages.size === 0) {
      setStatus({ type: 'error', message: '请先选择要删除的页面' })
      return
    }
    if (selectedPages.size >= pageCount) {
      setStatus({ type: 'error', message: '不能删除所有页面' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: `正在删除 ${selectedPages.size} 页...` })

    try {
      const result = await deletePages(currentData, Array.from(selectedPages))
      setCurrentData(result)
      const info = await getPdfInfo(result)
      setPageCount(info.pageCount)
      setSelectedPages(new Set())
      setStatus({ type: 'success', message: `已删除，剩余 ${info.pageCount} 页` })
    } catch (error) {
      setStatus({ type: 'error', message: `删除失败：${error.message}` })
    }

    setProcessing(false)
  }

  const handleExtract = async () => {
    if (!currentData) return
    if (selectedPages.size === 0) {
      setStatus({ type: 'error', message: '请先选择要提取的页面' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: `正在提取 ${selectedPages.size} 页...` })

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
          message: `提取成功！共 ${selectedPages.size} 页，已保存到：${saveResult.filePath}`,
        })
      } else {
        setStatus({ type: 'error', message: `保存失败：${writeResult.error}` })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `提取失败：${error.message}` })
    }

    setProcessing(false)
  }

  const handleReorder = async () => {
    if (!currentData) return
    if (!newOrder.trim()) {
      setStatus({ type: 'error', message: '请输入新的页面顺序' })
      return
    }

    const order = newOrder
      .split(',')
      .map((s) => parseInt(s.trim(), 10) - 1)
      .filter((n) => !isNaN(n) && n >= 0 && n < pageCount)

    if (order.length !== pageCount) {
      setStatus({
        type: 'error',
        message: `页码数量不匹配。PDF 共 ${pageCount} 页，请提供 ${pageCount} 个页码`,
      })
      return
    }

    const unique = new Set(order)
    if (unique.size !== pageCount) {
      setStatus({ type: 'error', message: '页码不能重复' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在重新排序页面...' })

    try {
      const result = await reorderPages(currentData, order)
      setCurrentData(result)
      setSelectedPages(new Set())
      setNewOrder('')
      setStatus({ type: 'success', message: '页面已重新排序' })
    } catch (error) {
      setStatus({ type: 'error', message: `排序失败：${error.message}` })
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
        message: `保存成功！文件已保存到：${saveResult.filePath}`,
      })
    } else {
      setStatus({ type: 'error', message: `保存失败：${writeResult.error}` })
    }
  }

  const handleReset = async () => {
    if (!file) return
    setCurrentData(file.data)
    setPageCount(file.pageCount)
    setSelectedPages(new Set())
    setStatus({ type: 'info', message: '已重置为原始文件' })
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
    { key: 'rotate', label: '旋转', icon: RotateCw },
    { key: 'delete', label: '删除', icon: Trash2 },
    { key: 'extract', label: '提取', icon: FileOutput },
    { key: 'reorder', label: '排序', icon: ListOrdered },
  ]

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={PencilLine}
        title="编辑 PDF"
        description="旋转、删除、提取和重新排序 PDF 页面，支持实时预览"
      >
        {file && (
          <>
            <Button variant="outline" size="sm" onClick={handleReset} disabled={processing}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              重置
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
              <FileText className="mr-1.5 h-4 w-4" />
              更换文件
            </Button>
          </>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          选择文件
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={processing || !currentData}
        >
          <Save className="mr-1.5 h-4 w-4" />
          保存
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={PencilLine}
          title="还没有选择 PDF"
          description="选择一个 PDF 后，可以在此页面进行旋转、删除、提取和重新排序等编辑操作"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            '可点击缩略图选择一个或多个页面',
            '所有操作都会实时反映在预览中',
            '编辑完成后点击“保存”导出新文件',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={`共 ${pageCount} 页 · 已选 ${selectedPages.size} 页`}
            onRemove={!processing ? handleClear : undefined}
          />

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_320px]">
            {/* 缩略图面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-medium">页面预览</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllPages}
                    disabled={processing}
                    className="h-7 px-2 text-xs"
                  >
                    全选
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllPages}
                    disabled={processing}
                    className="h-7 px-2 text-xs"
                  >
                    取消
                  </Button>
                  <div className="mx-1 h-4 w-px bg-border" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewScale(Math.max(0.2, previewScale - 0.1))}
                    disabled={processing}
                    title="缩小"
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
                    title="放大"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-muted/30 p-4">
                {renderingPreview ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">渲染预览中...</span>
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
                                alt={`第 ${i + 1} 页`}
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
                <h3 className="text-sm font-medium">编辑工具</h3>
                <p className="text-xs text-muted-foreground">
                  已选择 {selectedPages.size} 页
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
                        <h4 className="text-sm font-medium">旋转页面</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          将选中的页面旋转 90° 或 180°
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
                          <span className="text-xs">逆时针 90°</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotate(90)}
                          disabled={processing || selectedPages.size === 0}
                          className="flex flex-col items-center gap-1 py-3"
                        >
                          <RotateCw className="h-5 w-5" />
                          <span className="text-xs">顺时针 90°</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRotate(180)}
                          disabled={processing || selectedPages.size === 0}
                          className="flex flex-col items-center gap-1 py-3"
                        >
                          <RotateCw className="h-5 w-5" />
                          <span className="text-xs">180°</span>
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="delete" className="mt-0">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="text-sm font-medium">删除页面</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          删除选中的页面（不可恢复，建议先备份）
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
                        删除选中的 {selectedPages.size} 页
                      </Button>
                      {selectedPages.size >= pageCount && selectedPages.size > 0 && (
                        <p className="text-xs text-amber-600">不能删除所有页面</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="extract" className="mt-0">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="text-sm font-medium">提取页面</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          将选中的页面提取为新的 PDF 文件
                        </p>
                      </div>
                      <Button
                        onClick={handleExtract}
                        disabled={processing || selectedPages.size === 0}
                      >
                        <FileOutput className="mr-1.5 h-4 w-4" />
                        提取选中的 {selectedPages.size} 页
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="reorder" className="mt-0">
                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="text-sm font-medium">重新排序</h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          输入新的页面顺序，用逗号分隔页码（从 1 开始）
                        </p>
                      </div>
                      <Textarea
                        value={newOrder}
                        onChange={(e) => setNewOrder(e.target.value)}
                        placeholder={`例如：3, 1, 2, 5, 4（共 ${pageCount} 页）`}
                        rows={4}
                        disabled={processing}
                      />
                      <Button
                        onClick={handleReorder}
                        disabled={processing || !newOrder.trim()}
                      >
                        <ListOrdered className="mr-1.5 h-4 w-4" />
                        应用排序
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
