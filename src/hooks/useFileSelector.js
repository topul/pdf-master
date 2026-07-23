import { useState, useCallback } from 'react'
import { addHistory } from '../utils/history'

export function useFileSelector(onFileSelect) {
  const [file, setFile] = useState(null)

  const handleSelectFile = useCallback(async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })
    if (result.canceled) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      const fileName = filePath.split(/[\\/]/).pop()
      const fileData = {
        path: filePath,
        name: fileName,
        data: fileResult.data,
        size: fileResult.data.length,
      }
      addHistory(fileData)
      setFile(fileData)
      if (onFileSelect) {
        onFileSelect(fileData)
      }
    }
  }, [onFileSelect])

  const resetFile = useCallback(() => {
    setFile(null)
    if (onFileSelect) {
      onFileSelect(null)
    }
  }, [onFileSelect])

  return { file, setFile, handleSelectFile, resetFile }
}

export function useFileSelectorMultiple() {
  const [files, setFiles] = useState([])

  const handleSelectFiles = useCallback(async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })
    if (result.canceled) return

    const newFiles = []
    for (const filePath of result.filePaths) {
      const fileResult = await window.electronAPI.readFile(filePath)
      if (fileResult.success) {
        const fileName = filePath.split(/[\\/]/).pop()
        const fileData = {
          path: filePath,
          name: fileName,
          data: fileResult.data,
          size: fileResult.data.length,
        }
        addHistory(fileData)
        newFiles.push(fileData)
      }
    }
    setFiles(newFiles)
    return newFiles
  }, [])

  const resetFiles = useCallback(() => {
    setFiles([])
  }, [])

  const addFile = useCallback(async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    })
    if (result.canceled) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      const fileName = filePath.split(/[\\/]/).pop()
      const fileData = {
        path: filePath,
        name: fileName,
        data: fileResult.data,
        size: fileResult.data.length,
      }
      addHistory(fileData)
      setFiles((prev) => [...prev, fileData])
      return fileData
    }
  }, [])

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  return { files, setFiles, handleSelectFiles, resetFiles, addFile, removeFile }
}
