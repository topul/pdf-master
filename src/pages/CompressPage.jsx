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
import { useTranslations } from '@/hooks/useLocale.jsx'
import { cn } from '@/lib/utils'

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function CompressPage() {
  const t = useTranslations()
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
    setStatus({ type: 'info', message: t.common.processing })
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
          message: `${t.common.done} ${formatSize(saved)} (${ratio}%)`,
        })
      } else {
        setStatus({
          type: 'info',
          message: `${t.common.done} (${ratio}%)`,
        })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `${t.common.error}: ${error.message}` })
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
      setStatus({ type: 'success', message: `${t.common.success}: ${saveResult.filePath}` })
    } else {
      setStatus({ type: 'error', message: `${t.common.error}: ${writeResult.error}` })
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
      title: t.compress.fast,
      desc: '无损压缩，速度最快',
      icon: Zap,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      value: 'recommended',
      title: t.compress.recommended,
      desc: '体积与质量的最佳平衡',
      icon: Target,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      value: 'strong',
      title: t.compress.strong,
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
        title={t.compress.title}
        description={t.compress.description}
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={compressing}>
            <FileText className="mr-1.5 h-4 w-4" />
            {t.common.edit}
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={compressing}>
          <FileText className="mr-1.5 h-4 w-4" />
          {t.common.selectFile}
        </Button>
        <Button size="sm" onClick={handleCompress} disabled={compressing || !file}>
          {compressing ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              {t.common.processing}
            </>
          ) : (
            <>
              <Zap className="mr-1.5 h-4 w-4" />
              {t.compress.startCompress}
            </>
          )}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={compressing || !outputData} variant="secondary">
          <Save className="mr-1.5 h-4 w-4" />
          {t.common.save}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={FileDown}
          title={t.common.selectFile}
          description={t.compress.description}
          actionLabel={t.common.selectFile}
          onAction={handleSelectFile}
          tips={[
            'Fast mode: lossless, fastest',
            'Recommended: best balance',
            'Strong: recompress JPEG, smallest size',
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
                <h3 className="text-sm font-medium">{t.compress.compressionMode}</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Powered by qpdf-wasm, all compression done locally
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
                <h3 className="text-sm font-medium">{t.common.done}</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.compress.originalSize}</span>
                  <span className="font-medium">{formatSize(file.size)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.compress.compressedSize}</span>
                  <span className="font-medium">
                    {outputSize > 0 ? formatSize(outputSize) : '-'}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.compress.compressionRatio}</span>
                  <span className={`font-bold ${savedRatio && parseFloat(savedRatio) > 0 ? 'text-emerald-500' : 'text-foreground'}`}>
                    {savedRatio !== null ? `${savedRatio}%` : '-'}
                  </span>
                </div>
              </div>

              {mode === 'strong' && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">{t.compress.jpegQuality}</Label>
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
                    Lower = smaller file, lower quality
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