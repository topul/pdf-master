import React from 'react'
import { FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 文件信息卡片
 * 展示已选 PDF 的名称与页数，可选移除按钮
 */
function FileInfoCard({ name, meta, onRemove, className }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card px-3.5 py-2.5 shadow-sm',
        className
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-medium" title={name}>
          {name}
        </span>
        {meta && (
          <span className="text-xs text-muted-foreground">{meta}</span>
        )}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="移除文件"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

export default FileInfoCard
