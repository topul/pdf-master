import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Keyboard, Command, ArrowUpLeft } from 'lucide-react'
import { useTranslations } from '@/hooks/useLocale.jsx'

export default function ShortcutsHelp({ onClose }) {
  const t = useTranslations()

  const shortcuts = [
    { key: 'Ctrl/⌘ + O', action: t.shortcuts?.openFile || '打开文件' },
    { key: 'Ctrl/⌘ + N', action: t.shortcuts?.newWindow || '新建窗口' },
    { key: 'Ctrl/⌘ + Home', action: t.shortcuts?.goHome || '返回首页' },
    { key: 'Ctrl/⌘ + 1', action: `${t.common.merge || '合并 PDF'}` },
    { key: 'Ctrl/⌘ + 2', action: `${t.common.split || '拆分 PDF'}` },
    { key: 'Ctrl/⌘ + 3', action: `${t.common.edit || '编辑 PDF'}` },
    { key: 'Ctrl/⌘ + 4', action: `${t.common.imageToPdf || '图片转 PDF'}` },
    { key: 'Ctrl/⌘ + 5', action: `${t.common.pdfToImage || 'PDF 转图片'}` },
    { key: 'Ctrl/⌘ + 6', action: `${t.common.compress || 'PDF 压缩'}` },
    { key: 'Ctrl/⌘ + 7', action: `${t.common.extract || '提取内容'}` },
    { key: 'Ctrl/⌘ + 8', action: `${t.common.text || '添加文字'}` },
    { key: 'F12', action: t.shortcuts?.devTools || '开发者工具（仅开发环境）' },
  ]

  return (
    <Card className="max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            {t.shortcuts?.title || '快捷键'}
          </div>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <ArrowUpLeft className="h-4 w-4" />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.action}</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{s.key}</kbd>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}