import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PdfViewer from '@/components/PdfViewer.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'

function ViewerPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const t = useTranslations()
  const [fileData, setFileData] = useState(null)
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    if (location.state?.file) {
      setFileData(location.state.file.data)
      setFileName(location.state.file.name)
    }
  }, [location.state])

  const handleBack = () => {
    navigate(-1)
  }

  if (!fileData) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <FileText className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">没有可预览的文件</p>
        <Button onClick={handleBack} size="sm">
          返回
        </Button>
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
      </div>
      <div className="flex-1 overflow-hidden">
        <PdfViewer fileData={fileData} fileName={fileName} />
      </div>
    </div>
  )
}

export default ViewerPage
