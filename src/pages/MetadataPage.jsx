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
import { useTranslations } from '@/hooks/useLocale.jsx'
import useDragDrop from '../hooks/useDragDrop.js'

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
  const t = useTranslations()
  const [file, setFile] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)
  const [outputData, setOutputData] = useState(null)

  useDragDrop((droppedFiles) => {
    if (droppedFiles.length > 0) {
      setFile(droppedFiles[0])
      setStatus(null)
    }
  })

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
        setStatus({ type: 'info', message: t.metadataPage.readingStatus || '正在读取元数据...' })

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
        setStatus({ type: 'error', message: (t.metadataPage.loadError || '加载 PDF 失败：{error}').replace('{error}', e.message) })
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
    setStatus({ type: 'info', message: t.metadataPage.updatingStatus || '正在更新元数据...' })

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
      setStatus({ type: 'success', message: t.metadataPage.updateSuccess || '元数据已更新，点击保存导出文件' })
    } catch (error) {
      setStatus({ type: 'error', message: (t.metadataPage.updateError || '更新失败：{error}').replace('{error}', error.message) })
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
      setStatus({ type: 'success', message: (t.metadataPage.saveSuccess || '保存成功！文件已保存到：{path}').replace('{path}', saveResult.filePath) })
    } else {
      setStatus({ type: 'error', message: (t.metadataPage.saveError || '保存失败：{error}').replace('{error}', writeResult.error) })
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
          title={t.metadataPage.title || '元数据编辑'}
          description={t.metadataPage.description || '查看和修改 PDF 的标题、作者、关键词等元信息'}
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleClear} disabled={processing || saving}>
            <FileText className="mr-1.5 h-4 w-4" />
            {t.metadataPage.changeFile || '更换文件'}
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing || saving}>
          <FileText className="mr-1.5 h-4 w-4" />
          {t.metadataPage.selectFile || '选择文件'}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={processing || saving || !outputData}>
          <Save className="mr-1.5 h-4 w-4" />
          {t.metadataPage.save || '保存'}
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={FileCog}
          title={t.metadataPage.emptyTitle || '还没有选择 PDF'}
          description={t.metadataPage.emptyDescription || '选择一个 PDF 文件，查看并编辑它的元数据信息'}
          actionLabel={t.metadataPage.emptyActionLabel || '选择 PDF 文件'}
          onAction={handleSelectFile}
          tips={[
            t.metadataPage.tip1 || '可编辑标题、作者、主题、关键词、创建者',
            t.metadataPage.tip2 || '查看页数、创建时间、修改时间等信息',
            t.metadataPage.tip3 || '修改后保存为新文件，不覆盖原文件',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={metadata ? (t.metadataPage.metaPages || '{count} 页').replace('{count}', metadata.pageCount) : (t.metadataPage.loading || '加载中...')}
            onRemove={!processing && !saving ? handleClear : undefined}
          />

          <Card className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b px-4 py-2.5">
              <h3 className="text-sm font-medium">{t.metadataPage.metaTitle || '元数据'}</h3>
              <p className="text-xs text-muted-foreground">{t.metadataPage.metaDesc || '修改后点击「应用更改」保存到文件'}</p>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label className="text-sm">{t.metadataPage.titleLabel || '标题 (Title)'}</Label>
                <Input
                  value={metadata?.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder={t.metadataPage.titlePlaceholder || '文档标题'}
                  disabled={processing || saving}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">{t.metadataPage.authorLabel || '作者 (Author)'}</Label>
                <Input
                  value={metadata?.author || ''}
                  onChange={(e) => handleFieldChange('author', e.target.value)}
                  placeholder={t.metadataPage.authorPlaceholder || '作者姓名'}
                  disabled={processing || saving}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">{t.metadataPage.subjectLabel || '主题 (Subject)'}</Label>
                <Input
                  value={metadata?.subject || ''}
                  onChange={(e) => handleFieldChange('subject', e.target.value)}
                  placeholder={t.metadataPage.subjectPlaceholder || '文档主题'}
                  disabled={processing || saving}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">{t.metadataPage.keywordsLabel || '关键词 (Keywords)'}</Label>
                <Input
                  value={metadata?.keywords || ''}
                  onChange={(e) => handleFieldChange('keywords', e.target.value)}
                  placeholder={t.metadataPage.keywordsPlaceholder || '用逗号分隔'}
                  disabled={processing || saving}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">{t.metadataPage.creatorLabel || '创建者 (Creator)'}</Label>
                <Input
                  value={metadata?.creator || ''}
                  onChange={(e) => handleFieldChange('creator', e.target.value)}
                  placeholder={t.metadataPage.creatorPlaceholder || '创建文档的工具'}
                  disabled={processing || saving}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">{t.metadataPage.producerLabel || '生成工具 (Producer)'}</Label>
                <Input
                  value={metadata?.producer || ''}
                  onChange={(e) => handleFieldChange('producer', e.target.value)}
                  placeholder={t.metadataPage.producerPlaceholder || '生成 PDF 的工具'}
                  disabled={processing || saving}
                />
                <p className="text-[11px] text-muted-foreground">{t.metadataPage.producerHint || '默认为 PDF Master，可自定义'}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">{t.metadataPage.creationDateLabel || '创建时间'}</Label>
                <Input
                  value={formatDate(metadata?.creationDate)}
                  disabled
                  className="cursor-not-allowed bg-muted/50 text-muted-foreground"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-sm">{t.metadataPage.modificationDateLabel || '修改时间'}</Label>
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
                    {t.metadataPage.updating || '更新中...'}
                  </>
                ) : (
                  <>
                    <Edit3 className="mr-1.5 h-4 w-4" />
                    {t.metadataPage.applyChanges || '应用更改'}
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
