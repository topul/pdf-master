import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

/**
 * 空状态占位组件
 * 用于页面默认状态：引导用户进行第一步操作
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  tips = [],
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 p-10 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {Icon ? <Icon className="h-8 w-8" /> : null}
      </div>
      <h3 className="mb-1 text-base font-medium">{title}</h3>
      {description && (
        <p className="mb-5 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button size="lg" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {tips.length > 0 && (
        <ul className="mt-6 space-y-1.5 text-left text-xs text-muted-foreground">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default EmptyState
