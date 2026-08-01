import { Link } from 'react-router-dom'
import { getIcon } from '@/config/iconRegistry'
import { QUICK_ACTIONS } from '@/config/navigation'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { useRecentTools } from '@/hooks/useRecentTools.jsx'

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

// 首页快捷操作卡片网格
export function QuickActions() {
  const t = useTranslations()
  const { recordUsage } = useRecentTools()

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {QUICK_ACTIONS.map((action) => {
        const Icon = getIcon(action.icon)
        const title = resolve(t, action.title) || action.id
        const desc = resolve(t, action.desc) || ''
        return (
          <Link
            key={action.id}
            to={action.path}
            onClick={() =>
              recordUsage({ id: action.id, name: action.title, icon: action.icon, path: action.path })
            }
            className="group rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-medium text-foreground">{title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
          </Link>
        )
      })}
    </div>
  )
}

export default QuickActions
