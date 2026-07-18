import React, { useState, useEffect, useRef } from 'react'
import { getPdfInfo, renderPdfToImages } from '../utils/pdfUtils.js'

function PrintPage() {
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageImages, setPageImages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [renderingPreview, setRenderingPreview] = useState(false)
  const [printRange, setPrintRange] = useState('all')
  const [customRange, setCustomRange] = useState('')
  const printFrameRef = useRef(null)

  const renderPreview = async (data) => {
    if (!data) return
    setRenderingPreview(true)
    try {
      const images = await renderPdfToImages(data, 0.6)
      setPageImages(images)
    } catch (e) {
      console.error('预览渲染失败:', e)
      setPageImages([])
    }
    setRenderingPreview(false)
  }

  useEffect(() => {
    if (currentData) {
      renderPreview(currentData)
    }
  }, [currentData])

  const handleSelectFile = async () => {
    const result = await window.electronAPI.openFiles({
      properties: ['openFile'],
    })
    if (result.canceled) return

    const filePath = result.filePaths[0]
    const fileResult = await window.electronAPI.readFile(filePath)
    if (fileResult.success) {
      try {
        const info = await getPdfInfo(fileResult.data)
        const fileName = filePath.split(/[\\/]/).pop()
        setFile({
          path: filePath,
          name: fileName,
          data: fileResult.data,
          pageCount: info.pageCount,
        })
        setCurrentData(fileResult.data)
        setPageCount(info.pageCount)
        setStatus(null)
      } catch (e) {
        setStatus({ type: 'error', message: `加载 PDF 失败: ${e.message}` })
      }
    }
  }

  const parsePrintRange = () => {
    if (printRange === 'all') {
      return Array.from({ length: pageCount }, (_, i) => i)
    }
    if (printRange === 'custom' && customRange.trim()) {
      const indices = []
      const parts = customRange.split(',')
      for (const part of parts) {
        const trimmed = part.trim()
        if (trimmed.includes('-')) {
          const [start, end] = trimmed.split('-').map((s) => parseInt(s.trim(), 10))
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = start - 1; i < end && i < pageCount; i++) {
              if (i >= 0) indices.push(i)
            }
          }
        } else {
          const num = parseInt(trimmed, 10)
          if (!isNaN(num) && num >= 1 && num <= pageCount) {
            indices.push(num - 1)
          }
        }
      }
      return indices
    }
    return Array.from({ length: pageCount }, (_, i) => i)
  }

  const handlePrint = async () => {
    if (!currentData) return

    setProcessing(true)
    setStatus({ type: 'info', message: '正在准备打印...' })

    try {
      const indices = parsePrintRange()
      if (indices.length === 0) {
        setStatus({ type: 'error', message: '没有可打印的页面，请检查打印范围' })
        setProcessing(false)
        return
      }

      // 重新渲染选中页面的高清图用于打印
      const images = await renderPdfToImages(currentData, 2.0)
      const selectedImages = indices.map((i) => images[i]).filter(Boolean)

      if (selectedImages.length === 0) {
        setStatus({ type: 'error', message: '无法生成打印内容' })
        setProcessing(false)
        return
      }

      // 构建打印 HTML
      const printContent = `
        <html>
          <head>
            <title>打印 - ${file.name}</title>
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 0; }
              .page { page-break-after: always; text-align: center; }
              .page:last-child { page-break-after: auto; }
              img { max-width: 100%; max-height: 100vh; }
            </style>
          </head>
          <body>
            ${selectedImages.map((img) => `<div class="page"><img src="${img.url}" /></div>`).join('')}
          </body>
        </html>
      `

      const printFrame = document.createElement('iframe')
      printFrame.style.position = 'fixed'
      printFrame.style.right = '0'
      printFrame.style.bottom = '0'
      printFrame.style.width = '0'
      printFrame.style.height = '0'
      printFrame.style.border = '0'
      document.body.appendChild(printFrame)

      printFrame.onload = () => {
        try {
          printFrame.contentWindow.print()
          setTimeout(() => {
            document.body.removeChild(printFrame)
          }, 1000)
        } catch (e) {
          console.error('打印失败:', e)
        }
      }

      printFrame.srcdoc = printContent
      setStatus({ type: 'success', message: '打印对话框已打开，请在系统对话框中确认打印' })
    } catch (error) {
      setStatus({ type: 'error', message: `打印失败: ${error.message}` })
    }

    setProcessing(false)
  }

  const handleClear = () => {
    setFile(null)
    setCurrentData(null)
    setPageCount(0)
    setStatus(null)
    setPageImages([])
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🖨️ 打印 PDF</h1>
        <p>预览并打印 PDF 文件，支持选择打印范围</p>
      </div>

      <div className="action-bar">
        <button className="btn btn-primary" onClick={handleSelectFile} disabled={processing}>
          📁 选择 PDF 文件
        </button>
        {file && (
          <button className="btn btn-outline" onClick={handleClear} disabled={processing}>
            关闭
          </button>
        )}
        <div className="flex-spacer" />
        <button
          className="btn btn-success"
          onClick={handlePrint}
          disabled={processing || !currentData}
        >
          {processing ? '准备中...' : '🖨️ 打印'}
        </button>
      </div>

      {status && (
        <div className={`status-bar status-${status.type}`}>{status.message}</div>
      )}

      {file && (
        <div className="file-info-card">
          <div className="info-icon">📄</div>
          <div className="info-content">
            <div className="info-name">{file.name}</div>
            <div className="info-meta">共 {pageCount} 页</div>
          </div>
        </div>
      )}

      {currentData && (
        <div className="print-layout">
          <div className="print-options-panel">
            <h3>打印范围</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="printRange"
                  value="all"
                  checked={printRange === 'all'}
                  onChange={() => setPrintRange('all')}
                />
                全部页面 ({pageCount} 页)
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="printRange"
                  value="custom"
                  checked={printRange === 'custom'}
                  onChange={() => setPrintRange('custom')}
                />
                自定义范围
              </label>
            </div>

            {printRange === 'custom' && (
              <input
                type="text"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
                placeholder="例如: 1-3, 5, 8-10"
                className="input-field"
                disabled={processing}
              />
            )}

            <div className="print-tip">
              💡 点击打印按钮后将调用系统打印对话框
            </div>
          </div>

          <div className="print-preview-panel">
            <div className="panel-header">
              <span>页面预览</span>
              {renderingPreview && <span className="loading-text">渲染中...</span>}
            </div>
            <div className="print-thumbnails">
              {pageImages.map((img, i) => (
                <div key={i} className="print-thumbnail">
                  <div className="thumbnail-number">{i + 1}</div>
                  <img src={img.url} alt={`第 ${i + 1} 页`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrintPage
