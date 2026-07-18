import React, { useState, useEffect } from 'react'
import { getPdfInfo, addPageNumbers, renderPdfToImages } from '../utils/pdfUtils.js'

function PageNumberPage() {
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageImages, setPageImages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [renderingPreview, setRenderingPreview] = useState(false)

  const [position, setPosition] = useState('bottom-center')
  const [fontSize, setFontSize] = useState(12)
  const [color, setColor] = useState('#000000')
  const [startNumber, setStartNumber] = useState(1)
  const [format, setFormat] = useState('{page}')

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

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 0, g: 0, b: 0 }
  }

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

  const handleApplyPageNumbers = async () => {
    if (!currentData) return

    setProcessing(true)
    setStatus({ type: 'info', message: '正在添加页码...' })

    try {
      const result = await addPageNumbers(currentData, {
        position,
        fontSize: parseInt(fontSize, 10),
        color: hexToRgb(color),
        startNumber: parseInt(startNumber, 10),
        format,
      })
      setCurrentData(result)
      setStatus({ type: 'success', message: '页码已添加' })
    } catch (error) {
      setStatus({ type: 'error', message: `添加失败: ${error.message}` })
    }

    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: 'page-numbered.pdf',
    })

    if (saveResult.canceled) return

    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, currentData)
    if (writeResult.success) {
      setStatus({ type: 'success', message: `保存成功！文件已保存到: ${saveResult.filePath}` })
    } else {
      setStatus({ type: 'error', message: `保存失败: ${writeResult.error}` })
    }
  }

  const handleClear = () => {
    setFile(null)
    setCurrentData(null)
    setPageCount(0)
    setStatus(null)
    setPageImages([])
  }

  const positionOptions = [
    { value: 'bottom-center', label: '底部居中' },
    { value: 'bottom-left', label: '底部左' },
    { value: 'bottom-right', label: '底部右' },
    { value: 'top-center', label: '顶部居中' },
    { value: 'top-left', label: '顶部左' },
    { value: 'top-right', label: '顶部右' },
  ]

  const formatOptions = [
    { value: '{page}', label: '1, 2, 3...' },
    { value: '第 {page} 页', label: '第 1 页, 第 2 页...' },
    { value: '{page} / {total}', label: '1 / N, 2 / N...' },
    { value: '- {page} -', label: '- 1 -, - 2 -...' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🔢 添加页码</h1>
        <p>自动给 PDF 每页添加页码，支持多种格式和位置</p>
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
          onClick={handleSave}
          disabled={processing || !currentData}
        >
          💾 保存文件
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
        <div className="pagenum-layout">
          <div className="pagenum-controls-panel">
            <h3>页码设置</h3>

            <div className="control-group">
              <label>位置</label>
              <div className="position-grid">
                {positionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`position-btn ${position === opt.value ? 'active' : ''}`}
                    onClick={() => setPosition(opt.value)}
                    disabled={processing}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>格式</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="input-field"
                disabled={processing}
              >
                {formatOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-row">
              <div className="control-group">
                <label>字号</label>
                <input
                  type="number"
                  min="8"
                  max="36"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="input-field"
                  disabled={processing}
                />
              </div>
              <div className="control-group">
                <label>起始页码</label>
                <input
                  type="number"
                  min="1"
                  value={startNumber}
                  onChange={(e) => setStartNumber(e.target.value)}
                  className="input-field"
                  disabled={processing}
                />
              </div>
            </div>

            <div className="control-group">
              <label>颜色</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="color-picker"
                disabled={processing}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleApplyPageNumbers}
              disabled={processing}
            >
              {processing ? '添加中...' : '🔢 添加页码'}
            </button>
          </div>

          <div className="pagenum-preview-panel">
            <div className="panel-header">
              <span>预览（第一页）</span>
              {renderingPreview && <span className="loading-text">渲染中...</span>}
            </div>
            <div className="pagenum-preview">
              {pageImages[0] ? (
                <img src={pageImages[0].url} alt="预览" />
              ) : (
                <div className="preview-loading">
                  {renderingPreview ? '渲染中...' : '无预览'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PageNumberPage
