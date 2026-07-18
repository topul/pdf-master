import React, { useState } from 'react'
import {
  FilePlus2,
  FileText,
  ArrowUp,
  ArrowDown,
  X,
  Layers,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { mergePdfs, getPdfInfo } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'

function MergePage() {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)

  const handleAddFiles = async () => {
    const result = await window.electronAPI.openFiles()
    if (result.canceled) return

    const newFiles = []
    for (const filePath of result.filePaths) {
      const fileResult = await window.electronAPI.readFile(filePath)
      if (fileResult.success) {
        try {
          const info = await getPdfInfo(fileResult.data)
          const fileName = filePath.split(/[\\/]/).pop()
          newFiles.push({
            path: filePath,
            name: fileName,
            data: fileResult.data,
            pageCount: info.pageCount,
          })
        } catch (e) {
          console.error('Failed to load PDF:', e)
        }
      }
    }
    setFiles([...files, ...newFiles])
    setStatus(null)
  }

  const handleRemoveFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleMove = (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= files.length) return
    const newFiles = [...files]
    ;[newFiles[index], newFiles[target]] = [newFiles[target], newFiles[index]]
    setFiles(newFiles)
  }

  const handleClear = () => {
    setFiles([])
    setStatus(null)
  }

  const handleMerge = async () => {
    if (files.length < 2) {
      setStatus({ type: 'error', message: '请至少添加 2 个 PDF 文件' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在合并 PDF 文件...' })

    try {
      const mergedData = await mergePdfs(files.map((f) => f.data))

      const saveResult = await window.electronAPI.saveFile({
        defaultPath: 'merged.pdf',
      })

      if (saveResult.canceled) {
        setProcessing(false)
        setStatus(null)
        return
      }

      const writeResult = await window.electronAPI.writeFile(
        saveResult.filePath,
        mergedData
      )
      if (writeResult.success) {
        setStatus({
          type: 'success',
          message: `合并成功！文件已保存到：${saveResult.filePath}`,
        })
      } else {
        setStatus({ type: 'error', message: `保存失败：${writeResult.error}` })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `合并失败：${error.message}` })
    }

    setProcessing(false)
  }

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0)

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={FilePlus2}
        title="合并 PDF"
        description="将多个 PDF 文件按顺序合并为一个完整文档"
      >
        {files.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            重置
          </Button>
        )}
        <Button size="sm" onClick={handleAddFiles} disabled={processing}>
          <FilePlus2 className="mr-1.5 h-4 w-4" />
          添加文件
        </Button>
        <Button
          size="sm"
          onClick={handleMerge}
          disabled={processing || files.length < 2}
        >
          {processing ? (
            <>
              <Sparkles className="mr-1.5 h-4 w-4 animate-pulse" />
              合并中...
            </>
          ) : (
            <>
              <Layers className="mr-1.5 h-4 w-4" />
              开始合并
            </>
          )}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {files.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title="还没有添加任何 PDF"
          description="点击下方按钮添加需要合并的 PDF 文件，至少需要 2 个文件即可开始合并"
          actionLabel="选择 PDF 文件"
          onAction={handleAddFiles}
          tips={[
            '支持添加多个 PDF 文件',
            '可通过上下移动调整合并顺序',
            '合并后的文件可保存到任意位置',
          ]}
        />
      ) : (
        <Card className="flex-1 overflow-hidden">
          <CardContent className="flex h-full flex-col p-0">
            {/* 列表头 */}
            <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs text-muted-foreground">
              <span>文件列表（{files.length}）</span>
              <span>
                共 <span className="font-medium text-foreground">{totalPages}</span> 页
              </span>
            </div>

            {/* 文件列表 */}
            <div className="flex-1 overflow-y-auto p-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/50"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium" title={file.name}>
                      {file.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {file.pageCount} 页
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0 || processing}
                      title="上移"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === files.length - 1 || processing}
                      title="下移"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveFile(index)}
                      disabled={processing}
                      title="删除"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* 底部提示 */}
            {files.length < 2 && (
              <div className="border-t bg-amber-500/5 px-4 py-2 text-xs text-amber-600">
                至少需要 2 个文件才能合并，请继续添加
              </div>
            )}
            {files.length >= 2 && (
              <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs">
                <Badge variant="secondary" className="gap-1">
                  <Layers className="h-3 w-3" />
                  可合并
                </Badge>
                <span className="text-muted-foreground">
                  点击右上角“开始合并”即可
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MergePage
