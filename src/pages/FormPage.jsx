import React, { useState, useEffect } from 'react'
import {
  FileText,
  Save,
  Loader2,
  FileEdit,
  CheckCircle2,
} from 'lucide-react'
import { fillForm, getFormFields } from '../utils/pdfUtils.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/PageHeader.jsx'
import EmptyState from '@/components/EmptyState.jsx'
import StatusMessage from '@/components/StatusMessage.jsx'
import FileInfoCard from '@/components/FileInfoCard.jsx'

function FormPage() {
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)

  const [fields, setFields] = useState([])
  const [fieldValues, setFieldValues] = useState({})
  const [formLoaded, setFormLoaded] = useState(false)

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
      setCurrentData(fileResult.data)
      setFields([])
      setFieldValues({})
      setFormLoaded(false)
      setStatus(null)
    }
  }

  useEffect(() => {
    if (currentData && !formLoaded) {
      loadFormFields()
    }
  }, [currentData, formLoaded])

  const loadFormFields = async () => {
    try {
      const formFields = await getFormFields(currentData)
      setFields(formFields)
      const values = {}
      formFields.forEach((f) => {
        values[f.name] = f.value || ''
      })
      setFieldValues(values)
      setFormLoaded(true)
      if (formFields.length === 0) {
        setStatus({ type: 'info', message: '该 PDF 不包含可填写的表单域' })
      } else {
        setStatus({ type: 'success', message: `找到 ${formFields.length} 个表单域` })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `加载表单失败：${error.message}` })
    }
  }

  const handleFieldChange = (fieldName, value) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleApply = async () => {
    if (!currentData || fields.length === 0) {
      setStatus({ type: 'error', message: '没有可填写的表单' })
      return
    }

    setProcessing(true)
    try {
      const result = await fillForm(currentData, fieldValues)
      setCurrentData(result)
      setStatus({ type: 'success', message: '表单已填写完成' })
    } catch (error) {
      setStatus({ type: 'error', message: `填写失败：${error.message}` })
    }
    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return
    const saveResult = await window.electronAPI.saveFile({
      defaultPath: file?.name?.replace(/\.pdf$/i, '_filled.pdf') || 'filled.pdf',
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })
    if (saveResult.canceled) return
    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, currentData)
    if (writeResult.success) {
      setStatus({ type: 'success', message: `已保存到：${saveResult.filePath}` })
    } else {
      setStatus({ type: 'error', message: `保存失败：${writeResult.error}` })
    }
  }

  const getFieldTypeLabel = (type) => {
    const labels = {
      TextField: '文本框',
      CheckBox: '复选框',
      Radio: '单选框',
      Dropdown: '下拉框',
      ListBox: '列表框',
      Signature: '签名框',
    }
    return labels[type] || type
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={FileEdit}
        title="填写表单"
        description="填写 PDF 表单域，支持文本框、复选框、单选框等"
      >
        {file && (
          <Button variant="outline" size="sm" onClick={handleSelectFile} disabled={processing}>
            <FileText className="mr-1.5 h-4 w-4" />
            更换文件
          </Button>
        )}
        <Button size="sm" onClick={handleSelectFile} disabled={processing}>
          <FileText className="mr-1.5 h-4 w-4" />
          选择文件
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={!currentData || fields.length === 0 || processing}
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          应用填写
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!currentData || processing}
        >
          <Save className="mr-1.5 h-4 w-4" />
          保存 PDF
        </Button>
      </PageHeader>

      <StatusMessage status={status} />

      {!file ? (
        <EmptyState
          icon={FileEdit}
          title="还没有选择 PDF"
          description="选择一个包含表单的 PDF 文件进行填写"
          actionLabel="选择 PDF 文件"
          onAction={handleSelectFile}
          tips={[
            '支持 AcroForm 表单域',
            '文本框、复选框、单选框',
            '填写后保存为新文件',
          ]}
        />
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          <FileInfoCard
            name={file.name}
            meta={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
            onRemove={!processing ? handleSelectFile : undefined}
          />

          <Card className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b px-4 py-2.5">
              <h3 className="text-sm font-medium">表单域列表</h3>
              <Badge variant="secondary" className="ml-2 text-[10px]">
                {fields.length} 个字段
              </Badge>
            </div>
            <ScrollArea className="flex-1 p-4">
              {!formLoaded ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>正在加载表单...</span>
                  </div>
                </div>
              ) : fields.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                  <FileEdit className="mb-3 h-12 w-12 opacity-30" />
                  <span>该 PDF 不包含可填写的表单域</span>
                  <span className="mt-1 text-xs">这可能是一个普通 PDF 或扫描件</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {fields.map((field, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">
                            {field.name || `字段 ${idx + 1}`}
                          </Label>
                          <Badge variant="outline" className="text-[10px]">
                            {getFieldTypeLabel(field.type)}
                          </Badge>
                        </div>
                        {field.pageIndex !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            第 {field.pageIndex + 1} 页
                          </span>
                        )}
                      </div>

                      {field.type === 'TextField' && (
                        <Input
                          value={fieldValues[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          placeholder="输入文本..."
                          className="text-sm"
                        />
                      )}

                      {field.type === 'CheckBox' && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fieldValues[field.name] === 'Yes'}
                            onChange={(e) => handleFieldChange(field.name, e.target.checked ? 'Yes' : 'Off')}
                            className="h-4 w-4 rounded border-muted-foreground/30 bg-background text-primary focus:ring-primary"
                          />
                          <span className="text-sm">{field.label || '勾选'}</span>
                        </label>
                      )}

                      {field.type === 'Radio' && field.options && field.options.length > 0 && (
                        <div className="space-y-1.5">
                          {field.options.map((opt, optIdx) => (
                            <label
                              key={optIdx}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <input
                                type="radio"
                                name={field.name}
                                value={opt}
                                checked={fieldValues[field.name] === opt}
                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                className="h-4 w-4 border-muted-foreground/30 text-primary focus:ring-primary"
                              />
                              <span className="text-sm">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === 'Dropdown' && field.options && field.options.length > 0 && (
                        <select
                          value={fieldValues[field.name] || ''}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">请选择...</option>
                          {field.options.map((opt, optIdx) => (
                            <option key={optIdx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === 'Signature' && (
                        <div className="rounded border border-dashed p-4 text-center text-sm text-muted-foreground">
                          签名框 - 请使用「PDF 签名」功能添加签名
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      )}
    </div>
  )
}

export default FormPage
