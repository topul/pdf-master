import React, { useState, useCallback, useRef, useEffect } from 'react'
import { FileUp, X } from 'lucide-react'
import { addHistory } from '../utils/history'

export function DragDropProvider({ children }) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (e.dataTransfer?.items?.length > 0) {
      const hasFiles = Array.from(e.dataTransfer.items).some(
        (item) => item.kind === 'file'
      )
      if (hasFiles) {
        setIsDragging(true)
      }
    }
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      setIsDragging(false)
      dragCounter.current = 0
    }
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0

    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return

    const pdfFiles = Array.from(files).filter((f) =>
      f.name.toLowerCase().endsWith('.pdf')
    )
    if (pdfFiles.length === 0) return

    const fileDataList = await window.electronAPI.readDroppedFiles(pdfFiles)

    const validFiles = fileDataList.filter((f) => f && f.data)
    if (validFiles.length === 0) return

    for (const f of validFiles) {
      if (f.path) {
        addHistory(f)
      }
    }

    window.dispatchEvent(
      new CustomEvent('files:dropped', { detail: { files: validFiles } })
    )
  }, [])

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop])

  return (
    <>
      {children}
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-background/95 px-12 py-10 shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <FileUp className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">松开鼠标上传文件</div>
              <div className="mt-1 text-sm text-muted-foreground">
                支持 PDF 文件
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DragDropProvider
