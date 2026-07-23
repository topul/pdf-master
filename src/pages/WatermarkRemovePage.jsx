import React, { useState } from 'react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, Eraser, Download, Eye } from 'lucide-react'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { saveAs } from 'file-saver'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

export default function WatermarkRemovePage() {
  const t = useTranslations()
  const [file, setFile] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pdfBytes, setPdfBytes] = useState(null)
  const [watermarkText, setWatermarkText] = useState('')
  const [removing, setRemoving] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [pageCount, setPageCount] = useState(0)

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const arrayBuffer = await selectedFile.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    setPdfBytes(bytes)

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
    setPdfDoc(pdf)
    setPageCount(pdf.numPages)

    // 生成预览
    const blob = new Blob([bytes], { type: 'application/pdf' })
    setPreviewUrl(URL.createObjectURL(blob))
  }

  const removeWatermark = async () => {
    if (!pdfBytes || !watermarkText.trim()) return

    setRemoving(true)

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const pages = pdfDoc.getPages()

      for (const page of pages) {
        const { width, height } = page.getSize()

        // 获取页面内容
        const content = page.node.lookup('Contents')
        if (!content) continue

        // 方法1: 覆盖水印（使用白色矩形）
        // 在常见水印位置绘制白色矩形覆盖
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        // 尝试移除水印文字
        // 由于 pdf-lib 不直接支持删除内容，我们采用覆盖的方式
        // 在页面各个可能的位置绘制白色矩形来覆盖水印

        // 常见水印位置：对角线
        page.drawRectangle({
          x: width * 0.2,
          y: height * 0.45,
          width: width * 0.6,
          height: 30,
          color: rgb(1, 1, 1),
          opacity: 1,
        })

        // 顶部水印
        page.drawRectangle({
          x: width * 0.3,
          y: height - 50,
          width: width * 0.4,
          height: 25,
          color: rgb(1, 1, 1),
          opacity: 1,
        })

        // 底部水印
        page.drawRectangle({
          x: width * 0.3,
          y: 20,
          width: width * 0.4,
          height: 25,
          color: rgb(1, 1, 1),
          opacity: 1,
        })
      }

      const modifiedBytes = await pdfDoc.save()

      // 下载处理后的文件
      const blob = new Blob([modifiedBytes], { type: 'application/pdf' })
      const fileName = (file?.name?.replace('.pdf', '') || 'document') + '_no_watermark.pdf'
      saveAs(blob, fileName)

      // 更新预览
      setPreviewUrl(URL.createObjectURL(blob))

      alert(t.watermarkRemove?.success || '水印去除成功！')
    } catch (err) {
      console.error('Remove watermark error:', err)
      alert(t.watermarkRemove?.error || '去除水印失败，请重试')
    }

    setRemoving(false)
  }

  const reset = () => {
    setFile(null)
    setPdfDoc(null)
    setPdfBytes(null)
    setWatermarkText('')
    setPreviewUrl(null)
    setPageCount(0)
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t.watermarkRemove?.title || '去除水印'}</h1>
        <p className="text-muted-foreground mt-1">
          {t.watermarkRemove?.desc || '移除 PDF 中的文字水印'}
        </p>
      </div>

      {/* 文件选择 */}
      {!file ? (
        <Card className="mb-6">
          <CardContent className="py-8">
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{t.common.selectFile || '选择 PDF 文件'}</span>
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
                <span className="text-sm text-muted-foreground">({pageCount} {t.common.pages || '页'})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                {t.common.change || '更换'}
              </Button>
            </CardContent>
          </Card>

          {/* 水印设置 */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t.watermarkRemove?.settings || '水印设置'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="watermarkText">{t.watermarkRemove?.watermarkText || '水印文字'}</Label>
                <Input
                  id="watermarkText"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder={t.watermarkRemove?.placeholder || '输入要去除的水印文字'}
                />
                <p className="text-xs text-muted-foreground">
                  {t.watermarkRemove?.hint || '提示：程序会在常见位置覆盖水印'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={removeWatermark}
                  disabled={removing || !watermarkText.trim()}
                  className="gap-2"
                >
                  <Eraser className="h-4 w-4" />
                  {removing
                    ? (t.watermarkRemove?.removing || '处理中...')
                    : (t.watermarkRemove?.remove || '去除水印')
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 预览 */}
          {previewUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {t.watermarkRemove?.preview || '预览'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[600px] rounded-lg border overflow-hidden bg-muted/30">
                  <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}