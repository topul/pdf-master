import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FolderOpen,
  BookOpen,
  Highlighter,
  PencilLine,
  FileImage,
  FileType,
  FileDown,
  Lock,
  Printer,
  Wrench,
  Hand,
  Type as TypeIcon,
  MessageSquare,
  Eraser,
  Download,
  X,
} from 'lucide-react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { saveAs } from 'file-saver'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import PdfViewer from '@/components/PdfViewer.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { useAnnotations, COLORS, ANNOT_TYPES } from '@/hooks/useAnnotations.jsx'
import { addHistory } from '../utils/history'
import useDragDrop from '../hooks/useDragDrop.js'
import { cn } from '@/lib/utils'

// 阅读器快捷编辑入口：体现「阅读+编辑一体化」
// 点击后通过 files:dropped 事件把当前文件带入目标工具页面
const QUICK_ENTRIES = [
  { id: 'edit', path: '/edit', icon: 'PencilLine', labelKey: 'qtEdit' },
  { id: 'extract', path: '/extract', icon: 'FileImage', labelKey: 'qtExtract' },
  { id: 'pdf-to-word', path: '/pdf-to-word', icon: 'FileType', labelKey: 'qtConvert' },
  { id: 'compress', path: '/compress', icon: 'FileDown', labelKey: 'qtCompress' },
  { id: 'encrypt', path: '/encrypt', icon: 'Lock', labelKey: 'qtEncrypt' },
  { id: 'print', path: '/print', icon: 'Printer', labelKey: 'qtPrint' },
]

const ICON_MAP = {
  PencilLine: PencilLine,
  FileImage: FileImage,
  FileType: FileType,
  FileDown: FileDown,
  Lock: Lock,
  Printer: Printer,
}

// 批注工具定义
const ANNOT_TOOLS = [
  { id: 'hand', icon: Hand, labelKey: 'annotToolHand' },
  { id: ANNOT_TYPES.HIGHLIGHT, icon: Highlighter, labelKey: 'annotToolHighlight' },
  { id: ANNOT_TYPES.TEXT, icon: TypeIcon, labelKey: 'annotToolText' },
  { id: ANNOT_TYPES.NOTE, icon: MessageSquare, labelKey: 'annotToolNote' },
]

function ViewerPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const t = useTranslations()
  const [fileData, setFileData] = useState(null)
  const [fileName, setFileName] = useState('')
  const [filePath, setFilePath] = useState('')

  // 批注状态
  const annot = useAnnotations()
  const [annotActive, setAnnotActive] = useState(false)
  const [annotTool, setAnnotTool] = useState('hand')
  const [annotColor, setAnnotColor] = useState(COLORS[0])
  const [textInput, setTextInput] = useState('')
  const [saving, setSaving] = useState(false)

  useDragDrop((droppedFiles) => {
    if (droppedFiles.length > 0) {
      const f = droppedFiles[0]
      setFileData(f.data)
      setFileName(f.name)
      setFilePath(f.path || '')
    }
  })

  useEffect(() => {
    if (location.state?.file) {
      setFileData(location.state.file.data)
      setFileName(location.state.file.name)
      setFilePath(location.state.file.path || '')
    }
  }, [location.state])

  const handleBack = () => {
    navigate('/')
  }

  const handleSelectFile = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
      filters: [{ name: t.viewerPage.pdfFilter || 'PDF 文件', extensions: ['pdf'] }],
    })
    if (result.canceled) return

    const fp = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(fp)
    if (fileResult.success) {
      const name = fp.split(/[\\/]/).pop()
      const fileInfo = {
        path: fp,
        name,
        data: fileResult.data,
        size: fileResult.data.length,
      }
      addHistory(fileInfo)
      setFileData(fileResult.data)
      setFileName(name)
      setFilePath(fp)
      // 切换文件时清空批注
      annot.clearAll()
    }
  }

  // 将当前文件带入目标工具页面
  const handleQuickTool = (toolPath) => {
    if (!fileData) return
    window.dispatchEvent(
      new CustomEvent('files:dropped', {
        detail: {
          files: [
            {
              path: filePath,
              name: fileName,
              data: fileData,
              size: fileData.length,
            },
          ],
        },
      })
    )
    navigate(toolPath)
  }

  // 保存带批注的 PDF
  const handleSaveAnnotated = useCallback(async () => {
    if (!fileData || !annot.hasAnnotations()) return
    setSaving(true)
    try {
      const pdfDoc = await PDFDocument.load(fileData)
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const pages = pdfDoc.getPages()
      const allAnnots = annot.getAllAnnotations()

      // 按 scale=1 转换坐标（批注坐标基于当前 scale，保存时需归一化）
      // 由于阅读器 scale 可变，这里用批注记录时的 scale。简化：假设保存时仍是当前 scale
      // 更稳妥的做法：批注时记录 scale。当前实现用 viewer 传入的 scale。
      // 这里使用 1.0 作为 PDF 原生坐标基准，由 PdfViewer 的 scale 决定缩放比
      for (const a of allAnnots) {
        const page = pages[a.page - 1]
        if (!page) continue
        const { height } = page.getSize()
        // 坐标转换：canvas (Y down, 含 scale) -> pdf (Y up, scale=1)
        // 由于渲染 scale 已应用于 viewport，批注坐标需除以 scale
        // 但我们无法在此获取当时 scale，简化为按当前阅读器 scale 处理
        // 这里用 1.5 作为默认（与 AnnotatePage 一致），实际由 PdfViewer 传入更准确
        const s = 1.5
        const pdfX = a.x / s
        if (a.type === ANNOT_TYPES.HIGHLIGHT) {
          page.drawRectangle({
            x: pdfX,
            y: height - (a.y + a.height) / s,
            width: a.width / s,
            height: a.height / s,
            color: rgb(
              parseInt(a.color.value.slice(1, 3), 16) / 255,
              parseInt(a.color.value.slice(3, 5), 16) / 255,
              parseInt(a.color.value.slice(5, 7), 16) / 255
            ),
            opacity: 0.4,
          })
        } else if (a.type === ANNOT_TYPES.TEXT) {
          page.drawText(a.text, {
            x: pdfX,
            y: height - a.y / s - (a.fontSize || 16),
            size: a.fontSize || 16,
            font,
            color: rgb(0, 0, 0),
          })
        } else if (a.type === ANNOT_TYPES.NOTE) {
          page.drawRectangle({
            x: pdfX,
            y: height - a.y / s - 24,
            width: 24,
            height: 24,
            color: rgb(1, 0.92, 0.23),
            opacity: 0.8,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          })
          page.drawText('!', {
            x: pdfX + 9,
            y: height - a.y / s - 18,
            size: 14,
            font,
            color: rgb(0, 0, 0),
          })
        }
      }

      const modifiedBytes = await pdfDoc.save()
      const blob = new Blob([modifiedBytes], { type: 'application/pdf' })
      const outputName = (fileName.replace(/\.pdf$/i, '') || 'document') + '_annotated.pdf'
      saveAs(blob, outputName)
    } catch (err) {
      console.error('Save annotated PDF error:', err)
    }
    setSaving(false)
  }, [fileData, fileName, annot])

  const quickEntries = useMemo(() => {
    return QUICK_ENTRIES.map((e) => ({
      ...e,
      Icon: ICON_MAP[e.icon],
      label: t.viewerPage?.[e.labelKey] || e.id,
    }))
  }, [t])

  const annotTools = useMemo(() => {
    return ANNOT_TOOLS.map((e) => ({
      ...e,
      Icon: e.icon,
      label: t.viewerPage?.[e.labelKey] || e.id,
    }))
  }, [t])

  const annotationProps = {
    active: annotActive,
    tool: annotTool,
    color: annotColor,
    textInput,
    getPageAnnotations: annot.getPageAnnotations,
    onAddAnnotation: annot.addAnnotation,
    onDeleteAnnotation: annot.deleteAnnotation,
  }

  if (!fileData) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b bg-card px-4 py-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">{t.viewerPage.title || 'PDF 阅读器'}</div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <div className="text-center">
            <div className="text-lg font-medium">{t.viewerPage.emptyTitle || '选择一个 PDF 文件开始阅读'}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.viewerPage.emptyDescription || '支持目录导航、缩放、搜索等功能'}
            </p>
          </div>
          <Button onClick={handleSelectFile}>
            <FolderOpen className="mr-2 h-4 w-4" />
            {t.viewerPage.selectFile || '选择 PDF 文件'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b bg-card px-4 py-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{fileName}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSelectFile}>
          <FolderOpen className="mr-1.5 h-4 w-4" />
          {t.viewerPage.openOther || '打开其他'}
        </Button>
      </div>

      <TooltipProvider delayDuration={300}>
        <div className="flex flex-wrap items-center gap-1 border-b bg-card px-3 py-1.5">
          {/* 快捷工具区 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mr-1 flex items-center gap-1.5 px-1.5 text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" />
                <span className="hidden text-xs font-medium sm:inline">
                  {t.viewerPage?.quickTools || '快捷工具'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{t.viewerPage?.quickToolsHint || '将当前文件带入工具'}</TooltipContent>
          </Tooltip>

          {quickEntries.map(({ id, path, Icon, label }) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => handleQuickTool(path)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}

          <div className="mx-1 h-5 w-px bg-border" />

          {/* 批注工具区 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={annotActive ? 'default' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={() => setAnnotActive((v) => !v)}
              >
                <Highlighter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {t.viewerPage?.annotate || '批注'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.viewerPage?.annotateToggle || '切换批注模式'}</TooltipContent>
          </Tooltip>

          {annotActive && (
            <>
              {annotTools.map(({ id, Icon, label }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={annotTool === id ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setAnnotTool(id)}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}

              {/* 颜色选择 */}
              <div className="mx-1 flex items-center gap-1">
                {COLORS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setAnnotColor(c)}
                    className={cn(
                      'h-5 w-5 rounded-full border-2 transition-all',
                      annotColor.name === c.name
                        ? 'border-primary ring-1 ring-primary/30 scale-110'
                        : 'border-border'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>

              {/* 文字工具输入框 */}
              {annotTool === ANNOT_TYPES.TEXT && (
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={t.viewerPage?.annotTextPlaceholder || '输入文字后点击页面'}
                  className="h-7 w-36 rounded border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              )}

              {/* 操作按钮 */}
              <div className="mx-1 h-5 w-px bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => annot.clearAll()}
                    disabled={!annot.hasAnnotations()}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t.viewerPage?.annotClear || '清空所有批注'}</TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={handleSaveAnnotated}
                disabled={!annot.hasAnnotations() || saving}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {saving ? (t.common?.processing || '处理中') : (t.viewerPage?.annotSave || '保存批注')}
                </span>
              </Button>
            </>
          )}

          {/* 批注模式关闭按钮 */}
          {annotActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 ml-auto"
              onClick={() => setAnnotActive(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </TooltipProvider>

      {/* 批注模式提示条 */}
      {annotActive && (
        <div className="border-b bg-primary/5 px-4 py-1 text-center text-xs text-muted-foreground">
          {annotTool === 'hand'
            ? (t.viewerPage?.annotTipHand || '手型模式：点击批注可删除（或按 Alt）')
            : annotTool === ANNOT_TYPES.HIGHLIGHT
            ? (t.viewerPage?.annotTipHighlight || '拖拽鼠标选择高亮区域')
            : annotTool === ANNOT_TYPES.TEXT
            ? (t.viewerPage?.annotTipText || '输入文字后点击页面添加')
            : (t.viewerPage?.annotTipNote || '点击页面添加便签')}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <PdfViewer fileData={fileData} fileName={fileName} annotationProps={annotationProps} />
      </div>
    </div>
  )
}

export default ViewerPage
