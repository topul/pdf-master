import React, { useState, useEffect } from 'react'
import { getPdfInfo, addWatermark, renderPdfToImages } from '../utils/pdfUtils.js'

function WatermarkPage() {
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageImages, setPageImages] = useState([])
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [renderingPreview, setRenderingPreview] = useState(false)

  const [text, setText] = useState('机密文件')
  const [fontSize, setFontSize] = useState(60)
  const [opacity, setOpacity] = useState(0.2)
  const [color, setColor] = useState('#cccccc')
  const [rotation, setRotation] = useState(-45)
  const [position, setPosition] = useState('center')

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
      : { r: 0.8, g: 0.8, b: 0.8 }
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

  const handleApplyWatermark = async () => {
    if (!currentData) return
    if (!text.trim()) {
      setStatus({ type: 'error', message: '请输入水印文字' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在添加水印...' })

    try {
      const result = await addWatermark(currentData, {
        text,
        fontSize: parseInt(fontSize, 10),
        opacity: parseFloat(opacity),
        color: hexToRgb(color),
        rotation: parseInt(rotation, 10),
        position,
      })
      setCurrentData(result)
      setStatus({ type: 'success', message: '水印已添加，可在预览中查看效果' })
    } catch (error) {
      setStatus({ type: 'error', message: `添加失败: ${error.message}` })
    }

    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: 'watermarked.pdf',
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>💧 添加水印</h1>
        <p>给 PDF 的所有页面添加自定义文字水印</p>
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
        <div className="watermark-layout">
          <div className="watermark-controls-panel">
            <h3>水印设置</h3>

            <div className="control-group">
              <label>水印文字</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="input-field"
                placeholder="例如：机密文件"
                disabled={processing}
              />
            </div>

            <div className="control-row">
              <div className="control-group">
                <label>字号: {fontSize}</label>
                <input
                  type="range"
                  min="20"
                  max="120"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  disabled={processing}
                />
              </div>
              <div className="control-group">
                <label>透明度: {Math.round(opacity * 100)}%</label>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(e.target.value)}
                  disabled={processing}
                />
              </div>
            </div>

            <div className="control-row">
              <div className="control-group">
                <label>旋转角度: {rotation}°</label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={rotation}
                  onChange={(e) => setRotation(e.target.value)}
                  disabled={processing}
                />
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
            </div>

            <div className="control-group">
              <label>位置</label>
              <div className="position-options">
                <button
                  className={`position-btn ${position === 'top-left' ? 'active' : ''}`}
                  onClick={() => setPosition('top-left')}
                  disabled={processing}
                >
                  左上
                </button>
                <button
                  className={`position-btn ${position === 'center' ? 'active' : ''}`}
                  onClick={() => setPosition('center')}
                  disabled={processing}
                >
                  居中
                </button>
                <button
                  className={`position-btn ${position === 'bottom-right' ? 'active' : ''}`}
                  onClick={() => setPosition('bottom-right')}
                  disabled={processing}
                >
                  右下
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleApplyWatermark}
              disabled={processing || !text.trim()}
            >
              {processing ? '添加中...' : '💧 应用水印'}
            </button>
          </div>

          <div className="watermark-preview-panel">
            <div className="panel-header">
              <span>预览（第一页）</span>
              {renderingPreview && <span className="loading-text">渲染中...</span>}
            </div>
            <div className="watermark-preview">
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

export default WatermarkPage
