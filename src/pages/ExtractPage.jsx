import React, { useState, useRef } from 'react'
import {
  FileText,
  Save,
  Loader2,
  Image as ImageIcon,
  AlignLeft,
  Download,
  Copy,
  Check,
  FileImage,
  FolderOpen,
} from 'lucide-react'
import { extractPdfText, extractPdfImages } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function ExtractPage() {
  const [file, setFile] = useState(null)
  const [tab, setTab] = useState('text')
  const [extracting, setExtracting] = useState(false)
  const [status, setStatus] = useState(null)

  const [textResult, setTextResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const [images, setImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])

  const textScrollRef = useRef(null)

  const handleSelectFile = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })
    if (result.canceled) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      const fileName = filePath.split(/[\\/]/).pop()
      setFile({
        path: filePath,
        name: fileName,
        data: fileResult.data,
        size: fileResult.data.length,
      })
      setTextResult(null)
      setImages([])
      setImagePreviews([])
      setStatus(null)
    }
  }

  const handleExtract = async () => {
    if (!file) return
    setExtracting(true)
    setStatus({ type: 'info', message: tab === 'text' ? '正在提取文字...' : '正在提取图片...' })

    try {
      if (tab === 'text') {
        const result = await extractPdfText(file.data)
        setTextResult(result)
        setStatus({
          type: 'success',
          message: `提取完成！共 ${result.pageCount} 页，${result.fullText.length} 字`,
        })
      } else {
        const imgs = await extractPdfImages(file.data)
        setImages(imgs)

        // 生成预览 URL（jpeg 直接用，其他格式尝试 Blob）
        const previews = imgs.map((img) => {
          if (img.format === 'jpeg') {
            const blob = new Blob([new Uint8Array(img.data)], { type: 'image/jpeg' })
            return URL.createObjectURL(blob)
          }
          return null
        })
        setImagePreviews(previews)

        if (imgs.length === 0) {
          setStatus({ type: 'info', message: '未在 PDF 中找到嵌入图片' })
        } else {
          const jpgCount = imgs.filter((i) => i.format === 'jpeg').length
          setStatus({
            type: 'success',
            message: `提取完成！共找到 ${imgs.length} 张图片（${jpgCount} 张 JPEG 可预览）`,
          })
        }
      }
    } catch (error) {
      setStatus({ type: 'error', message: `提取失败：${error.message}` })
    }
    setExtracting(false)
  }

  const handleCopyText = async () => {
    if (!textResult) return
    await navigator.clipboard.writeText(textResult.fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleSaveText = async () => {
    if (!textResult) return
    const saveResult = await window.electronAPI.saveFile({
      defaultPath: file.name.replace(/\.pdf$/i, '_text.txt'),
      filters: [{ name: '文本文件', extensions: ['txt'] }],
    })
    if (saveResult.canceled) return
    const encoder = new TextEncoder()
    const data = Array.from(encoder.encode(textResult.fullText))
    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, data)
    if (writeResult.success) {
      setStatus({ type: 'success', message: `已保存到：${saveResult.filePath}` })
    } else {
      setStatus({ type: 'error', message: `保存失败：${writeResult.error}` })
    }
  }

  const handleSaveImages = async () => {
    if (images.length === 0) return
    const dirResult = await window.electronAPI.openDirectory()
    if (dirResult.canceled) return
    const dirPath = dirResult.filePaths[0]

    const files = images.map((img, idx) => {
      const ext = img.format === 'jpeg' ? 'jpg' : img.format === 'jp2' ? 'jp2' : 'bin'
      const name = `${img.name || `image_${idx + 1}`}.${ext}`
      return { path: `${dirPath}/${name}`, data: img.data }
    })

    const writeResult = await window.electronAPI.writeFiles(files)
    if (writeResult.success) {
      setStatus({ type: 'success', message: `已保存 ${files.length} 张图片到：${dirPath}` })
    } else {
      setStatus({ type: 'error', message: `保存失败：${writeResult.error}` })
    }
  }

  const handleClear = () => {
    setFile(null)
    setTextResult(null)
    setImages([])
    setImagePreviews([])
    setStatus(null)
  }

  const canExtract = file && !extracting
  const hasText = textResult && textResult.fullText.length > 0
  const hasImages = images.length > 0

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={FileImage}
        title="提取内容"
        description="从 PDF 中提取文字或图片，支持批量导出"
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={extracting}>
            <FileText className="mr-1.5 h-4 w-4" />
            更换文件
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={extracting}>
          <FileText className="mr-1.5 h-4 w-4" />
          选择文件
        </Button>
        <Button size="sm" onClick={handleExtract} disabled={!canExtract}>
          {extracting ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              提取中...
            </>
          ) : (
            <>
              <Download className="mr-1.5 h-4 w-4" />
              开始提取
            </>
          )}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={FileImage}
          title="还没有选择 PDF"
          description="选择一个 PDF 文件，提取其中的文字或图片"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            '提取文字：输出可编辑的纯文本内容',
            '提取图片：导出 PDF 中嵌入的原始图片',
            '所有操作均在本地完成，安全可靠',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={formatSize(file.size)}
            onRemove={!extracting ? handleClear : undefined}
          />

          <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="w-auto self-start">
              <TabsTrigger value="text" className="gap-1.5">
                <AlignLeft className="h-4 w-4" />
                提取文字
              </TabsTrigger>
              <TabsTrigger value="images" className="gap-1.5">
                <ImageIcon className="h-4 w-4" />
                提取图片
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-3 flex flex-1 flex-col overflow-hidden">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {hasText
                    ? `共 ${textResult.pageCount} 页 · ${textResult.fullText.length} 字`
                    : '提取后文字将显示在这里'}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyText}
                    disabled={!hasText}
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        复制全文
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveText}
                    disabled={!hasText}
                  >
                    <Save className="mr-1 h-3.5 w-3.5" />
                    保存为 TXT
                  </Button>
                </div>
              </div>

              <Card className="flex flex-1 overflow-hidden">
                <ScrollArea className="h-full w-full p-4" ref={textScrollRef}>
                  {hasText ? (
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
                      {textResult.fullText}
                    </pre>
                  ) : (
                    <div className="flex h-full items-center justify-center py-20 text-sm text-muted-foreground">
                      点击「开始提取」获取 PDF 文字内容
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </TabsContent>

            <TabsContent value="images" className="mt-3 flex flex-1 flex-col overflow-hidden">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {hasImages
                    ? `找到 ${images.length} 张图片`
                    : '提取后图片将显示在这里'}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveImages}
                  disabled={!hasImages}
                >
                  <FolderOpen className="mr-1 h-3.5 w-3.5" />
                  全部导出
                </Button>
              </div>

              <Card className="flex flex-1 overflow-hidden">
                <ScrollArea className="h-full w-full p-4">
                  {hasImages ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {images.map((img, idx) => {
                        const preview = imagePreviews[idx]
                        return (
                          <div
                            key={idx}
                            className="group flex flex-col overflow-hidden rounded-lg border"
                          >
                            <div className="flex aspect-square items-center justify-center bg-muted/30">
                              {preview ? (
                                <img
                                  src={preview}
                                  alt={img.name}
                                  className="h-full w-full object-contain p-2"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                  <ImageIcon className="h-8 w-8 opacity-50" />
                                  <span className="text-[10px]">{img.format}</span>
                                </div>
                              )}
                            </div>
                            <div className="border-t bg-card/50 p-2">
                              <div className="truncate text-xs font-medium">{img.name}</div>
                              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {img.width > 0 && (
                                  <span>
                                    {img.width}×{img.height}
                                  </span>
                                )}
                                <Badge
                                  variant="outline"
                                  className="px-1 py-0 text-[9px] font-normal"
                                >
                                  {img.format}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center py-20 text-sm text-muted-foreground">
                      点击「开始提取」获取 PDF 中的图片
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}

export default ExtractPage
