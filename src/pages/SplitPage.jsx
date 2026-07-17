import React, { useState } from 'react'
import { splitPdf, getPdfInfo } from '../utils/pdfUtils.js'

function SplitPage() {
  const [file, setFile] = useState(null)
  const [splitMode, setSplitMode] = useState('every')
  const [pageCount, setPageCount] = useState(1)
  const [rangeInput, setRangeInput] = useState('')
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState(null)

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
        setStatus(null)
      } catch (e) {
        setStatus({ type: 'error', message: `加载 PDF 失败: ${e.message}` })
      }
    }
  }

  const handleSplit = async () => {
    if (!file) {
      setStatus({ type: 'error', message: '请先选择 PDF 文件' })
      return
    }

    let options = {}
    if (splitMode === 'every') {
      if (pageCount < 1) {
        setStatus({ type: 'error', message: '每页数量必须大于 0' })
        return
      }
      options.pageCount = parseInt(pageCount, 10)
    } else if (splitMode === 'ranges') {
      if (!rangeInput.trim()) {
        setStatus({ type: 'error', message: '请输入页码范围' })
        return
      }
      const ranges = rangeInput.split(',').map((s) => s.trim()).filter(Boolean)
      if (ranges.length === 0) {
        setStatus({ type: 'error', message: '请输入有效的页码范围' })
        return
      }
      options.ranges = ranges
    }

    setProcessing(true)
    setStatus({ type: 'info', message: '正在拆分 PDF 文件...' })

    try {
      const outputs = await splitPdf(file.data, splitMode, options)

      const dirResult = await window.electronAPI.openDirectory()
      if (dirResult.canceled) {
        setProcessing(false)
        setStatus(null)
        return
      }

      const outputDir = dirResult.filePaths[0]
      const filesToWrite = outputs.map((output, idx) => ({
        path: `${outputDir}/${output.name}`,
        data: output.data,
      }))

      const writeResult = await window.electronAPI.writeFiles(filesToWrite)
      if (writeResult.success) {
        setStatus({
          type: 'success',
          message: `拆分成功！共生成 ${outputs.length} 个文件，已保存到: ${outputDir}`,
        })
      } else {
        setStatus({ type: 'error', message: `保存失败: ${writeResult.error}` })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `拆分失败: ${error.message}` })
    }

    setProcessing(false)
  }

  const handleClear = () => {
    setFile(null)
    setStatus(null)
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>✂️ 拆分 PDF</h1>
        <p>将 PDF 文件拆分为多个独立的文档</p>
      </div>

      <div className="action-bar">
        <button className="btn btn-primary" onClick={handleSelectFile} disabled={processing}>
          📁 选择 PDF 文件
        </button>
        {file && (
          <button className="btn btn-outline" onClick={handleClear} disabled={processing}>
            移除
          </button>
        )}
        <div className="flex-spacer" />
        <button
          className="btn btn-success"
          onClick={handleSplit}
          disabled={processing || !file}
        >
          {processing ? '拆分中...' : '开始拆分'}
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
            <div className="info-meta">共 {file.pageCount} 页</div>
          </div>
        </div>
      )}

      <div className="options-section">
        <h3>拆分方式</h3>
        <div className="mode-tabs">
          <button
            className={`tab-btn ${splitMode === 'every' ? 'active' : ''}`}
            onClick={() => setSplitMode('every')}
          >
            按页数拆分
          </button>
          <button
            className={`tab-btn ${splitMode === 'single' ? 'active' : ''}`}
            onClick={() => setSplitMode('single')}
          >
            单页拆分
          </button>
          <button
            className={`tab-btn ${splitMode === 'ranges' ? 'active' : ''}`}
            onClick={() => setSplitMode('ranges')}
          >
            按范围拆分
          </button>
        </div>

        {splitMode === 'every' && (
          <div className="option-row">
            <label>每 N 页拆分为一个文件：</label>
            <input
              type="number"
              min="1"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              className="input-field"
              style={{ width: 100 }}
            />
            <span className="option-hint">页 / 文件</span>
          </div>
        )}

        {splitMode === 'single' && (
          <div className="option-hint-block">
            将 PDF 的每一页都拆分为独立的 PDF 文件
          </div>
        )}

        {splitMode === 'ranges' && (
          <div className="option-row column">
            <label>页码范围（用逗号分隔多个范围）：</label>
            <textarea
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="例如: 1-3, 5-7, 10-15"
              className="input-field textarea"
              rows={3}
            />
            <span className="option-hint">
              格式：起始页-结束页，多个范围用英文逗号分隔
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default SplitPage
