import React, { useState, useEffect, useRef } from 'react'
import { getPdfInfo, addText, renderPdfToImages } from '../utils/pdfUtils.js'

function TextPage() {
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [pageImages, setPageImages] = useState([])
  const [selectedPageIndex, setSelectedPageIndex] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [renderingPreview, setRenderingPreview] = useState(false)

  const [text, setText] = useState('在此输入文字')
  const [fontSize, setFontSize] = useState(16)
  const [color, setColor] = useState('#000000')
  const [clickPos, setClickPos] = useState(null)
  const previewRef = useRef(null)

  const renderPreview = async (data) => {
    if (!data) return
    setRenderingPreview(true)
    try {
      const images = await renderPdfToImages(data, 1.2)
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
        setSelectedPageIndex(0)
        setClickPos(null)
        setStatus(null)
      } catch (e) {
        setStatus({ type: 'error', message: `加载 PDF 失败: ${e.message}` })
      }
    }
  }

  const handlePageClick = (e) => {
    if (!pageImages[selectedPageIndex]) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const img = pageImages[selectedPageIndex]
    const scaleX = img.width / rect.width
    const scaleY = img.height / rect.height

    // PDF 坐标系原点在左下角，Y 轴向上
    const pdfX = clickX * scaleX
    const pdfY = img.height - clickY * scaleY

    setClickPos({ x: pdfX, y: pdfY, displayX: clickX, displayY: clickY })
  }

  const handleAddText = async () => {
    if (!currentData) return
    if (!text.trim()) {
      setStatus({ type: 'error', message: '请输入文字内容' })
      return
    }
    if (!clickPos) {
      setStatus({ type: 'error', message: '请在页面预览中点击选择文字位置' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在添加文字...' })

    try {
      const result = await addText(currentData, {
        pageIndex: selectedPageIndex,
        text,
        x: clickPos.x,
        y: clickPos.y,
        fontSize: parseInt(fontSize, 10),
        color: hexToRgb(color),
      })
      setCurrentData(result)
      setClickPos(null)
      setStatus({ type: 'success', message: '文字已添加，可在预览中查看效果' })
    } catch (error) {
      setStatus({ type: 'error', message: `添加失败: ${error.message}` })
    }

    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: 'text-added.pdf',
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
    setSelectedPageIndex(0)
    setClickPos(null)
    setStatus(null)
    setPageImages([])
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📝 添加文字</h1>
        <p>在 PDF 页面指定位置添加文字内容，点击预览图选择位置</p>
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
        <div className="text-edit-layout">
          <div className="text-preview-panel">
            <div className="panel-header">
              <span>页面预览（点击选择文字位置）</span>
              <div className="page-selector">
                <button
                  className="mini-btn"
                  onClick={() => {
                    setSelectedPageIndex(Math.max(0, selectedPageIndex - 1))
                    setClickPos(null)
                  }}
                  disabled={selectedPageIndex === 0 || processing}
                >
                  上一页
                </button>
                <span className="page-indicator">
                  {selectedPageIndex + 1} / {pageCount}
                </span>
                <button
                  className="mini-btn"
                  onClick={() => {
                    setSelectedPageIndex(Math.min(pageCount - 1, selectedPageIndex + 1))
                    setClickPos(null)
                  }}
                  disabled={selectedPageIndex === pageCount - 1 || processing}
                >
                  下一页
                </button>
              </div>
            </div>
            <div className="preview-container" ref={previewRef}>
              {renderingPreview ? (
                <div className="preview-loading">
                  <div className="spinner" />
                  <p>渲染预览中...</p>
                </div>
              ) : pageImages[selectedPageIndex] ? (
                <div className="preview-image-wrapper" onClick={handlePageClick}>
                  <img src={pageImages[selectedPageIndex].url} alt={`第 ${selectedPageIndex + 1} 页`} />
                  {clickPos && (
                    <div
                      className="click-marker"
                      style={{
                        left: clickPos.displayX,
                        top: clickPos.displayY,
                      }}
                    >
                      📍
                    </div>
                  )}
                </div>
              ) : (
                <div className="preview-loading">无预览</div>
              )}
            </div>
          </div>

          <div className="text-controls-panel">
            <h3>文字设置</h3>

            <div className="control-group">
              <label>文字内容</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="input-field textarea"
                rows={3}
                placeholder="在此输入要添加的文字"
                disabled={processing}
              />
            </div>

            <div className="control-group">
              <label>字号</label>
              <input
                type="number"
                min="8"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="input-field"
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

            {clickPos ? (
              <div className="position-info">
                已选择位置：({Math.round(clickPos.x)}, {Math.round(clickPos.y)})
              </div>
            ) : (
              <div className="position-hint">
                💡 请在左侧预览图中点击要添加文字的位置
              </div>
            )}

            <button
              className="btn btn-primary add-text-btn"
              onClick={handleAddText}
              disabled={processing || !text.trim() || !clickPos}
            >
              {processing ? '添加中...' : '➕ 添加文字'}
            </button>

            <div className="tip-box">
              <p>📌 使用说明：</p>
              <ul>
                <li>PDF 格式不支持修改已有文字</li>
                <li>本功能在指定位置叠加新文字</li>
                <li>添加后可继续点击其他位置添加更多文字</li>
                <li>字号以 PDF 坐标系单位为准</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TextPage
