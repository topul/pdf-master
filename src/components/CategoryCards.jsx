import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getIcon } from '@/config/iconRegistry'
import { NAV_GROUPS } from '@/config/navigation'
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

// 首页工具分类卡片网格
export function CategoryCards() {
  const t = useTranslations()
  const { recordUsage } = useRecentTools()
  const toolCountLabel = resolve(t, 'common.toolCount') || '个工具'

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {NAV_GROUPS.map((group) => {
        const GroupIcon = getIcon(group.icon)
        const groupName = resolve(t, group.name) || group.id
        return (
          <div
            key={group.id}
            className="rounded-lg border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/8 text-primary">
              <GroupIcon className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-base font-medium text-foreground">{groupName}</h3>
            <p className="text-xs text-muted-foreground">
              {group.tools.length} {toolCountLabel}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.tools.slice(0, 6).map((tool) => {
                const toolName = resolve(t, tool.name) || tool.id
                return (
                  <Link
                    key={tool.id}
                    to={tool.path}
                    onClick={() =>
                      recordUsage({ id: tool.id, name: tool.name, icon: tool.icon, path: tool.path })
                    }
                    className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {toolName}
                  </Link>
                )
              })}
            </div>
            {/* 第一个工具作为"查看全部"入口 */}
            <Link
              to={group.tools[0]?.path || '/'}
              onClick={() => {
                const first = group.tools[0]
                if (first) {
                  recordUsage({ id: first.id, name: first.name, icon: first.icon, path: first.path })
                }
              }}
              className="mt-4 flex items-center gap-1 text-xs text-primary transition-colors hover:underline"
            >
              {resolve(t, 'common.viewAll') || '查看全部'}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )
      })}
    </div>
  )
}

export default CategoryCards
