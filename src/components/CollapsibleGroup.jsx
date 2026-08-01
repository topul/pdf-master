import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { getIcon } from '@/config/iconRegistry'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { cn } from '@/lib/utils'

// 获取嵌套翻译值
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

const STORAGE_KEY = 'pdf-master-sidebar-expanded'

function loadExpandedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveExpandedState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

/**
 * CollapsibleGroup - 侧边栏可折叠分组（手风琴）
 * @param {boolean} collapsed - 侧边栏整体是否收起（64px 模式）
 */
export function CollapsibleGroup({ group, isActive, collapsed, onContextMenuTool }) {
  const t = useTranslations()
  const [expanded, setExpanded] = useState(() => {
    const stored = loadExpandedState()
    if (stored && group.id in stored) return stored[group.id]
    return group.defaultExpanded
  })

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    const stored = loadExpandedState() || {}
    stored[group.id] = next
    saveExpandedState(stored)
  }

  const GroupIcon = getIcon(group.icon)
  const groupName = resolve(t, group.name) || group.id

  // 侧边栏整体收起：只显示分组图标，点击展开工具图标
  if (collapsed) {
    return (
      <div className="mb-1">
        <button
          onClick={toggle}
          className="flex w-full items-center justify-center rounded-md px-2 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={groupName}
        >
          <GroupIcon className="h-[18px] w-[18px]" />
        </button>
        {expanded && (
          <div className="my-1 ml-3 flex flex-col items-center gap-0.5 border-l-2 border-primary/20 pl-1">
            {group.tools.map((tool) => {
              const Icon = getIcon(tool.icon)
              const active = isActive(tool.path)
              return (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  title={resolve(t, tool.name) || tool.id}
                >
                  <Icon className="h-[16px] w-[16px]" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // 展开模式
  return (
    <div className="mt-3">
      <button
        onClick={toggle}
        className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <GroupIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">{groupName}</span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
      </button>
      {expanded && (
        <div>
          {group.tools.map((tool) => {
            const Icon = getIcon(tool.icon)
            const active = isActive(tool.path)
            const name = resolve(t, tool.name) || tool.id
            const desc = resolve(t, tool.description) || ''
            return (
              <Link
                key={tool.id}
                to={tool.path}
                onContextMenu={(e) => onContextMenuTool?.(e, tool)}
                className={cn(
                  'group mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-foreground/75 hover:bg-accent hover:text-foreground'
                )}
                title={name}
              >
                <Icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate">{name}</span>
                  {desc && <span className="truncate text-[11px] text-muted-foreground/80">{desc}</span>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CollapsibleGroup
