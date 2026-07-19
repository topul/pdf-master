import React, { useState } from 'react'
import {
  FileText,
  Save,
  Loader2,
  FileDown,
  Zap,
  Target,
  Flame,
  Info,
  Check,
} from 'lucide-react'
import { compressPdf } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function CompressPage() {
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('recommended')
  const [jpegQuality, setJpegQuality] = useState(50)
  const [compressing, setCompressing] = useState(false)
  const [status, setStatus] = useState(null)
  const [outputData, setOutputData] = useState(null)
  const [outputSize, setOutputSize] = useState(0)

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
      setOutputData(null)
      setOutputSize(0)
      setStatus(null)
    }
  }

  const handleCompress = async () => {
    if (!file) return
    setCompressing(true)
    setStatus({ type: 'info', message: '正在压缩 PDF...' })
    setOutputData(null)
    setOutputSize(0)

    try {
      const result = await compressPdf(file.data, mode, jpegQuality)
      const saved = file.size - result.length
      const ratio = ((1 - result.length / file.size) * 100).toFixed(1)
      setOutputData(result)
      setOutputSize(result.length)
      if (saved > 0) {
        setStatus({
          type: 'success',
          message: `压缩完成！减小 ${formatSize(saved)}（${ratio}%），点击保存导出文件`,
        })
      } else {
        setStatus({
          type: 'info',
          message: `压缩完成（体积变化 ${ratio}%），文件可能已被充分压缩`,
        })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `压缩失败：${error.message}` })
    }
    setCompressing(false)
  }

  const handleSave = async () => {
    if (!outputData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: file.name.replace(/\.pdf$/i, '_compressed.pdf'),
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })
    if (saveResult.canceled) return

    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, outputData)
    if (writeResult.success) {
      setStatus({ type: 'success', message: `保存成功！文件已保存到：${saveResult.filePath}` })
    } else {
      setStatus({ type: 'error', message: `保存失败：${writeResult.error}` })
    }
  }

  const handleClear = () => {
    setFile(null)
    setOutputData(null)
    setOutputSize(0)
    setStatus(null)
  }

  const savedRatio = file && outputSize > 0
    ? ((1 - outputSize / file.size) * 100).toFixed(1)
    : null

  const modes = [
    {
      value: 'fast',
      title: '极速压缩',
      desc: '无损压缩，速度最快',
      icon: Zap,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      value: 'recommended',
      title: '推荐压缩',
      desc: '体积与质量的最佳平衡',
      icon: Target,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      value: 'strong',
      title: '强力压缩',
      desc: '重编码图片，体积最小',
      icon: Flame,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
    },
  ]

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={FileDown}
        title="PDF 压缩"
        description="减小 PDF 文件体积，支持无损与有损两种模式"
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={compressing}>
            <FileText className="mr-1.5 h-4 w-4" />
            更换文件
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={compressing}>
          <FileText className="mr-1.5 h-4 w-4" />
          选择文件
        </Button>
        <Button size="sm" onClick={handleCompress} disabled={compressing || !file}>
          {compressing ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              压缩中...
            </>
          ) : (
            <>
              <Zap className="mr-1.5 h-4 w-4" />
              开始压缩
            </>
          )}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={compressing || !outputData} variant="secondary">
          <Save className="mr-1.5 h-4 w-4" />
          保存
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={FileDown}
          title="还没有选择 PDF"
          description="选择一个 PDF 文件，选择压缩模式后开始压缩"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            '极速模式：无损压缩，速度最快',
            '推荐模式：flate 最高压缩率+对象流',
            '强力模式：重编码 JPEG 图片，体积最小',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={formatSize(file.size)}
            onRemove={!compressing ? handleClear : undefined}
          />

          <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">压缩模式</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        基于 qpdf-wasm 实现，所有压缩均在本地完成
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex flex-col gap-2">
                {modes.map((m) => {
                  const Icon = m.icon
                  const active = mode === m.value
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMode(m.value)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all',
                        active
                          ? 'border-primary/60 bg-primary/5'
                          : 'hover:bg-accent/50'
                      )}
                    >
                      <div className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', active ? 'border-primary bg-primary' : 'border-muted-foreground/30')}>
                        {active && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', m.bg)}>
                        <Icon className={cn('h-4 w-4', m.color)} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{m.title}</div>
                        <div className="text-xs text-muted-foreground">{m.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>

            <Card className="p-4">
              <div className="mb-3">
                <h3 className="text-sm font-medium">压缩结果</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">原始大小</span>
                  <span className="font-medium">{formatSize(file.size)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">压缩后大小</span>
                  <span className="font-medium">
                    {outputSize > 0 ? formatSize(outputSize) : '-'}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">节省空间</span>
                  <span className={`font-bold ${savedRatio && parseFloat(savedRatio) > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                    {savedRatio !== null ? `${savedRatio}%` : '-'}
                  </span>
                </div>
              </div>

              {mode === 'strong' && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">JPEG 图片质量</Label>
                    <span className="text-xs font-medium">{jpegQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={jpegQuality}
                    onChange={(e) => setJpegQuality(Number(e.target.value))}
                    disabled={compressing}
                    className="w-full accent-primary"
                  />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    数值越小体积越小，图片质量越低
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompressPage
