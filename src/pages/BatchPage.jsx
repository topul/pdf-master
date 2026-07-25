import React, { useState, useRef } from 'react'
import {
  FileText,
  Save,
  Loader2,
  Layers,
  X,
  Check,
  FolderOpen,
  FileDown,
  Lock,
  AlignLeft,
  Play,
  Pause,
  GripVertical,
} from 'lucide-react'
import { compressPdf, encryptPdf, extractPdfText } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import PageHeader from '@/components/PageHeader.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import useDragDrop from '../hooks/useDragDrop.js'
import { useTranslations } from '@/hooks/useLocale.jsx'

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

const OPERATIONS = [
  { id: 'compress', labelKey: 'batchCompress', icon: FileDown, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'encrypt', labelKey: 'batchEncrypt', icon: Lock, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'extractText', labelKey: 'batchExtractText', icon: AlignLeft, color: 'text-blue-500', bg: 'bg-blue-500/10' },
]

function BatchPage() {
  const t = useTranslations()
  const [files, setFiles] = useState([])
  const [operation, setOperation] = useState('compress')
  const [status, setStatus] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState({})
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const [compressMode, setCompressMode] = useState('recommended')
  const [encryptPassword, setEncryptPassword] = useState('')

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

    const newResults = {}
    const keys = Object.keys(results)
    for (let i = 0; i < newFiles.length; i++) {
      const oldIndex = i < dragIndex ? i : i - 1
      if (i === index) {
        newResults[i] = results[dragIndex]
      } else if (keys.includes(oldIndex.toString())) {
        newResults[i] = results[oldIndex]
      }
    }
    setResults(newResults)

    setDragIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const abortRef = useRef(false)

  const handleAddFiles = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: t.batch.pdfFilter || 'PDF 文件', extensions: ['pdf'] }],
    })
    if (result.canceled) return

    const newFiles = []
    for (const filePath of result.filePaths) {
      const fileResult = await window.electronAPI.readFile(filePath)
      if (fileResult.success) {
        const fileName = filePath.split(/[\\/]/).pop()
        newFiles.push({
          path: filePath,
          name: fileName,
          data: fileResult.data,
          size: fileResult.data.length,
        })
      }
    }
    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles])
      setStatus({ type: 'info', message: (t.batch.addedCount || '已添加 {count} 个文件').replace('{count}', newFiles.length) })
    }
  }

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setResults((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const handleClearAll = () => {
    setFiles([])
    setResults({})
    setStatus(null)
  }

  const handleStart = async () => {
    if (files.length === 0 || processing) return
    if (operation === 'encrypt' && !encryptPassword) {
      setStatus({ type: 'error', message: t.batch.encryptPasswordRequired || '请输入加密密码' })
      return
    }

    setProcessing(true)
    abortRef.current = false
    setStatus({ type: 'info', message: (t.batch.startStatus || '开始处理... 0 / {total}').replace('{total}', files.length) })

    const newResults = {}
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < files.length; i++) {
      if (abortRef.current) break

      const file = files[i]
      newResults[i] = { status: 'processing' }
      setResults({ ...newResults })
      setStatus({ type: 'info', message: (t.batch.processingStatus || '处理中... {current} / {total}（{name}）').replace('{current}', i + 1).replace('{total}', files.length).replace('{name}', file.name) })

      try {
        let result
        if (operation === 'compress') {
          result = await compressPdf(file.data, compressMode)
        } else if (operation === 'encrypt') {
          result = await encryptPdf(file.data, { userPassword: encryptPassword })
        } else if (operation === 'extractText') {
          result = await extractPdfText(file.data)
        }
        newResults[i] = { status: 'success', result }
        successCount++
      } catch (error) {
        newResults[i] = { status: 'error', error: error.message }
        failCount++
      }
      setResults({ ...newResults })
    }

    setProcessing(false)
    if (abortRef.current) {
      setStatus({ type: 'info', message: (t.batch.stoppedStatus || '已停止：成功 {success}，失败 {fail}').replace('{success}', successCount).replace('{fail}', failCount) })
    } else {
      if (successCount > 0) {
        setStatus({
          type: 'success',
          message: (t.batch.completedStatus || '处理完成！成功 {success}，失败 {fail}。点击「全部导出」保存文件。').replace('{success}', successCount).replace('{fail}', failCount),
        })
        setTimeout(() => {
          handleSaveAll()
        }, 800)
      } else {
        setStatus({ type: 'error', message: (t.batch.allFailedStatus || '处理完成：全部失败（{fail} 个）').replace('{fail}', failCount) })
      }
    }
  }

  const handleStop = () => {
    abortRef.current = true
  }

  const handleSaveAll = async () => {
    const successItems = files
      .map((f, i) => ({ file: f, result: results[i], index: i }))
      .filter((item) => item.result?.status === 'success' && item.result.result)

    if (successItems.length === 0) return

    const dirResult = await window.electronAPI.openDirectory()
    if (dirResult.canceled) return
    const dirPath = dirResult.filePaths[0]

    const outFiles = []
    for (const item of successItems) {
      const { file, result } = item
      let outName
      let outData

      if (operation === 'compress') {
        outName = file.name.replace(/\.pdf$/i, '_compressed.pdf')
        outData = result.result
      } else if (operation === 'encrypt') {
        outName = file.name.replace(/\.pdf$/i, '_encrypted.pdf')
        outData = result.result
      } else if (operation === 'extractText') {
        outName = file.name.replace(/\.pdf$/i, '.txt')
        const encoder = new TextEncoder()
        outData = Array.from(encoder.encode(result.result.fullText))
      }

      if (outName && outData) {
        outFiles.push({ path: `${dirPath}/${outName}`, data: outData })
      }
    }

    const writeResult = await window.electronAPI.writeFiles(outFiles)
    if (writeResult.success) {
      setStatus({ type: 'success', message: (t.batch.savedToDir || '已保存 {count} 个文件到：{path}').replace('{count}', outFiles.length).replace('{path}', dirPath) })
    } else {
      setStatus({ type: 'error', message: (t.batch.saveError || '保存失败：{error}').replace('{error}', writeResult.error) })
    }
  }

  const successCount = Object.values(results).filter((r) => r?.status === 'success').length
  const errorCount = Object.values(results).filter((r) => r?.status === 'error').length
  const currentOp = OPERATIONS.find((o) => o.id === operation)

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Layers}
        title={t.batch.title || '批量处理'}
        description={t.batch.pageDescription || '一次选择多个 PDF，批量执行压缩、加密、提取文字等操作'}
      >
        <Button size="sm" onClick={handleAddFiles} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          {t.batch.addFiles || '添加文件'}
        </Button>
        {files.length > 0 && !processing && (
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            <X className="mr-1.5 h-4 w-4" />
            {t.batch.clear || '清空'}
          </Button>
        )}
        <Button
          size="sm"
          onClick={processing ? handleStop : handleStart}
          disabled={files.length === 0}
          variant={processing ? 'destructive' : 'default'}
        >
          {processing ? (
            <>
              <Pause className="mr-1.5 h-4 w-4" />
              {t.batch.stop || '停止'}
            </>
          ) : (
            <>
              <Play className="mr-1.5 h-4 w-4" />
              {t.batch.startProcess || '开始处理'}
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSaveAll}
          disabled={successCount === 0 || processing}
        >
          <Save className="mr-1.5 h-4 w-4" />
          {t.batch.exportAll || '全部导出'}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      <div className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row">
        {/* 左侧：文件列表 */}
        <Card className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <h3 className="text-sm font-medium">{t.batch.fileListTitle || '文件列表'}</h3>
            <Badge variant="secondary" className="text-xs">
              {(t.batch.filesCount || '{count} 个文件').replace('{count}', files.length)}
            </Badge>
          </div>
          <ScrollArea className="flex-1">
            {files.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <FolderOpen className="h-8 w-8 opacity-50" />
                <span>{t.batch.emptyHint || '点击「添加文件」开始'}</span>
              </div>
            ) : (
              <div className="divide-y">
                {files.map((file, index) => {
                  const r = results[index]
                  return (
                    <div
                      key={index}
                      draggable={!processing}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'group flex items-center gap-3 px-4 py-2.5 transition-all',
                        dragIndex === index && 'opacity-50',
                        dragOverIndex === index && dragIndex !== index && 'border-t-2 border-t-primary pt-1.5',
                        'hover:bg-accent/50 cursor-grab active:cursor-grabbing'
                      )}
                    >
                      <div className="text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatSize(file.size)}
                          {r?.status === 'success' && operation === 'compress' && r.result && (
                            <span className="ml-2 text-emerald-500">
                              → {formatSize(r.result.length)}（{((1 - r.result.length / file.size) * 100).toFixed(1)}%）
                            </span>
                          )}
                          {r?.status === 'success' && operation === 'extractText' && r.result?.fullText && (
                            <span className="ml-2 text-emerald-500">
                              {(t.batch.charsCount || '{count} 字').replace('{count}', r.result.fullText.length)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {r?.status === 'processing' && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                        {r?.status === 'success' && (
                          <Check className="h-4 w-4 text-emerald-500" />
                        )}
                        {r?.status === 'error' && (
                          <Badge variant="destructive" className="text-[10px]" title={r.error}>
                            {t.batch.failed || '失败'}
                          </Badge>
                        )}
                        {!processing && (
                          <button
                            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={() => handleRemoveFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* 右侧：操作设置 */}
        <Card className="flex w-full shrink-0 flex-col md:w-80">
          <div className="border-b px-4 py-2.5">
            <h3 className="text-sm font-medium">{t.batch.operationsTitle || '操作设置'}</h3>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t.batch.selectOperation || '选择操作'}</Label>
              <div className="mt-2 space-y-1.5">
                {OPERATIONS.map((op) => {
                  const Icon = op.icon
                  const active = operation === op.id
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => !processing && setOperation(op.id)}
                      disabled={processing}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                        active ? 'border-primary/60 bg-primary/5' : 'hover:bg-accent/50',
                        processing && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', op.bg)}>
                        <Icon className={cn('h-4 w-4', op.color)} />
                      </div>
                      <span className="font-medium">{t.batch[op.labelKey] || op.id}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {operation === 'compress' && (
              <div>
                <Label className="text-xs text-muted-foreground">{t.batch.compressMode || '压缩模式'}</Label>
                <div className="mt-2 space-y-1.5">
                  {[
                    { value: 'fast', label: t.batch.modeFast || '极速压缩', desc: t.batch.modeFastDesc || '无损，最快' },
                    { value: 'recommended', label: t.batch.modeRecommended || '推荐压缩', desc: t.batch.modeRecommendedDesc || '体积与质量平衡' },
                    { value: 'strong', label: t.batch.modeStrong || '强力压缩', desc: t.batch.modeStrongDesc || '重编码图片，体积小' },
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => !processing && setCompressMode(m.value)}
                      disabled={processing}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-sm transition-colors',
                        compressMode === m.value ? 'border-primary/60 bg-primary/5' : 'hover:bg-accent/50',
                        processing && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {operation === 'encrypt' && (
              <div>
                <Label className="text-xs text-muted-foreground">{t.batch.encryptPassword || '加密密码'}</Label>
                <div className="mt-2">
                  <Input
                    type="password"
                    placeholder={t.batch.passwordPlaceholder || '请输入密码'}
                    value={encryptPassword}
                    onChange={(e) => setEncryptPassword(e.target.value)}
                    disabled={processing}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t.batch.passwordHint || '所有文件将使用同一密码加密'}
                  </p>
                </div>
              </div>
            )}

            {operation === 'extractText' && (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                {t.batch.extractTextHint || '提取每个 PDF 的文字内容，保存为 .txt 文件'}
              </div>
            )}
          </div>

          {/* 统计 */}
          <div className="border-t p-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>{t.batch.totalFiles || '总文件数'}</span>
                <span className="font-medium text-foreground">{files.length}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t.batch.successCount || '成功'}</span>
                <span className="font-medium text-emerald-500">{successCount}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t.batch.errorCount || '失败'}</span>
                <span className="font-medium text-red-500">{errorCount}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default BatchPage
