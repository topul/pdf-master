import React, { useState, useRef, useEffect } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { saveAs } from 'file-saver'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Upload,
  FileText,
  Type as TextInputIcon,
  CheckSquare,
  Circle as CircleIcon,
  ChevronDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
  MousePointerClick,
  ListChecks,
} from 'lucide-react'
import { useTranslations } from '@/hooks/useLocale.jsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const FIELD_TYPES = {
  TEXT: 'text',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  DROPDOWN: 'dropdown',
}

export default function FormCreatePage() {
  const t = useTranslations()
  const [file, setFile] = useState(null)
  const [pdf, setPdf] = useState(null)
  const [pdfBytes, setPdfBytes] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [fields, setFields] = useState({}) // { pageNum: [...] }
  const [currentType, setCurrentType] = useState(FIELD_TYPES.TEXT)
  const [fieldName, setFieldName] = useState('')
  const [fieldValue, setFieldValue] = useState('')
  const [dropdownOptions, setDropdownOptions] = useState('')
  const [radioGroup, setRadioGroup] = useState('')
  const [saving, setSaving] = useState(false)
  const [scale, setScale] = useState(1.5)

  const canvasRef = useRef(null)
  const overlayRef = useRef(null)

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const arrayBuffer = await selectedFile.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    setPdfBytes(bytes)

    const pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise
    setPdf(pdfDoc)
    setTotalPages(pdfDoc.numPages)
    setCurrentPage(1)
    setFields({})
  }

  const renderPage = async () => {
    if (!pdf || !canvasRef.current) return

    const page = await pdf.getPage(currentPage)
    const viewport = page.getViewport({ scale })

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise

    drawOverlay()
  }

  const drawOverlay = () => {
    if (!overlayRef.current) return
    const overlay = overlayRef.current
    const canvas = canvasRef.current
    if (!canvas) return

    overlay.width = canvas.width
    overlay.height = canvas.height
    const ctx = overlay.getContext('2d')
    ctx.clearRect(0, 0, overlay.width, overlay.height)

    const pageFields = fields[currentPage] || []
    for (const field of pageFields) {
      const w = field.width
      const h = field.height
      const x = field.x
      const y = field.y

      // 边框
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 2])
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])

      // 半透明背景
      ctx.fillStyle = 'rgba(37, 99, 235, 0.08)'
      ctx.fillRect(x, y, w, h)

      // 类型标识
      ctx.fillStyle = '#2563eb'
      ctx.font = '11px sans-serif'
      const label = `${field.type[0].toUpperCase()}${field.name ? ': ' + field.name : ''}`
      ctx.fillText(label.substring(0, 30), x + 2, y - 4 > 10 ? y - 4 : y + 12)

      // 内部图标
      if (field.type === FIELD_TYPES.CHECKBOX) {
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 2, y + 2, w - 4, h - 4)
      } else if (field.type === FIELD_TYPES.RADIO) {
        ctx.beginPath()
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2 - 2, 0, Math.PI * 2)
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = 1
        ctx.stroke()
      } else if (field.type === FIELD_TYPES.DROPDOWN) {
        // 下拉箭头
        ctx.fillStyle = '#2563eb'
        ctx.beginPath()
        ctx.moveTo(x + w - 12, y + h / 2 - 3)
        ctx.lineTo(x + w - 6, y + h / 2 + 3)
        ctx.lineTo(x + w - 18, y + h / 2 + 3)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  useEffect(() => {
    renderPage()
  }, [currentPage, pdf, scale, fields])

  const getMousePos = (e) => {
    const canvas = overlayRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const handleCanvasClick = (e) => {
    const pos = getMousePos(e)
    const name = fieldName || `field_${Date.now().toString(36)}`
    const field = {
      id: Date.now() + Math.random(),
      type: currentType,
      x: pos.x,
      y: pos.y,
      width: currentType === FIELD_TYPES.CHECKBOX || currentType === FIELD_TYPES.RADIO ? 20 : 150,
      height: currentType === FIELD_TYPES.CHECKBOX || currentType === FIELD_TYPES.RADIO ? 20 : 24,
      name,
      value: fieldValue,
      options: currentType === FIELD_TYPES.DROPDOWN
        ? dropdownOptions.split('\n').filter((s) => s.trim())
        : [],
      radioGroup: currentType === FIELD_TYPES.RADIO ? (radioGroup || 'group1') : '',
    }
    setFields((prev) => {
      const list = prev[currentPage] || []
      return { ...prev, [currentPage]: [...list, field] }
    })
    setFieldName('')
    setFieldValue('')
  }

  const deleteField = (id) => {
    setFields((prev) => {
      const list = prev[currentPage] || []
      return { ...prev, [currentPage]: list.filter((f) => f.id !== id) }
    })
  }

  const clearPageFields = () => {
    setFields((prev) => ({ ...prev, [currentPage]: [] }))
  }

  const saveFormPdf = async () => {
    if (!pdfBytes) return
    setSaving(true)
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const form = pdfDoc.getForm()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const pages = pdfDoc.getPages()

      let counter = 0
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const { height } = page.getSize()
        const pageFields = fields[i + 1] || []

        for (const field of pageFields) {
          counter++
          // 坐标转换
          const x = field.x / scale
          const y = height - (field.y / scale) - field.height / scale
          const w = field.width / scale
          const h = field.height / scale

          try {
            if (field.type === FIELD_TYPES.TEXT) {
              const text = form.createTextField(field.name)
              text.addToPage(page, { x, y, width: w, height: h, font, fontSize: 12 })
              if (field.value) {
                text.setText(field.value)
              }
            } else if (field.type === FIELD_TYPES.CHECKBOX) {
              const cb = form.createCheckBox(field.name)
              cb.addToPage(page, { x, y, width: w, height: h })
              if (field.value === 'true' || field.value === 'yes') {
                cb.check()
              }
            } else if (field.type === FIELD_TYPES.RADIO) {
              // 同组共享 radio
              const group = form.createRadioGroup(
                field.radioGroup || `group_${counter}`
              )
              const opt = group.addOptionToPage(field.name || `opt_${counter}`, page, {
                x, y, width: w, height: h,
              })
              if (field.value === field.name) {
                opt.select()
              }
            } else if (field.type === FIELD_TYPES.DROPDOWN) {
              const dd = form.createDropdown(field.name)
              dd.addToPage(page, { x, y, width: w, height: h, font, fontSize: 12 })
              if (field.options.length > 0) {
                dd.setOptions(field.options)
                if (field.value) {
                  dd.select(field.value)
                }
              }
            }
          } catch (e) {
            console.error('Add field error:', e, field)
          }
        }
      }

      // 需要更新字段外观
      form.updateFieldAppearances()

      const modifiedBytes = await pdfDoc.save()
      const blob = new Blob([modifiedBytes], { type: 'application/pdf' })
      const fileName = (file?.name?.replace(/\.pdf$/i, '') || 'document') + '_form.pdf'
      saveAs(blob, fileName)
    } catch (err) {
      console.error('Save form PDF error:', err)
      alert(t.formCreate?.error || '保存失败，请重试')
    }
    setSaving(false)
  }

  const reset = () => {
    setFile(null)
    setPdf(null)
    setPdfBytes(null)
    setFields({})
    setCurrentPage(1)
    setTotalPages(0)
  }

  const tools = [
    { type: FIELD_TYPES.TEXT, icon: TextInputIcon, label: t.formCreate?.textField || '文本框' },
    { type: FIELD_TYPES.CHECKBOX, icon: CheckSquare, label: t.formCreate?.checkbox || '复选框' },
    { type: FIELD_TYPES.RADIO, icon: CircleIcon, label: t.formCreate?.radio || '单选框' },
    { type: FIELD_TYPES.DROPDOWN, icon: ChevronDown, label: t.formCreate?.dropdown || '下拉框' },
  ]

  const pageFields = fields[currentPage] || []

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-primary" />
          {t.formCreate?.title || '表单创建'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.formCreate?.desc || '在 PDF 上添加表单字段（文本框、复选框等）'}
        </p>
      </div>

      {!file ? (
        <Card>
          <CardContent className="py-8">
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                {t.common.selectFile || '选择 PDF 文件'}
              </span>
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            </label>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* 左侧工具栏 */}
          <div className="space-y-4">
            <Card>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">{file.name}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  {t.common.change || '更换'}
                </Button>
              </CardContent>
            </Card>

            {/* 字段类型 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t.formCreate?.fieldType || '字段类型'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tools.map((tool) => {
                  const Icon = tool.icon
                  const active = currentType === tool.type
                  return (
                    <button
                      key={tool.type}
                      onClick={() => setCurrentType(tool.type)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tool.label}
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            {/* 字段属性 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t.formCreate?.fieldProps || '字段属性'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fieldName" className="text-xs">
                    {t.formCreate?.fieldName || '字段名称'}
                  </Label>
                  <Input
                    id="fieldName"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder={t.formCreate?.fieldNamePlaceholder || '英文标识（如 name）'}
                    className="text-sm"
                  />
                </div>

                {currentType === FIELD_TYPES.TEXT && (
                  <div className="space-y-1.5">
                    <Label htmlFor="fieldValue" className="text-xs">
                      {t.formCreate?.defaultValue || '默认值（可选）'}
                    </Label>
                    <Input
                      id="fieldValue"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      placeholder={t.formCreate?.valuePlaceholder || '预填内容'}
                      className="text-sm"
                    />
                  </div>
                )}

                {currentType === FIELD_TYPES.CHECKBOX && (
                  <div className="space-y-1.5">
                    <Label htmlFor="checkboxValue" className="text-xs">
                      {t.formCreate?.defaultState || '默认状态'}
                    </Label>
                    <select
                      id="checkboxValue"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm bg-background"
                    >
                      <option value="">{t.formCreate?.unchecked || '未选中'}</option>
                      <option value="true">{t.formCreate?.checked || '选中'}</option>
                    </select>
                  </div>
                )}

                {currentType === FIELD_TYPES.RADIO && (
                  <div className="space-y-1.5">
                    <Label htmlFor="radioGroup" className="text-xs">
                      {t.formCreate?.radioGroup || '单选组名'}
                    </Label>
                    <Input
                      id="radioGroup"
                      value={radioGroup}
                      onChange={(e) => setRadioGroup(e.target.value)}
                      placeholder={t.formCreate?.radioGroupPlaceholder || '同组单选互斥'}
                      className="text-sm"
                    />
                  </div>
                )}

                {currentType === FIELD_TYPES.DROPDOWN && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dropdownOptions" className="text-xs">
                      {t.formCreate?.options || '选项（每行一个）'}
                    </Label>
                    <textarea
                      id="dropdownOptions"
                      value={dropdownOptions}
                      onChange={(e) => setDropdownOptions(e.target.value)}
                      placeholder={t.formCreate?.optionsPlaceholder || '选项1\n选项2\n选项3'}
                      rows={4}
                      className="w-full border rounded px-2 py-1 text-sm bg-background"
                    />
                  </div>
                )}

                <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
                  <MousePointerClick className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {t.formCreate?.clickHint || '点击 PDF 预览添加字段'}
                </p>
              </CardContent>
            </Card>

            {/* 操作 */}
            <div className="flex gap-2">
              <Button onClick={saveFormPdf} disabled={saving} className="flex-1 gap-2">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t.formCreate?.save || '保存表单 PDF'}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={clearPageFields}
                title={t.formCreate?.clearPage || '清空本页字段'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* 当前页字段列表 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{t.formCreate?.fieldList || '字段列表'}</span>
                  <span className="text-xs text-muted-foreground">
                    {pageFields.length} {t.formCreate?.fields || '项'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pageFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    {t.formCreate?.empty || '暂无字段'}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {pageFields.map((field, idx) => {
                      const Icon =
                        field.type === FIELD_TYPES.TEXT
                          ? TextInputIcon
                          : field.type === FIELD_TYPES.CHECKBOX
                          ? CheckSquare
                          : field.type === FIELD_TYPES.RADIO
                          ? CircleIcon
                          : ChevronDown
                      return (
                        <div
                          key={field.id}
                          className="flex items-center gap-2 p-2 rounded-md border bg-card/50"
                        >
                          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{field.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {field.type}
                              {field.value ? ` · ${field.value}` : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteField(field.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧 PDF 预览 */}
          <div className="space-y-3">
            <Card>
              <CardContent className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {t.common.page || '第'} {currentPage} / {totalPages}{' '}
                    {t.common.pageSuffix || '页'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                  >
                    -
                  </Button>
                  <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.min(3, scale + 0.25))}
                  >
                    +
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="relative bg-muted/30 rounded-lg border overflow-auto max-h-[700px] flex items-center justify-center p-4">
              <div className="relative inline-block">
                <canvas ref={canvasRef} className="block shadow-md" />
                <canvas
                  ref={overlayRef}
                  className="absolute inset-0 cursor-crosshair"
                  onClick={handleCanvasClick}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {t.formCreate?.clickTip || '点击页面任意位置添加字段，右侧字段列表可管理'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
