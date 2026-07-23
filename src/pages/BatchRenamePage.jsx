import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Upload,
  FileText,
  FileEdit,
  Download,
  Check,
  RefreshCw,
  Settings,
  AlertCircle,
} from 'lucide-react'
import { useTranslations } from '@/hooks/useLocale.jsx'

export default function BatchRenamePage() {
  const t = useTranslations()
  const [files, setFiles] = useState([])
  const [pattern, setPattern] = useState('prefix_{index}_suffix')
  const [startIndex, setStartIndex] = useState(1)
  const [useOriginalName, setUseOriginalName] = useState(false)
  const [preview, setPreview] = useState([])
  const [renamed, setRenamed] = useState(false)

  const handleSelectFiles = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) return

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
    setFiles((prev) => [...prev, ...newFiles])
    setPreview([])
    setRenamed(false)
  }

  const generatePreview = () => {
    const previews = files.map((file, idx) => {
      const index = startIndex + idx
      let newName = pattern
        .replace(/{index}/g, index.toString())
        .replace(/{Index}/g, index.toString().padStart(2, '0'))
        .replace(/{INDEX}/g, index.toString().padStart(3, '0'))

      if (useOriginalName) {
        const originalName = file.name.replace(/\.[^.]+$/, '')
        newName = newName.replace(/{name}/g, originalName)
      }

      if (!newName.endsWith('.pdf')) {
        newName += '.pdf'
      }

      return {
        original: file.name,
        new: newName,
        path: file.path,
        data: file.data,
      }
    })
    setPreview(previews)
  }

  const handleRename = async () => {
    if (preview.length === 0) {
      generatePreview()
      return
    }

    const dirResult = await window.electronAPI.openDirectory()
    if (dirResult.canceled) return

    const outputDir = dirResult.filePaths[0]
    const results = []

    for (const item of preview) {
      const outputPath = `${outputDir}/${item.new}`
      const writeResult = await window.electronAPI.writeFile(outputPath, item.data)
      results.push({
        name: item.new,
        success: writeResult.success,
        error: writeResult.error,
      })
    }

    const successCount = results.filter((r) => r.success).length
    setRenamed(true)

    if (successCount === results.length) {
      alert(t.batchRename?.success || `成功重命名 ${successCount} 个文件到 ${outputDir}`)
    } else {
      alert(
        `${t.batchRename?.partialSuccess || '部分成功'}: ${successCount}/${results.length}`
      )
    }
  }

  const reset = () => {
    setFiles([])
    setPreview([])
    setRenamed(false)
  }

  const hasDuplicates = () => {
    const names = preview.map((p) => p.new.toLowerCase())
    return new Set(names).size !== names.length
  }

  const patterns = [
    { label: '序号', value: '{index}' },
    { label: '序号(01)', value: '{Index}' },
    { label: '序号(001)', value: '{INDEX}' },
    { label: '原名', value: '{name}' },
  ]

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileEdit className="h-6 w-6 text-primary" />
          {t.batchRename?.title || '批量重命名'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.batchRename?.desc || '批量重命名 PDF 文件'}
        </p>
      </div>

      {files.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="py-8">
            <button
              type="button"
              onClick={handleSelectFiles}
              className="flex w-full flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                {t.common.selectFiles || '选择 PDF 文件（可多选）'}
              </span>
            </button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 文件列表 */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>{t.batchRename?.fileList || '文件列表'}</span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {files.length} {t.batchRename?.files || '个文件'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectFiles}
                    className="h-6 px-2 text-xs"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {t.common.addFiles || '添加'}
                  </Button>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-48 overflow-y-auto">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1 truncate text-sm">
                      {file.name}
                    </div>
                    <button
                      onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive text-xs"
                    >
                      {t.common.delete || '删除'}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 重命名设置 */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t.batchRename?.settings || '重命名设置'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pattern">
                  {t.batchRename?.pattern || '命名模式'}
                </Label>
                <Input
                  id="pattern"
                  value={pattern}
                  onChange={(e) => {
                    setPattern(e.target.value)
                    setPreview([])
                  }}
                  placeholder={t.batchRename?.patternPlaceholder || '如：report_{index}.pdf'}
                />
                <div className="flex flex-wrap gap-2">
                  {patterns.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => {
                        setPattern((prev) => prev + p.value)
                        setPreview([])
                      }}
                      className="px-2 py-1 text-xs border rounded hover:bg-accent"
                    >
                      {p.label}: {p.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="startIndex" className="text-sm">
                    {t.batchRename?.startIndex || '起始序号'}
                  </Label>
                  <Input
                    id="startIndex"
                    type="number"
                    min="1"
                    value={startIndex}
                    onChange={(e) => {
                      setStartIndex(parseInt(e.target.value) || 1)
                      setPreview([])
                    }}
                    className="w-20 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useOriginalName}
                    onChange={(e) => {
                      setUseOriginalName(e.target.checked)
                      setPreview([])
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">
                    {t.batchRename?.includeOriginal || '包含原文件名'}
                  </span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button onClick={generatePreview} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {t.batchRename?.preview || '预览'}
                </Button>
                <Button
                  onClick={handleRename}
                  disabled={preview.length === 0 || hasDuplicates()}
                  className="gap-2"
                >
                  {preview.length === 0 ? (
                    <>
                      <Download className="h-4 w-4" />
                      {t.batchRename?.rename || '开始重命名'}
                    </>
                  ) : (
                    <>
                      <FileEdit className="h-4 w-4" />
                      {t.batchRename?.save || '保存重命名'}
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={reset}>
                  {t.common.reset || '重置'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 预览结果 */}
          {preview.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{t.batchRename?.previewResult || '预览结果'}</span>
                  {hasDuplicates() && (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      {t.batchRename?.duplicateWarning || '存在重复文件名'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">
                          {t.batchRename?.original || '原文件名'}
                        </th>
                        <th className="text-left py-2 px-3 font-medium">
                          {t.batchRename?.newName || '新文件名'}
                        </th>
                        <th className="text-center py-2 px-3 font-medium">
                          {t.batchRename?.status || '状态'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-3 text-muted-foreground truncate max-w-[300px]">
                            {item.original}
                          </td>
                          <td className="py-2 px-3 font-medium truncate max-w-[300px]">
                            {item.new}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {renamed ? (
                              <Check className="h-4 w-4 text-green-500 mx-auto" />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {t.batchRename?.pending || '待处理'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
