import React, { useState } from 'react'
import { Scissors, FileText, FolderOpen, Sparkles, FileOutput } from 'lucide-react'
import { splitPdf, getPdfInfo } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'

function SplitPage() {
  const [file, setFile] = useState(null)
  const [splitMode, setSplitMode] = useState('every')
  const [pageCount, setPageCount] = useState(1)
  const [rangeInput, setRangeInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)

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
        setStatus(null)
      } catch (e) {
        setStatus({ type: 'error', message: `加载 PDF 失败：${e.message}` })
      }
    }
  }

  const handleSplit = async () => {
    if (!file) {
      setStatus({ type: 'error', message: '请先选择 PDF 文件' })
      return
    }

    let options = {}
    if (splitMode === 'every') {
      if (pageCount < 1) {
        setStatus({ type: 'error', message: '每页数量必须大于 0' })
        return
      }
      options.pageCount = parseInt(pageCount, 10)
    } else if (splitMode === 'ranges') {
      if (!rangeInput.trim()) {
        setStatus({ type: 'error', message: '请输入页码范围' })
        return
      }
      const ranges = rangeInput.split(',').map((s) => s.trim()).filter(Boolean)
      if (ranges.length === 0) {
        setStatus({ type: 'error', message: '请输入有效的页码范围' })
        return
      }
      options.ranges = ranges
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在拆分 PDF 文件...' })

    try {
      const outputs = await splitPdf(file.data, splitMode, options)

      const dirResult = await window.electronAPI.openDirectory()
      if (dirResult.canceled) {
        setProcessing(false)
        setStatus(null)
        return
      }

      const outputDir = dirResult.filePaths[0]
      const filesToWrite = outputs.map((output) => ({
        path: `${outputDir}/${output.name}`,
        data: output.data,
      }))

      const writeResult = await window.electronAPI.writeFiles(filesToWrite)
      if (writeResult.success) {
        setStatus({
          type: 'success',
          message: `拆分成功！共生成 ${outputs.length} 个文件，已保存到：${outputDir}`,
        })
      } else {
        setStatus({ type: 'error', message: `保存失败：${writeResult.error}` })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `拆分失败：${error.message}` })
    }

    setProcessing(false)
  }

  const handleClear = () => {
    setFile(null)
    setStatus(null)
  }

  const modeOptions = [
    {
      key: 'every',
      label: '按页数拆分',
      desc: '每 N 页为一个文件',
    },
    {
      key: 'single',
      label: '单页拆分',
      desc: '每页拆为一个文件',
    },
    {
      key: 'ranges',
      label: '按范围拆分',
      desc: '按指定页码范围拆分',
    },
  ]

  const canSplit = file && (splitMode !== 'ranges' || rangeInput.trim())

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Scissors}
        title="拆分 PDF"
        description="将 PDF 文件拆分为多个独立的文档"
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing}>
            <FileText className="mr-1.5 h-4 w-4" />
            更换文件
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSplit}
          disabled={processing || !file || (splitMode === 'ranges' && !rangeInput.trim())}
        >
          {processing ? (
            <>
              <Sparkles className="mr-1.5 h-4 w-4 animate-pulse" />
              拆分中...
            </>
          ) : (
            <>
              <FileOutput className="mr-1.5 h-4 w-4" />
              开始拆分
            </>
          )}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={Scissors}
          title="还没有选择 PDF"
          description="点击下方按钮选择需要拆分的 PDF 文件，支持按页数、单页或自定义范围三种拆分方式"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            '按页数：每 N 页生成一个 PDF',
            '单页拆分：每页都独立为一个 PDF',
            '按范围：自定义页码范围，如 1-3, 5-7',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-5 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={`共 ${file.pageCount} 页`}
            onRemove={!processing ? handleClear : undefined}
          />

          <Card className="flex-1 overflow-hidden">
            <CardContent className="flex h-full flex-col p-0">
              <div className="border-b px-5 py-3">
                <h3 className="text-sm font-semibold">选择拆分方式</h3>
                <p className="text-xs text-muted-foreground">
                  选择适合的拆分模式后，下方会显示对应的参数配置
                </p>
              </div>

              {/* 模式选择 */}
              <div className="grid grid-cols-1 gap-3 border-b p-5 sm:grid-cols-3">
                {modeOptions.map((opt) => {
                  const active = splitMode === opt.key
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setSplitMode(opt.key)}
                      disabled={processing}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all',
                        active
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-primary/40 hover:bg-accent/40'
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-medium">{opt.label}</span>
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
                      </div>
                      <span className="text-xs text-muted-foreground">{opt.desc}</span>
                    </button>
                  )
                })}
              </div>

              {/* 参数配置 */}
              <div className="flex-1 overflow-y-auto p-5">
                {splitMode === 'every' && (
                  <div className="flex flex-col gap-3">
                    <Label className="text-sm">每 N 页拆分为一个文件</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min="1"
                        max={file.pageCount}
                        value={pageCount}
                        onChange={(e) => setPageCount(e.target.value)}
                        disabled={processing}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">页 / 文件</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      将生成约{' '}
                      <span className="font-medium text-foreground">
                        {Math.ceil(file.pageCount / Math.max(1, parseInt(pageCount, 10) || 1))}
                      </span>{' '}
                      个文件
                    </p>
                  </div>
                )}

                {splitMode === 'single' && (
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                    将 PDF 的每一页都拆分为独立的 PDF 文件，共生成{' '}
                    <span className="font-medium text-foreground">{file.pageCount}</span> 个文件
                  </div>
                )}

                {splitMode === 'ranges' && (
                  <div className="flex flex-col gap-3">
                    <Label className="text-sm">页码范围</Label>
                    <Textarea
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      placeholder="例如：1-3, 5-7, 10-15"
                      rows={4}
                      disabled={processing}
                    />
                    <p className="text-xs text-muted-foreground">
                      格式：起始页-结束页，多个范围用英文逗号分隔
                    </p>
                  </div>
                )}
              </div>

              {/* 底部提示 */}
              <div className="border-t bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground">
                {canSplit ? (
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" />
                    已准备好，点击右上角“开始拆分”选择保存位置
                  </span>
                ) : (
                  <span>请填写拆分参数后再开始拆分</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default SplitPage
