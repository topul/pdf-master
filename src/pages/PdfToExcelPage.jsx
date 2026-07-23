import React, { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Download,
  Loader2,
  Settings,
  Eye,
  Table,
} from 'lucide-react'
import { useTranslations } from '@/hooks/useLocale.jsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfToExcelPage() {
  const t = useTranslations()
  const [file, setFile] = useState(null)
  const [pdf, setPdf] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState(null)
  const [options, setOptions] = useState({
    pageMode: 'all', // all | current
    currentPage: 1,
    rowTolerance: 3, // Y 坐标容差
    colTolerance: 5, // X 坐标容差
    sheetPerPage: true,
  })

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const arrayBuffer = await selectedFile.arrayBuffer()
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    setPdf(pdfDoc)
    setTotalPages(pdfDoc.numPages)
    setPreview(null)
    setProgress(0)
  }

  // 将单页文字按位置转换为表格数据
  const extractPageTable = async (pageNum) => {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1 })

    if (textContent.items.length === 0) {
      return { rows: [], cells: 0 }
    }

    // 1. 将文字项按 Y 坐标分组（行）
    const rowMap = new Map()
    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue
      const y = viewport.height - item.transform[5] // 翻转 Y，从上到下
      // 找到最近的现有行
      let rowKey = null
      for (const [existingY] of rowMap) {
        if (Math.abs(existingY - y) <= options.rowTolerance) {
          rowKey = existingY
          break
        }
      }
      if (rowKey === null) {
        rowKey = y
        rowMap.set(rowKey, [])
      }
      rowMap.get(rowKey).push({
        x: item.transform[4],
        text: item.str,
        width: item.width || 0,
      })
    }

    // 2. 按 Y 排序得到行
    const sortedRows = Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, items]) => {
        items.sort((a, b) => a.x - b.x)
        return items
      })

    if (sortedRows.length === 0) {
      return { rows: [], cells: 0 }
    }

    // 3. 收集所有 X 边界，进行列聚类
    // 每个 item 的中心点 X
    const allItems = sortedRows.flat()
    const xCenters = allItems.map((it) => it.x + (it.width || 0) / 2).sort((a, b) => a - b)

    // 列聚类：相邻 X 中心差超过容差则视为不同列
    const columns = []
    let currentCol = [xCenters[0]]
    for (let i = 1; i < xCenters.length; i++) {
      if (xCenters[i] - xCenters[i - 1] > options.colTolerance * 3) {
        columns.push(currentCol)
        currentCol = [xCenters[i]]
      } else {
        currentCol.push(xCenters[i])
      }
    }
    if (currentCol.length > 0) columns.push(currentCol)

    // 每列的平均 X 中心
    const colCenters = columns.map((c) => c.reduce((a, b) => a + b, 0) / c.length)

    // 4. 为每个 item 分配到最近的列
    const tableRows = sortedRows.map((items) => {
      const row = new Array(colCenters.length).fill('')
      for (const it of items) {
        const itemCenter = it.x + (it.width || 0) / 2
        // 找最近的列
        let minDist = Infinity
        let minIdx = 0
        for (let i = 0; i < colCenters.length; i++) {
          const dist = Math.abs(colCenters[i] - itemCenter)
          if (dist < minDist) {
            minDist = dist
            minIdx = i
          }
        }
        if (row[minIdx]) {
          row[minIdx] += ' ' + it.text
        } else {
          row[minIdx] = it.text
        }
      }
      return row
    })

    return {
      rows: tableRows,
      cells: tableRows.reduce((sum, r) => sum + r.filter((c) => c).length, 0),
    }
  }

  const convertToExcel = async () => {
    if (!pdf) return
    setConverting(true)
    setProgress(0)

    try {
      const wb = XLSX.utils.book_new()
      const startPage = options.pageMode === 'current' ? options.currentPage : 1
      const endPage = options.pageMode === 'current' ? options.currentPage : totalPages

      let totalRows = 0
      let totalCells = 0
      let sheetsAdded = 0

      for (let i = startPage; i <= endPage; i++) {
        setProgress(Math.round(((i - startPage + 1) / (endPage - startPage + 1)) * 100))
        const { rows, cells } = await extractPageTable(i)
        totalRows += rows.length
        totalCells += cells

        if (rows.length > 0) {
          const ws = XLSX.utils.aoa_to_sheet(rows)

          // 自动列宽
          const colWidths = []
          for (const row of rows) {
            for (let c = 0; c < row.length; c++) {
              const len = (row[c] || '').toString().length
              if (!colWidths[c] || colWidths[c] < len) colWidths[c] = len
            }
          }
          ws['!cols'] = colWidths.map((w) => ({ wch: Math.min(Math.max(w + 2, 8), 50) }))

          const sheetName = options.sheetPerPage
            ? `Page ${i}`.substring(0, 31)
            : `Sheet${sheetsAdded + 1}`.substring(0, 31)
          XLSX.utils.book_append_sheet(wb, ws, sheetName)
          sheetsAdded++
        }
      }

      if (sheetsAdded === 0) {
        // 添加一个空 sheet
        const ws = XLSX.utils.aoa_to_sheet([['']])
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      }

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const fileName =
        (file?.name?.replace(/\.pdf$/i, '') || 'document') + '.xlsx'

      setPreview({
        fileName,
        size: blob.size,
        sheets: sheetsAdded,
        rows: totalRows,
        cells: totalCells,
      })

      saveAs(blob, fileName)
    } catch (err) {
      console.error('Convert to Excel error:', err)
      alert(t.pdfToExcel?.error || '转换失败，请重试')
    }

    setConverting(false)
    setProgress(0)
  }

  const reset = () => {
    setFile(null)
    setPdf(null)
    setTotalPages(0)
    setPreview(null)
    setProgress(0)
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          {t.pdfToExcel?.title || 'PDF 转 Excel'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.pdfToExcel?.desc || '将 PDF 中的表格数据提取为 Excel 文件'}
        </p>
      </div>

      {!file ? (
        <Card className="mb-6">
          <CardContent className="py-8">
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">
                {t.common.selectFile || '选择 PDF 文件'}
              </span>
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
            </label>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 文件信息 */}
          <Card className="mb-4">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium truncate">{file.name}</span>
                <span className="text-sm text-muted-foreground">
                  ({totalPages} {t.common.pages || '页'})
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                {t.common.change || '更换'}
              </Button>
            </CardContent>
          </Card>

          {/* 转换选项 */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t.pdfToExcel?.options || '转换选项'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-sm w-20">
                  {t.pdfToExcel?.pageRange || '页面范围'}:
                </span>
                <select
                  value={options.pageMode}
                  onChange={(e) =>
                    setOptions({ ...options, pageMode: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-sm bg-background"
                >
                  <option value="all">
                    {t.pdfToExcel?.allPages || '全部页面'}
                  </option>
                  <option value="current">
                    {t.pdfToExcel?.currentPage || '指定页'}
                  </option>
                </select>
                {options.pageMode === 'current' && (
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={options.currentPage}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        currentPage: parseInt(e.target.value) || 1,
                      })
                    }
                    className="border rounded px-2 py-1 text-sm bg-background w-20"
                  />
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sheetPerPage}
                  onChange={(e) =>
                    setOptions({ ...options, sheetPerPage: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm">
                  {t.pdfToExcel?.sheetPerPage || '每页一个工作表'}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm w-20">
                  {t.pdfToExcel?.rowTolerance || '行容差'}:
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={options.rowTolerance}
                  onChange={(e) =>
                    setOptions({
                      ...options,
                      rowTolerance: parseInt(e.target.value),
                    })
                  }
                  className="flex-1"
                />
                <span className="text-sm w-8 text-right">{options.rowTolerance}</span>
              </div>
            </CardContent>
          </Card>

          {/* 操作 */}
          <div className="flex gap-2 mb-4">
            <Button onClick={convertToExcel} disabled={converting} className="gap-2">
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.pdfToExcel?.converting || '转换中'}... {progress}%
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {t.pdfToExcel?.convert || '开始转换'}
                </>
              )}
            </Button>
          </div>

          {/* 转换结果 */}
          {preview && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {t.pdfToExcel?.result || '转换结果'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">
                      {t.pdfToExcel?.fileName || '文件名'}
                    </div>
                    <div className="font-medium truncate">{preview.fileName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t.pdfToExcel?.fileSize || '文件大小'}
                    </div>
                    <div className="font-medium">{formatSize(preview.size)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t.pdfToExcel?.sheets || '工作表'}
                    </div>
                    <div className="font-medium">{preview.sheets}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t.pdfToExcel?.rows || '数据行'}
                    </div>
                    <div className="font-medium">{preview.rows}</div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-700 dark:text-green-400">
                  ✓ {t.pdfToExcel?.success || 'Excel 文件已生成并开始下载'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 提示 */}
          <Card className="mt-4">
            <CardContent className="py-3 flex gap-2">
              <Table className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                {t.pdfToExcel?.hint ||
                  '提示：基于文字位置自动识别表格结构。对清晰表格效果最佳；扫描版 PDF 请先用 OCR 识别。复杂表格可能需要手动调整。'}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
