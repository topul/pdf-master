import React, { useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  AlignmentType,
} from 'docx'
import { saveAs } from 'file-saver'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Upload,
  FileText,
  FileType,
  Download,
  Loader2,
  Settings,
  Eye,
} from 'lucide-react'
import { useTranslations } from '@/hooks/useLocale.jsx'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfToWordPage() {
  const t = useTranslations()
  const [file, setFile] = useState(null)
  const [pdf, setPdf] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [converting, setConverting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState(null)
  const [options, setOptions] = useState({
    includePageBreaks: true,
    preserveLayout: true,
    fontSize: 24, // half-points, 12pt
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

  // 提取单页文字，保留段落和近似排版
  const extractPageContent = async (pageNum) => {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1 })

    if (!options.preserveLayout) {
      // 简单模式：将所有文字按顺序拼接
      const text = textContent.items
        .map((item) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      return [{ text, type: 'paragraph' }]
    }

    // 排版模式：按行分组（基于 Y 坐标），保留段落
    const lines = new Map()
    for (const item of textContent.items) {
      if (!item.str) continue
      // 将 Y 坐标四舍五入到 5 的倍数，相同行归一
      const yKey = Math.round(viewport.height - item.transform[5]) // 翻转 Y
      const lineKey = Math.floor(yKey / 3) * 3
      if (!lines.has(lineKey)) lines.set(lineKey, [])
      lines.get(lineKey).push({
        x: item.transform[4],
        text: item.str,
        width: item.width || 0,
      })
    }

    // 按 Y 排序（从上到下），每个 Y 内按 X 排序
    const sortedLines = Array.from(lines.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, items]) => {
        items.sort((a, b) => a.x - b.x)
        // 通过间距判断是否需要插入空格
        let text = ''
        let prevEnd = -Infinity
        for (const it of items) {
          if (prevEnd >= 0 && it.x - prevEnd > 5) {
            text += ' '
          }
          text += it.text
          prevEnd = it.x + (it.width || 0)
        }
        return text.trim()
      })
      .filter((s) => s.length > 0)

    // 将连续行按空行分段
    const paragraphs = []
    let current = []
    for (const line of sortedLines) {
      current.push(line)
    }
    if (current.length > 0) {
      paragraphs.push({ text: current.join('\n'), type: 'paragraph' })
    }

    return paragraphs.length > 0
      ? paragraphs
      : [{ text: '', type: 'paragraph' }]
  }

  const convertToWord = async () => {
    if (!pdf) return
    setConverting(true)
    setProgress(0)

    try {
      const sections = []

      for (let i = 1; i <= totalPages; i++) {
        setProgress(Math.round((i / totalPages) * 100))
        const paragraphs = await extractPageContent(i)

        const docParagraphs = paragraphs.map((p) => {
          // 拆分多行为不同 run
          const lines = p.text.split('\n')
          const runs = []
          lines.forEach((line, idx) => {
            runs.push(new TextRun({ text: line, size: options.fontSize }))
            if (idx < lines.length - 1) {
              runs.push(new TextRun({ break: 1 }))
            }
          })
          return new Paragraph({
            children: runs,
            spacing: { after: 200 },
          })
        })

        // 页间分页
        if (options.includePageBreaks && i > 1 && docParagraphs.length > 0) {
          docParagraphs[0].addChildElement(
            new TextRun({ children: [], break: 1 })
          )
        }

        sections.push({
          properties: {
            page: {
              margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
            },
          },
          children: docParagraphs.length
            ? docParagraphs
            : [new Paragraph({ children: [new TextRun({ text: '' })] })],
        })
      }

      const doc = new Document({
        sections,
        styles: {
          default: {
            document: {
              run: { size: options.fontSize },
            },
          },
        },
      })

      const blob = await Packer.toBlob(doc)
      const fileName =
        (file?.name?.replace(/\.pdf$/i, '') || 'document') + '.docx'

      // 生成预览信息
      setPreview({
        fileName,
        size: blob.size,
        sections: sections.length,
        paragraphs: sections.reduce((sum, s) => sum + s.children.length, 0),
      })

      saveAs(blob, fileName)
    } catch (err) {
      console.error('Convert to Word error:', err)
      alert(t.pdfToWord?.error || '转换失败，请重试')
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
          <FileType className="h-6 w-6 text-primary" />
          {t.pdfToWord?.title || 'PDF 转 Word'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.pdfToWord?.desc || '将 PDF 转换为可编辑的 Word 文档'}
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
                {t.pdfToWord?.options || '转换选项'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includePageBreaks}
                  onChange={(e) =>
                    setOptions({ ...options, includePageBreaks: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm">
                  {t.pdfToWord?.pageBreaks || '保留分页（每页之间分页符）'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.preserveLayout}
                  onChange={(e) =>
                    setOptions({ ...options, preserveLayout: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm">
                  {t.pdfToWord?.preserveLayout || '保留排版（按行结构）'}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {t.pdfToWord?.fontSize || '字号'}:
                </span>
                <select
                  value={options.fontSize}
                  onChange={(e) =>
                    setOptions({ ...options, fontSize: parseInt(e.target.value) })
                  }
                  className="border rounded px-2 py-1 text-sm bg-background"
                >
                  <option value={20}>10pt</option>
                  <option value={24}>12pt</option>
                  <option value={28}>14pt</option>
                  <option value={32}>16pt</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* 操作 */}
          <div className="flex gap-2 mb-4">
            <Button onClick={convertToWord} disabled={converting} className="gap-2">
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.pdfToWord?.converting || '转换中'}... {progress}%
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {t.pdfToWord?.convert || '开始转换'}
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
                  {t.pdfToWord?.result || '转换结果'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">
                      {t.pdfToWord?.fileName || '文件名'}
                    </div>
                    <div className="font-medium truncate">{preview.fileName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t.pdfToWord?.fileSize || '文件大小'}
                    </div>
                    <div className="font-medium">{formatSize(preview.size)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t.pdfToWord?.sections || '段落数'}
                    </div>
                    <div className="font-medium">{preview.paragraphs}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      {t.common.pages || '页'}
                    </div>
                    <div className="font-medium">{preview.sections}</div>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-700 dark:text-green-400">
                  ✓ {t.pdfToWord?.success || 'Word 文档已生成并开始下载'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 提示 */}
          <Card className="mt-4">
            <CardContent className="py-3">
              <p className="text-xs text-muted-foreground">
                {t.pdfToWord?.hint ||
                  '提示：PDF 转 Word 基于文字层提取，扫描版 PDF 请先用 OCR 识别。复杂排版可能无法 100% 还原。'}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
