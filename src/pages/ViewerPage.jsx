import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, FolderOpen, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PdfViewer from '@/components/PdfViewer.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { addHistory } from '../utils/history'
import useDragDrop from '../hooks/useDragDrop.js'

function ViewerPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const t = useTranslations()
  const [fileData, setFileData] = useState(null)
  const [fileName, setFileName] = useState('')

  useDragDrop((droppedFiles) => {
    if (droppedFiles.length > 0) {
      const f = droppedFiles[0]
      setFileData(f.data)
      setFileName(f.name)
    }
  })

  useEffect(() => {
    if (location.state?.file) {
      setFileData(location.state.file.data)
      setFileName(location.state.file.name)
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

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      const name = filePath.split(/[\\/]/).pop()
      const fileInfo = {
        path: filePath,
        name,
        data: fileResult.data,
        size: fileResult.data.length,
      }
      addHistory(fileInfo)
      setFileData(fileResult.data)
      setFileName(name)
    }
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
      <div className="flex-1 overflow-hidden">
        <PdfViewer fileData={fileData} fileName={fileName} />
      </div>
    </div>
  )
}

export default ViewerPage
