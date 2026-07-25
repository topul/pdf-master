import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { getIcon } from '@/config/iconRegistry'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { useRecentTools } from '@/hooks/useRecentTools.jsx'
import { cn } from '@/lib/utils'

function resolve(t, key) {
  if (!key || typeof key !== 'string') return ''
  const parts = key.split('.')
  let cur = t
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) {
      cur = cur[p]
    } else {
      return ''
    }
  }
  return typeof cur === 'string' ? cur : ''
}

/**
 * RecentTools - 最近使用工具列表
 * @param {boolean} collapsed - 侧边栏整体是否收起
 */
export function RecentTools({ collapsed }) {
  const t = useTranslations()
  const { recent, recordUsage } = useRecentTools()

  const label = resolve(t, 'common.recentTools') || '最近使用'

  if (recent.length === 0) return null

  if (collapsed) {
    return (
      <div className="mb-1 flex flex-col items-center gap-0.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
        {recent.slice(0, 3).map((r) => {
          const Icon = getIcon(r.icon)
          return (
            <Link
              key={r.id}
              to={r.path}
              onClick={() => recordUsage({ id: r.id, name: r.name, icon: r.icon, path: r.path })}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={resolve(t, r.name) || r.id}
            >
              <Icon className="h-[15px] w-[15px]" />
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center gap-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        <Clock className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div>
        {recent.map((r) => {
          const Icon = getIcon(r.icon)
          const name = resolve(t, r.name) || r.id
          return (
            <Link
              key={r.id}
              to={r.path}
              onClick={() => recordUsage({ id: r.id, name: r.name, icon: r.icon, path: r.path })}
              className={cn(
                'group mb-0.5 flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-foreground/75 transition-colors hover:bg-accent hover:text-foreground'
              )}
              title={name}
            >
              <Icon className="h-[16px] w-[16px] shrink-0 text-muted-foreground group-hover:text-foreground" />
              <span className="truncate">{name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default RecentTools
