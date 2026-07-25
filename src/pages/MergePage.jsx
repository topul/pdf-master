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
  GripVertical,
} from 'lucide-react'
import { mergePdfs, getPdfInfo } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import useDragDrop from '../hooks/useDragDrop.js'
import { useTranslations } from '@/hooks/useLocale.jsx'

function MergePage() {
  const t = useTranslations()
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  useDragDrop((droppedFiles) => {
    setFiles((prev) => [...prev, ...droppedFiles])
    setStatus(null)
  })

  const handleDragStart = (e, index) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e, index) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }

    const newFiles = [...files]
    const [removed] = newFiles.splice(dragIndex, 1)
    newFiles.splice(index, 0, removed)
    setFiles(newFiles)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

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
      setStatus({ type: 'error', message: t.merge.minFilesError || '请至少添加 2 个 PDF 文件' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: t.merge.mergingStatus || '正在合并 PDF 文件...' })

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
          message: (t.merge.saveSuccess || '合并成功！文件已保存到：{path}').replace('{path}', saveResult.filePath),
        })
      } else {
        setStatus({ type: 'error', message: (t.merge.saveError || '保存失败：{error}').replace('{error}', writeResult.error) })
      }
    } catch (error) {
      setStatus({ type: 'error', message: (t.merge.mergeError || '合并失败：{error}').replace('{error}', error.message) })
    }

    setProcessing(false)
  }

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0)

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={FilePlus2}
        title={t.merge.title || '合并 PDF'}
        description={t.merge.pageDescription || '将多个 PDF 文件按顺序合并为一个完整文档'}
      >
        {files.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            {t.merge.reset || '重置'}
          </Button>
        )}
        <Button size="sm" onClick={handleAddFiles} disabled={processing}>
          <FilePlus2 className="mr-1.5 h-4 w-4" />
          {t.merge.addFiles || '添加文件'}
        </Button>
        <Button
          size="sm"
          onClick={handleMerge}
          disabled={processing || files.length < 2}
        >
          {processing ? (
            <>
              <Sparkles className="mr-1.5 h-4 w-4 animate-pulse" />
              {t.merge.merging || '合并中...'}
            </>
          ) : (
            <>
              <Layers className="mr-1.5 h-4 w-4" />
              {t.merge.merge || '开始合并'}
            </>
          )}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {files.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title={t.merge.emptyTitle || '还没有添加任何 PDF'}
          description={t.merge.emptyDescription || '点击下方按钮添加需要合并的 PDF 文件，至少需要 2 个文件即可开始合并'}
          actionLabel={t.merge.emptyActionLabel || '选择 PDF 文件'}
          onAction={handleAddFiles}
          tips={[
            t.merge.tip1 || '支持添加多个 PDF 文件',
            t.merge.tip2 || '可通过上下移动调整合并顺序',
            t.merge.tip3 || '合并后的文件可保存到任意位置',
          ]}
        />
      ) : (
        <Card className="flex-1 overflow-hidden">
          <CardContent className="flex h-full flex-col p-0">
            {/* 列表头 */}
            <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs text-muted-foreground">
              <span>{(t.merge.fileListCount || '文件列表（{count}）').replace('{count}', files.length)}</span>
              <span>
                {(t.merge.totalPagesText || '共 {count} 页').split('{count}')[0]}
                <span className="font-medium text-foreground">{totalPages}</span>
                {(t.merge.totalPagesText || '共 {count} 页').split('{count}')[1]}
              </span>
            </div>

            {/* 文件列表 */}
            <div className="flex-1 overflow-y-auto p-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  draggable={!processing}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'group flex items-center gap-3 rounded-md px-2 py-2 transition-all',
                    dragIndex === index && 'opacity-50',
                    dragOverIndex === index && dragIndex !== index && 'border-t-2 border-t-primary pt-1.5',
                    'hover:bg-accent/50 cursor-grab active:cursor-grabbing'
                  )}
                >
                  <div className="text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4" />
                  </div>
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
                      {(t.merge.pageCountText || '{count} 页').replace('{count}', file.pageCount)}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0 || processing}
                      title={t.merge.up || '上移'}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === files.length - 1 || processing}
                      title={t.merge.down || '下移'}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleRemoveFile(index)}
                      disabled={processing}
                      title={t.merge.removeTitle || '删除'}
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
                {t.merge.minFilesHint || '至少需要 2 个文件才能合并，请继续添加'}
              </div>
            )}
            {files.length >= 2 && (
              <div className="flex items-center justify-between border-t px-4 py-2.5 text-xs">
                <Badge variant="secondary" className="gap-1">
                  <Layers className="h-3 w-3" />
                  {t.merge.readyToMerge || '可合并'}
                </Badge>
                <span className="text-muted-foreground">
                  {t.merge.readyHint || '点击右上角“开始合并”即可'}
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
