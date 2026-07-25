import { getIcon } from '@/config/iconRegistry'
import { cn } from '@/lib/utils'

// 搜索结果下拉面板
export function SearchResults({ results, onSelect, highlightedIndex = -1, emptyText = '未找到匹配功能' }) {
  if (!results || results.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="py-1">
      {results.map((tool, idx) => {
        const Icon = getIcon(tool.icon)
        const isHighlighted = idx === highlightedIndex
        return (
          <button
            key={tool.id}
            onClick={() => onSelect(tool)}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
              isHighlighted
                ? 'bg-accent text-foreground'
                : 'text-foreground/80 hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{tool.nameText}</span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {tool.groupName}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default SearchResults
