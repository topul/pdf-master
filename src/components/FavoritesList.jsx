import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { getIcon } from '@/config/iconRegistry'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { useFavorites } from '@/hooks/useFavorites.jsx'
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
 * FavoritesList - 收藏夹工具列表
 * @param {boolean} collapsed - 侧边栏整体是否收起
 * @param {function} onContextMenuTool - 右键回调
 */
export function FavoritesList({ collapsed, onContextMenuTool }) {
  const t = useTranslations()
  const { favorites, isFavorited } = useFavorites(t)
  const { recordUsage } = useRecentTools()

  const label = resolve(t, 'common.favorites') || '收藏夹'

  if (collapsed) {
    if (favorites.length === 0) return null
    return (
      <div className="mb-1 flex flex-col items-center gap-0.5">
        <Star className="h-3.5 w-3.5 text-amber-500" />
        {favorites.slice(0, 4).map((f) => {
          const Icon = getIcon(f.icon)
          return (
            <Link
              key={f.id}
              to={f.path}
              onClick={() =>
                recordUsage({ id: f.id, name: f.name, icon: f.icon, path: f.path })
              }
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={resolve(t, f.name) || f.id}
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
        <Star className="h-3.5 w-3.5 text-amber-500" />
        <span>{label}</span>
      </div>
      {favorites.length === 0 ? (
        <div className="px-3 py-2 text-[11px] text-muted-foreground/60">
          {resolve(t, 'common.noFavorites') || '点击工具右键可添加收藏'}
        </div>
      ) : (
        <div>
          {favorites.map((f) => {
            const Icon = getIcon(f.icon)
            const name = resolve(t, f.name) || f.id
            return (
              <Link
                key={f.id}
                to={f.path}
                onContextMenu={(e) => onContextMenuTool?.(e, f)}
                onClick={() =>
                  recordUsage({ id: f.id, name: f.name, icon: f.icon, path: f.path })
                }
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
      )}
    </div>
  )
}

export default FavoritesList
