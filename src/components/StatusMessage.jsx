import React from 'react'
import { cn } from '@/lib/utils'
import { CircleAlert, CircleCheck, Info, Loader2 } from 'lucide-react'

const STATUS_STYLES = {
  info: {
    icon: Loader2,
    iconClass: 'animate-spin',
    wrap: 'bg-primary/5 text-primary border-primary/20',
  },
  success: {
    icon: CircleCheck,
    iconClass: '',
    wrap: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  error: {
    icon: CircleAlert,
    iconClass: '',
    wrap: 'bg-destructive/10 text-destructive border-destructive/20',
  },
}

/**
 * 状态消息条
 * 统一展示 info/success/error 三种状态
 */
function StatusMessage({ status, className }) {
  if (!status || !STATUS_STYLES[status.type]) return null
  const cfg = STATUS_STYLES[status.type]
  const Icon = cfg.icon

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-sm',
        cfg.wrap,
        className
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', cfg.iconClass)} />
      <span className="break-words leading-5">{status.message}</span>
    </div>
  )
}

export default StatusMessage
