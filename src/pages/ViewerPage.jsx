import React, { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import PdfViewer from '@/components/PdfViewer.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { addHistory } from '../utils/history'
import useDragDrop from '../hooks/useDragDrop.js'

// 阅读器快捷编辑入口：体现「阅读+编辑一体化」
// 点击后通过 files:dropped 事件把当前文件带入目标工具页面
const QUICK_ENTRIES = [
  { id: 'annotate', path: '/annotate', icon: 'Highlighter', labelKey: 'qtAnnotate' },
  { id: 'edit', path: '/edit', icon: 'PencilLine', labelKey: 'qtEdit' },
  { id: 'extract', path: '/extract', icon: 'FileImage', labelKey: 'qtExtract' },
  { id: 'pdf-to-word', path: '/pdf-to-word', icon: 'FileType', labelKey: 'qtConvert' },
  { id: 'compress', path: '/compress', icon: 'FileDown', labelKey: 'qtCompress' },
  { id: 'encrypt', path: '/encrypt', icon: 'Lock', labelKey: 'qtEncrypt' },
  { id: 'print', path: '/print', icon: 'Printer', labelKey: 'qtPrint' },
]

const ICON_MAP = {
  Highlighter: Highlighter,
  PencilLine: PencilLine,
  FileImage: FileImage,
  FileType: FileType,
  FileDown: FileDown,
  Lock: Lock,
  Printer: Printer,
}

function ViewerPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const t = useTranslations()
  const [fileData, setFileData] = useState(null)
  const [fileName, setFileName] = useState('')
  const [filePath, setFilePath] = useState('')

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
    }
  }

  // 将当前文件带入目标工具页面：先派发 files:dropped 事件，
  // 目标页面的 useDragDrop 会接收文件，再跳转路由
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

  const quickEntries = useMemo(() => {
    return QUICK_ENTRIES.map((e) => ({
      ...e,
      Icon: ICON_MAP[e.icon],
      label: t.viewerPage?.[e.labelKey] || e.id,
    }))
  }, [t])

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

      {/* 快捷工具栏：阅读时直接调用编辑/转换/压缩等工具 */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-1 overflow-x-auto border-b bg-card px-3 py-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mr-1 flex items-center gap-1.5 px-1.5 text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {t.viewerPage?.quickTools || '快捷工具'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{t.viewerPage?.quickToolsHint || '将当前文件带入工具'}</TooltipContent>
          </Tooltip>

          <div className="mx-1 h-5 w-px bg-border" />

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
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      <div className="flex-1 overflow-hidden">
        <PdfViewer fileData={fileData} fileName={fileName} />
      </div>
    </div>
  )
}

export default ViewerPage
