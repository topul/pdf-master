import React, { useState } from 'react'
import {
  FileText,
  Save,
  Loader2,
  Edit3,
  FileCog,
} from 'lucide-react'
import { getPdfMetadata, setPdfMetadata } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('zh-CN')
  } catch {
    return dateStr
  }
}

function MetadataPage() {
  const [file, setFile] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)
  const [outputData, setOutputData] = useState(null)

  const handleSelectFile = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
    })
    if (result.canceled) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      try {
        setProcessing(true)
        setStatus({ type: 'info', message: '正在读取元数据...' })

        const meta = await getPdfMetadata(fileResult.data)
        const fileName = filePath.split(/[\\/]/).pop()
        setFile({
          path: filePath,
          name: fileName,
          data: fileResult.data,
        })
        setMetadata(meta)
        setOutputData(null)
        setStatus(null)
      } catch (e) {
        setStatus({ type: 'error', message: `加载 PDF 失败：${e.message}` })
      }
      setProcessing(false)
    }
  }

  const handleFieldChange = (field, value) => {
    setMetadata((prev) => ({ ...prev, [field]: value }))
    setOutputData(null)
  }

  const handleApply = async () => {
    if (!file || !metadata) return
    setSaving(true)
    setStatus({ type: 'info', message: '正在更新元数据...' })

    try {
      const result = await setPdfMetadata(file.data, {
        title: metadata.title,
        author: metadata.author,
        subject: metadata.subject,
        keywords: metadata.keywords,
        creator: metadata.creator,
        producer: metadata.producer,
      })
      setOutputData(result)
      setStatus({ type: 'success', message: '元数据已更新，点击保存导出文件' })
    } catch (error) {
      setStatus({ type: 'error', message: `更新失败：${error.message}` })
    }
    setSaving(false)
  }

  const handleSave = async () => {
    if (!outputData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: file.name.replace(/\.pdf$/i, '_meta.pdf'),
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
    setMetadata(null)
    setOutputData(null)
    setStatus(null)
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={FileCog}
          title="元数据编辑"
          description="查看和修改 PDF 的标题、作者、关键词等元信息"
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing || saving}>
            <FileText className="mr-1.5 h-4 w-4" />
            更换文件
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing || saving}>
          <FileText className="mr-1.5 h-4 w-4" />
          选择文件
        </Button>
        <Button size="sm" onClick={handleSave} disabled={processing || saving || !outputData}>
          <Save className="mr-1.5 h-4 w-4" />
          保存
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={FileCog}
          title="还没有选择 PDF"
          description="选择一个 PDF 文件，查看并编辑它的元数据信息"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            '可编辑标题、作者、主题、关键词、创建者',
            '查看页数、创建时间、修改时间等信息',
            '修改后保存为新文件，不覆盖原文件',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={metadata ? `${metadata.pageCount} 页` : '加载中...'}
            onRemove={!processing && !saving ? handleClear : undefined}
          />

          <Card className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b px-4 py-2.5">
              <h3 className="text-sm font-medium">元数据</h3>
              <p className="text-xs text-muted-foreground">修改后点击「应用更改」保存到文件</p>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label className="text-sm">标题 (Title)</Label>
                <Input
                  value={metadata?.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="文档标题"
                  disabled={processing || saving}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">作者 (Author)</Label>
                <Input
                  value={metadata?.author || ''}
                  onChange={(e) => handleFieldChange('author', e.target.value)}
                  placeholder="作者姓名"
                  disabled={processing || saving}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">主题 (Subject)</Label>
                <Input
                  value={metadata?.subject || ''}
                  onChange={(e) => handleFieldChange('subject', e.target.value)}
                  placeholder="文档主题"
                  disabled={processing || saving}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">关键词 (Keywords)</Label>
                <Input
                  value={metadata?.keywords || ''}
                  onChange={(e) => handleFieldChange('keywords', e.target.value)}
                  placeholder="用逗号分隔"
                  disabled={processing || saving}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">创建者 (Creator)</Label>
                <Input
                  value={metadata?.creator || ''}
                  onChange={(e) => handleFieldChange('creator', e.target.value)}
                  placeholder="创建文档的工具"
                  disabled={processing || saving}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">生成工具 (Producer)</Label>
                <Input
                  value={metadata?.producer || ''}
                  onChange={(e) => handleFieldChange('producer', e.target.value)}
                  placeholder="生成 PDF 的工具"
                  disabled={processing || saving}
                />
                <p className="text-[11px] text-muted-foreground">默认为 PDF Master，可自定义</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">创建时间</Label>
                <Input
                  value={formatDate(metadata?.creationDate)}
                  disabled
                  className="cursor-not-allowed bg-muted/50 text-muted-foreground"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">修改时间</Label>
                <Input
                  value={formatDate(metadata?.modificationDate)}
                  disabled
                  className="cursor-not-allowed bg-muted/50 text-muted-foreground"
                />
              </div>
            </div>

            <div className="border-t p-4">
              <Button
                onClick={handleApply}
                disabled={processing || saving || !metadata}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    更新中...
                  </>
                ) : (
                  <>
                    <Edit3 className="mr-1.5 h-4 w-4" />
                    应用更改
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export default MetadataPage
