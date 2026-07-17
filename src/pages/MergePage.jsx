import React, { useState } from 'react'
import { mergePdfs, getPdfInfo } from '../utils/pdfUtils.js'

function MergePage() {
  const [files, setFiles] = useState([])
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)

  const handleAddFiles = async () => {
    const result = await window.electronAPI.openFiles()
    if (result.canceled) return

    const newFiles = []
    for (const filePath of result.filePaths) {
      const fileResult = await window.electronAPI.readFile(filePath)
      if (fileResult.success) {
        try {
          const info = await getPdfInfo(fileResult.data)
          const fileName = filePath.split(/[\\/]/).pop()
          newFiles.push({
            path: filePath,
            name: fileName,
            data: fileResult.data,
            pageCount: info.pageCount,
          })
        } catch (e) {
          console.error('Failed to load PDF:', e)
        }
      }
    }
    setFiles([...files, ...newFiles])
    setStatus(null)
  }

  const handleRemoveFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
  }

  const handleMoveUp = (index) => {
    if (index === 0) return
    const newFiles = [...files]
    ;[newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]]
    setFiles(newFiles)
  }

  const handleMoveDown = (index) => {
    if (index === files.length - 1) return
    const newFiles = [...files]
    ;[newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]]
    setFiles(newFiles)
  }

  const handleClear = () => {
    setFiles([])
    setStatus(null)
  }

  const handleMerge = async () => {
    if (files.length < 2) {
      setStatus({ type: 'error', message: '请至少添加 2 个 PDF 文件' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在合并 PDF 文件...' })

    try {
      const mergedData = await mergePdfs(files.map((f) => f.data))

      const saveResult = await window.electronAPI.saveFile({
        defaultPath: 'merged.pdf',
      })

      if (saveResult.canceled) {
        setProcessing(false)
        setStatus(null)
        return
      }

      const writeResult = await window.electronAPI.writeFile(saveResult.filePath, mergedData)
      if (writeResult.success) {
        setStatus({ type: 'success', message: `合并成功！文件已保存到: ${saveResult.filePath}` })
      } else {
        setStatus({ type: 'error', message: `保存失败: ${writeResult.error}` })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `合并失败: ${error.message}` })
    }

    setProcessing(false)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📎 合并 PDF</h1>
        <p>将多个 PDF 文件按顺序合并为一个文档</p>
      </div>

      <div className="action-bar">
        <button className="btn btn-primary" onClick={handleAddFiles} disabled={processing}>
          + 添加 PDF 文件
        </button>
        {files.length > 0 && (
          <button className="btn btn-outline" onClick={handleClear} disabled={processing}>
            清空列表
          </button>
        )}
        <div className="flex-spacer" />
        <button
          className="btn btn-success"
          onClick={handleMerge}
          disabled={processing || files.length < 2}
        >
          {processing ? '合并中...' : '开始合并'}
        </button>
      </div>

      {status && (
        <div className={`status-bar status-${status.type}`}>
          {status.message}
        </div>
      )}

      <div className="file-list">
        {files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <p>暂无文件，点击上方按钮添加 PDF 文件</p>
          </div>
        ) : (
          files.map((file, index) => (
            <div key={index} className="file-item">
              <div className="file-index">{index + 1}</div>
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-meta">{file.pageCount} 页</div>
              </div>
              <div className="file-actions">
                <button
                  className="icon-btn"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  title="上移"
                >
                  ↑
                </button>
                <button
                  className="icon-btn"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === files.length - 1}
                  title="下移"
                >
                  ↓
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => handleRemoveFile(index)}
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {files.length > 0 && (
        <div className="summary-bar">
          共 {files.length} 个文件，总计 {files.reduce((sum, f) => sum + f.pageCount, 0)} 页
        </div>
      )}
    </div>
  )
}

export default MergePage
