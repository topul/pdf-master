import React, { useState, useEffect, useRef } from 'react'
import {
  Type,
  FileText,
  Save,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MousePointerClick,
  Loader2,
  Info,
} from 'lucide-react'
import { getPdfInfo, addText, renderPdfToImages } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'

function TextPage() {
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageImages, setPageImages] = useState([])
  const [selectedPageIndex, setSelectedPageIndex] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [renderingPreview, setRenderingPreview] = useState(false)

  const [text, setText] = useState('在此输入文字')
  const [fontSize, setFontSize] = useState(16)
  const [color, setColor] = useState('#000000')
  const [clickPos, setClickPos] = useState(null)
  const previewRef = useRef(null)

  const renderPreview = async (data) => {
    if (!data) return
    setRenderingPreview(true)
    try {
      const images = await renderPdfToImages(data, 1.2)
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
        setSelectedPageIndex(0)
        setClickPos(null)
        setStatus(null)
      } catch (e) {
        setStatus({ type: 'error', message: `加载 PDF 失败：${e.message}` })
      }
    }
  }

  const handlePageClick = (e) => {
    if (!pageImages[selectedPageIndex]) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const img = pageImages[selectedPageIndex]
    const scaleX = img.width / rect.width
    const scaleY = img.height / rect.height

    const pdfX = clickX * scaleX
    const pdfY = img.height - clickY * scaleY

    setClickPos({ x: pdfX, y: pdfY, displayX: clickX, displayY: clickY })
  }

  const handleAddText = async () => {
    if (!currentData) return
    if (!text.trim()) {
      setStatus({ type: 'error', message: '请输入文字内容' })
      return
    }
    if (!clickPos) {
      setStatus({ type: 'error', message: '请在页面预览中点击选择文字位置' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在添加文字...' })

    try {
      const result = await addText(currentData, {
        pageIndex: selectedPageIndex,
        text,
        x: clickPos.x,
        y: clickPos.y,
        fontSize: parseInt(fontSize, 10),
        color: hexToRgb(color),
      })
      setCurrentData(result)
      setClickPos(null)
      setStatus({ type: 'success', message: '文字已添加，可在预览中查看效果' })
    } catch (error) {
      setStatus({ type: 'error', message: `添加失败：${error.message}` })
    }

    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: 'text-added.pdf',
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

  const handleClear = () => {
    setFile(null)
    setCurrentData(null)
    setPageCount(0)
    setSelectedPageIndex(0)
    setClickPos(null)
    setStatus(null)
    setPageImages([])
  }

  const goToPage = (delta) => {
    const next = Math.min(pageCount - 1, Math.max(0, selectedPageIndex + delta))
    setSelectedPageIndex(next)
    setClickPos(null)
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-7xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Type}
        title="添加文字"
        description="在 PDF 页面指定位置添加文字内容，点击预览图选择位置"
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
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
          icon={Type}
          title="还没有选择 PDF"
          description="选择一个 PDF 后，可以点击页面预览的任意位置叠加文字内容"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            'PDF 格式不支持修改已有文字',
            '本功能在指定位置叠加新文字',
            '添加后可继续点击其他位置添加更多文字',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={`共 ${pageCount} 页 · 当前第 ${selectedPageIndex + 1} 页`}
            onRemove={!processing ? handleClear : undefined}
          />

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_340px]">
            {/* 预览面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <span className="text-sm font-medium">页面预览</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => goToPage(-1)}
                    disabled={selectedPageIndex === 0 || processing}
                    title="上一页"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[60px] text-center text-xs text-muted-foreground">
                    {selectedPageIndex + 1} / {pageCount}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => goToPage(1)}
                    disabled={selectedPageIndex === pageCount - 1 || processing}
                    title="下一页"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div
                className="flex flex-1 cursor-crosshair items-center justify-center overflow-auto bg-muted/30 p-4"
                onClick={handlePageClick}
                ref={previewRef}
              >
                {renderingPreview ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">渲染预览中...</span>
                  </div>
                ) : pageImages[selectedPageIndex] ? (
                  <div className="relative inline-block shadow-md">
                    <img
                      src={pageImages[selectedPageIndex].url}
                      alt={`第 ${selectedPageIndex + 1} 页`}
                      className="block max-h-full max-w-full"
                    />
                    {clickPos && (
                      <div
                        className="pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                        style={{ left: clickPos.displayX, top: clickPos.displayY }}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                          <MapPin className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">无预览</div>
                )}
              </div>

              <div className="flex items-center gap-2 border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
                <MousePointerClick className="h-3.5 w-3.5" />
                <span>
                  {clickPos
                    ? `已选择位置：(${Math.round(clickPos.x)}, ${Math.round(clickPos.y)})`
                    : '点击预览图任意位置以选择文字添加位置'}
                </span>
              </div>
            </Card>

            {/* 控制面板 */}
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b px-4 py-2.5">
                <h3 className="text-sm font-medium">文字设置</h3>
                <p className="text-xs text-muted-foreground">配置文字内容与样式</p>
              </div>

              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm">文字内容</Label>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    placeholder="在此输入要添加的文字"
                    disabled={processing}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">字号</Label>
                    <Input
                      type="number"
                      min="8"
                      max="72"
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      disabled={processing}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm">颜色</Label>
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
                </div>

                <Button
                  onClick={handleAddText}
                  disabled={processing || !text.trim() || !clickPos}
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      添加中...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1.5 h-4 w-4" />
                      添加文字
                    </>
                  )}
                </Button>

                <div className="mt-2 flex gap-2 rounded-md border bg-muted/30 p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">
                    <p>字号以 PDF 坐标系单位为准，与显示像素有差异。建议先小范围测试再批量添加。</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default TextPage
