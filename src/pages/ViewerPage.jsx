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
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { saveAs } from 'file-saver'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import PdfViewer from '@/components/PdfViewer.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { useAnnotations, COLORS, ANNOT_TYPES } from '@/hooks/useAnnotations.jsx'
import { setCurrentFile } from '@/hooks/useCurrentFile.jsx'
import { addHistory } from '../utils/history'
import {
  compressPdf,
  extractPdfText,
  renderPdfToImages,
} from '../utils/pdfUtils.js'
import useDragDrop from '../hooks/useDragDrop.js'
import { cn } from '@/lib/utils'

// 阅读器快捷入口：体现「阅读+编辑一体化」
// - direct: 在阅读器内直接执行并下载结果，不跳转
// - navigate: 需要复杂 UI 的操作，携带文件上下文跳转到工具页
const QUICK_ENTRIES = [
  { id: 'compress', kind: 'direct', icon: FileDown, labelKey: 'qtCompress' },
  { id: 'extractText', kind: 'direct', icon: FileType, labelKey: 'qtExtractText' },
  { id: 'exportImages', kind: 'direct', icon: FileImage, labelKey: 'qtExportImages' },
  { id: 'edit', kind: 'navigate', path: '/edit', icon: PencilLine, labelKey: 'qtEdit' },
  { id: 'encrypt', kind: 'navigate', path: '/encrypt', icon: Lock, labelKey: 'qtEncrypt' },
  { id: 'print', kind: 'navigate', path: '/print', icon: Printer, labelKey: 'qtPrint' },
]

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

  // 文件标识：用于批注持久化定位。优先用绝对路径；无路径时用「名称_大小」兜底
  const fileKey = useMemo(() => {
    if (filePath) return filePath.replace(/[\\/]/g, '_')
    if (fileName && fileData) return `${fileName}_${fileData.length}`
    return ''
  }, [filePath, fileName, fileData])

  // 批注状态（按 fileKey 持久化到 localStorage，切换文件自动加载对应批注）
  const annot = useAnnotations(fileKey)
  const [annotActive, setAnnotActive] = useState(false)
  const [annotTool, setAnnotTool] = useState('hand')
  const [annotColor, setAnnotColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)
  const [inlineStatus, setInlineStatus] = useState(null) // 内联操作进度提示

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
      // 批注由 useAnnotations(fileKey) 自动按文件加载，无需手动清空
    }
  }

  // 将当前文件带入目标工具页面
  // 通过 useCurrentFile 上下文传递，目标工具页加载时自动读取
  const handleNavigateTool = (toolPath) => {
    if (!fileData) return
    const fileObj = {
      path: filePath,
      name: fileName,
      data: fileData,
      size: fileData.length,
    }
    setCurrentFile(fileObj)
    navigate(toolPath)
  }

  // 在阅读器内直接执行操作并下载结果，不跳转
  const handleDirectAction = useCallback(
    async (actionId) => {
      if (!fileData) return
      setInlineStatus({ type: 'info', message: (t.viewerPage?.processing || '处理中...'), actionId })
      try {
        if (actionId === 'compress') {
          const compressed = await compressPdf(fileData, 'recommended')
          const blob = new Blob([new Uint8Array(compressed)], { type: 'application/pdf' })
          saveAs(blob, (fileName.replace(/\.pdf$/i, '') || 'document') + '_compressed.pdf')
        } else if (actionId === 'extractText') {
          const result = await extractPdfText(fileData)
          const blob = new Blob([result.fullText], { type: 'text/plain;charset=utf-8' })
          saveAs(blob, (fileName.replace(/\.pdf$/i, '') || 'document') + '.txt')
        } else if (actionId === 'exportImages') {
          const images = await renderPdfToImages(fileData, 2.0)
          // 逐张下载（图片数量通常不多）
          for (let i = 0; i < images.length; i++) {
            const resp = await fetch(images[i].url)
            const blob = await resp.blob()
            saveAs(blob, `${(fileName.replace(/\.pdf$/i, '') || 'document')}_page_${i + 1}.png`)
          }
          // 释放 blob url
          images.forEach((img) => URL.revokeObjectURL(img.url))
        }
        setInlineStatus({ type: 'success', message: (t.viewerPage?.actionDone || '已完成并下载'), actionId })
        // 3 秒后自动清除成功提示
        setTimeout(() => setInlineStatus((s) => (s?.type === 'success' ? null : s)), 3000)
      } catch (err) {
        console.error('Direct action error:', err)
        setInlineStatus({ type: 'error', message: (t.viewerPage?.actionFailed || '处理失败：{error}').replace('{error}', err.message), actionId })
      }
    },
    [fileData, fileName, t]
  )

  // 快捷入口统一分发
  const handleQuickEntry = (entry) => {
    if (entry.kind === 'navigate') {
      handleNavigateTool(entry.path)
    } else {
      handleDirectAction(entry.id)
    }
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
            <TooltipContent>{t.viewerPage?.quickToolsHint || '压缩/提取/导出直接执行，编辑/打印跳转工具页'}</TooltipContent>
          </Tooltip>

          {quickEntries.map((entry) => {
            const { id, kind, icon: EntryIcon, label } = entry
            const isRunning = inlineStatus?.actionId === id && inlineStatus?.type === 'info'
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    onClick={() => handleQuickEntry(entry)}
                    disabled={isRunning}
                  >
                    {isRunning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <EntryIcon className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden md:inline">{label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            )
          })}

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

              {/* 操作按钮 */}
              <div className="mx-1 h-5 w-px bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      if (window.confirm(t.viewerPage?.annotClearConfirm || '确定清空当前文件的所有批注？此操作不可撤销。')) {
                        annot.clearAll()
                      }
                    }}
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
            ? (t.viewerPage?.annotTipText || '点击页面后在输入框中输入文字，按 Enter 确认')
            : (t.viewerPage?.annotTipNote || '点击页面添加便签')}
        </div>
      )}

      {/* 内联操作状态提示条 */}
      {inlineStatus && (
        <div
          className={cn(
            'flex items-center gap-2 border-b px-4 py-1.5 text-xs',
            inlineStatus.type === 'success' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            inlineStatus.type === 'error' && 'bg-destructive/10 text-destructive',
            inlineStatus.type === 'info' && 'bg-primary/5 text-muted-foreground'
          )}
        >
          {inlineStatus.type === 'info' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {inlineStatus.type === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
          {inlineStatus.type === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
          <span className="flex-1">{inlineStatus.message}</span>
          {inlineStatus.type !== 'info' && (
            <button
              className="rounded p-0.5 hover:bg-accent"
              onClick={() => setInlineStatus(null)}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <PdfViewer fileData={fileData} fileName={fileName} annotationProps={annotationProps} />
      </div>
    </div>
  )
}

export default ViewerPage
