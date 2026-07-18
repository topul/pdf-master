import React from 'react'
import { cn } from '@/lib/utils'

/**
 * 页面顶部标题栏
 * 提供统一的页面标题、副标题与右侧操作区
 */
function PageHeader({ icon: Icon, title, description, children, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 border-b pb-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

export default PageHeader
