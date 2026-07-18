import React, { useState, useEffect, useRef } from 'react'
import {
  getPdfInfo,
  rotatePages,
  deletePages,
  extractPages,
  reorderPages,
  renderPdfToImages,
} from '../utils/pdfUtils.js'

function EditPage() {
  const [file, setFile] = useState(null)
  const [currentData, setCurrentData] = useState(null)
  const [selectedPages, setSelectedPages] = useState(new Set())
  const [pageCount, setPageCount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('rotate')
  const [newOrder, setNewOrder] = useState('')
  const [pageImages, setPageImages] = useState([])
  const [renderingPreview, setRenderingPreview] = useState(false)
  const [previewScale, setPreviewScale] = useState(0.5)

  const renderPreview = async (data) => {
    if (!data) return
    setRenderingPreview(true)
    try {
      const images = await renderPdfToImages(data, previewScale)
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
  }, [currentData, previewScale])

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
        setSelectedPages(new Set())
        setStatus(null)
      } catch (e) {
        setStatus({ type: 'error', message: `加载 PDF 失败: ${e.message}` })
      }
    }
  }

  const togglePageSelection = (pageIndex) => {
    const newSelection = new Set(selectedPages)
    if (newSelection.has(pageIndex)) {
      newSelection.delete(pageIndex)
    } else {
      newSelection.add(pageIndex)
    }
    setSelectedPages(newSelection)
  }

  const selectAllPages = () => {
    const all = new Set()
    for (let i = 0; i < pageCount; i++) {
      all.add(i)
    }
    setSelectedPages(all)
  }

  const deselectAllPages = () => {
    setSelectedPages(new Set())
  }

  const handleRotate = async (degrees) => {
    if (!currentData) return
    if (selectedPages.size === 0) {
      setStatus({ type: 'error', message: '请先选择要旋转的页面' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: `正在旋转 ${selectedPages.size} 页...` })

    try {
      const result = await rotatePages(currentData, Array.from(selectedPages), degrees)
      setCurrentData(result)
      const info = await getPdfInfo(result)
      setPageCount(info.pageCount)
      setStatus({ type: 'success', message: `已旋转 ${selectedPages.size} 页` })
    } catch (error) {
      setStatus({ type: 'error', message: `旋转失败: ${error.message}` })
    }

    setProcessing(false)
  }

  const handleDelete = async () => {
    if (!currentData) return
    if (selectedPages.size === 0) {
      setStatus({ type: 'error', message: '请先选择要删除的页面' })
      return
    }
    if (selectedPages.size >= pageCount) {
      setStatus({ type: 'error', message: '不能删除所有页面' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: `正在删除 ${selectedPages.size} 页...` })

    try {
      const result = await deletePages(currentData, Array.from(selectedPages))
      setCurrentData(result)
      const info = await getPdfInfo(result)
      setPageCount(info.pageCount)
      setSelectedPages(new Set())
      setStatus({ type: 'success', message: `已删除，剩余 ${info.pageCount} 页` })
    } catch (error) {
      setStatus({ type: 'error', message: `删除失败: ${error.message}` })
    }

    setProcessing(false)
  }

  const handleExtract = async () => {
    if (!currentData) return
    if (selectedPages.size === 0) {
      setStatus({ type: 'error', message: '请先选择要提取的页面' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: `正在提取 ${selectedPages.size} 页...` })

    try {
      const result = await extractPages(currentData, Array.from(selectedPages).sort((a, b) => a - b))

      const saveResult = await window.electronAPI.saveFile({
        defaultPath: 'extracted.pdf',
      })

      if (saveResult.canceled) {
        setProcessing(false)
        setStatus(null)
        return
      }

      const writeResult = await window.electronAPI.writeFile(saveResult.filePath, result)
      if (writeResult.success) {
        setStatus({
          type: 'success',
          message: `提取成功！共 ${selectedPages.size} 页，已保存到: ${saveResult.filePath}`,
        })
      } else {
        setStatus({ type: 'error', message: `保存失败: ${writeResult.error}` })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `提取失败: ${error.message}` })
    }

    setProcessing(false)
  }

  const handleReorder = async () => {
    if (!currentData) return
    if (!newOrder.trim()) {
      setStatus({ type: 'error', message: '请输入新的页面顺序' })
      return
    }

    const order = newOrder
      .split(',')
      .map((s) => parseInt(s.trim(), 10) - 1)
      .filter((n) => !isNaN(n) && n >= 0 && n < pageCount)

    if (order.length !== pageCount) {
      setStatus({
        type: 'error',
        message: `页码数量不匹配。PDF 共 ${pageCount} 页，请提供 ${pageCount} 个页码`,
      })
      return
    }

    const unique = new Set(order)
    if (unique.size !== pageCount) {
      setStatus({ type: 'error', message: '页码不能重复' })
      return
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在重新排序页面...' })

    try {
      const result = await reorderPages(currentData, order)
      setCurrentData(result)
      setSelectedPages(new Set())
      setNewOrder('')
      setStatus({ type: 'success', message: '页面已重新排序' })
    } catch (error) {
      setStatus({ type: 'error', message: `排序失败: ${error.message}` })
    }

    setProcessing(false)
  }

  const handleSave = async () => {
    if (!currentData) return

    const saveResult = await window.electronAPI.saveFile({
      defaultPath: 'edited.pdf',
    })

    if (saveResult.canceled) return

    const writeResult = await window.electronAPI.writeFile(saveResult.filePath, currentData)
    if (writeResult.success) {
      setStatus({ type: 'success', message: `保存成功！文件已保存到: ${saveResult.filePath}` })
    } else {
      setStatus({ type: 'error', message: `保存失败: ${writeResult.error}` })
    }
  }

  const handleReset = async () => {
    if (!file) return
    setCurrentData(file.data)
    setPageCount(file.pageCount)
    setSelectedPages(new Set())
    setStatus({ type: 'info', message: '已重置为原始文件' })
  }

  const handleClear = () => {
    setFile(null)
    setCurrentData(null)
    setPageCount(0)
    setSelectedPages(new Set())
    setStatus(null)
    setPageImages([])
  }

  const tabItems = [
    { key: 'rotate', label: '🔄 旋转' },
    { key: 'delete', label: '🗑️ 删除' },
    { key: 'extract', label: '📤 提取' },
    { key: 'reorder', label: '📋 排序' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>✏️ 编辑 PDF</h1>
        <p>旋转、删除、提取和重新排序 PDF 页面，支持实时预览</p>
      </div>

      <div className="action-bar">
        <button className="btn btn-primary" onClick={handleSelectFile} disabled={processing}>
          📁 选择 PDF 文件
        </button>
        {file && (
          <>
            <button className="btn btn-outline" onClick={handleReset} disabled={processing}>
              重置
            </button>
            <button className="btn btn-outline" onClick={handleClear} disabled={processing}>
              关闭
            </button>
          </>
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
        <div className={`status-bar status-${status.type}`}>
          {status.message}
        </div>
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
        <div className="edit-layout">
          <div className="page-thumbnails-panel">
            <div className="panel-header">
              <span>页面预览</span>
              <div className="panel-actions">
                <button className="mini-btn" onClick={selectAllPages} disabled={processing}>
                  全选
                </button>
                <button className="mini-btn" onClick={deselectAllPages} disabled={processing}>
                  取消
                </button>
              </div>
            </div>
            <div className="page-thumbnails">
              {renderingPreview ? (
                <div className="preview-loading">
                  <div className="spinner" />
                  <p>渲染预览中...</p>
                </div>
              ) : pageImages.length > 0 ? (
                pageImages.map((img, i) => (
                  <div
                    key={i}
                    className={`page-thumbnail ${selectedPages.has(i) ? 'selected' : ''}`}
                    onClick={() => togglePageSelection(i)}
                  >
                    <div className="thumbnail-number">{i + 1}</div>
                    <div className="thumbnail-preview">
                      <img src={img.url} alt={`第 ${i + 1} 页`} />
                    </div>
                  </div>
                ))
              ) : (
                Array.from({ length: pageCount }, (_, i) => (
                  <div
                    key={i}
                    className={`page-thumbnail ${selectedPages.has(i) ? 'selected' : ''}`}
                    onClick={() => togglePageSelection(i)}
                  >
                    <div className="thumbnail-number">{i + 1}</div>
                    <div className="thumbnail-preview">
                      <div className="page-icon">📄</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="panel-footer">
              已选择 {selectedPages.size} 页 · 缩放 {Math.round(previewScale * 100)}%
              <div className="zoom-controls">
                <button
                  className="mini-btn"
                  onClick={() => setPreviewScale(Math.max(0.2, previewScale - 0.1))}
                  disabled={processing}
                >
                  -
                </button>
                <button
                  className="mini-btn"
                  onClick={() => setPreviewScale(Math.min(1.5, previewScale + 0.1))}
                  disabled={processing}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="edit-tools-panel">
            <div className="tools-tabs">
              {tabItems.map((tab) => (
                <button
                  key={tab.key}
                  className={`tool-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                  disabled={processing}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="tool-content">
              {activeTab === 'rotate' && (
                <div className="tool-section">
                  <h3>旋转页面</h3>
                  <p className="tool-desc">将选中的页面顺时针或逆时针旋转 90 度</p>
                  <div className="btn-row">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleRotate(-90)}
                      disabled={processing || selectedPages.size === 0}
                    >
                      ↺ 逆时针 90°
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleRotate(90)}
                      disabled={processing || selectedPages.size === 0}
                    >
                      ↻ 顺时针 90°
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleRotate(180)}
                      disabled={processing || selectedPages.size === 0}
                    >
                      🔄 180°
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'delete' && (
                <div className="tool-section">
                  <h3>删除页面</h3>
                  <p className="tool-desc">删除选中的页面（不可恢复，建议先备份）</p>
                  <button
                    className="btn btn-danger"
                    onClick={handleDelete}
                    disabled={processing || selectedPages.size === 0 || selectedPages.size >= pageCount}
                  >
                    🗑️ 删除选中的 {selectedPages.size} 页
                  </button>
                  {selectedPages.size >= pageCount && selectedPages.size > 0 && (
                    <p className="warning-text">不能删除所有页面</p>
                  )}
                </div>
              )}

              {activeTab === 'extract' && (
                <div className="tool-section">
                  <h3>提取页面</h3>
                  <p className="tool-desc">将选中的页面提取为新的 PDF 文件</p>
                  <button
                    className="btn btn-primary"
                    onClick={handleExtract}
                    disabled={processing || selectedPages.size === 0}
                  >
                    📤 提取选中的 {selectedPages.size} 页
                  </button>
                </div>
              )}

              {activeTab === 'reorder' && (
                <div className="tool-section">
                  <h3>重新排序</h3>
                  <p className="tool-desc">输入新的页面顺序，用逗号分隔页码（从 1 开始）</p>
                  <textarea
                    value={newOrder}
                    onChange={(e) => setNewOrder(e.target.value)}
                    placeholder={`例如: 3, 1, 2, 5, 4 （共 ${pageCount} 页）`}
                    className="input-field textarea"
                    rows={3}
                    disabled={processing}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleReorder}
                    disabled={processing || !newOrder.trim()}
                  >
                    📋 应用排序
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditPage
