import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useSearch } from '@/hooks/useSearch'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { useRecentTools } from '@/hooks/useRecentTools.jsx'
import { SearchResults } from './SearchResults.jsx'
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

/**
 * SearchBar - 全局搜索框
 * @param {string} variant - 'sidebar'（紧凑，侧边栏内嵌）| 'hero'（大尺寸，首页）
 * @param {function} onNavigate - 跳转后回调（用于关闭浮动面板等）
 * @param {boolean} autoFocus - 是否自动聚焦
 */
export function SearchBar({ variant = 'sidebar', onNavigate, autoFocus = false }) {
  const t = useTranslations()
  const navigate = useNavigate()
  const { recordUsage } = useRecentTools()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const { results, hasQuery } = useSearch(t, query)
  const placeholder = resolve(t, 'common.search') || '搜索功能，如：合并、压缩、转Word...'

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // 监听 Ctrl+K 聚焦事件（侧边栏展开态）
  useEffect(() => {
    if (variant !== 'sidebar') return
    const handler = () => {
      inputRef.current?.focus()
      setIsOpen(true)
    }
    window.addEventListener('sidebar:focus-search', handler)
    return () => window.removeEventListener('sidebar:focus-search', handler)
  }, [variant])

  // 有输入时打开下拉
  useEffect(() => {
    setIsOpen(hasQuery)
    setHighlightedIndex(0)
  }, [hasQuery])

  // 点击外部关闭
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = useCallback(
    (tool) => {
      navigate(tool.path)
      // 记录最近使用（用导航配置中的原始字段）
      recordUsage({
        id: tool.id,
        name: tool.name,
        icon: tool.icon,
        path: tool.path,
      })
      setQuery('')
      setIsOpen(false)
      onNavigate?.()
    },
    [navigate, recordUsage, onNavigate]
  )

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[highlightedIndex]) {
        handleSelect(results[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  const isHero = variant === 'hero'

  return (
    <div ref={containerRef} className={cn('relative', isHero ? 'w-full max-w-[640px]' : 'w-full')}>
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-card transition-colors',
          isHero ? 'h-12 px-4' : 'h-10 px-3',
          isOpen ? 'border-primary/50' : 'border-border'
        )}
      >
        <Search className={cn('shrink-0 text-muted-foreground', isHero ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => hasQuery && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none',
            isHero ? 'text-sm' : 'text-xs'
          )}
        />
        {query ? (
          <button
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className={isHero ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
          </button>
        ) : (
          !isHero && (
            <kbd className="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Ctrl K
            </kbd>
          )
        )}
      </div>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg',
            isHero ? 'w-full max-w-[640px]' : 'w-full'
          )}
        >
          {results.length > 0 ? (
            <SearchResults
              results={results}
              onSelect={handleSelect}
              highlightedIndex={highlightedIndex}
              emptyText={resolve(t, 'common.noResults') || '未找到匹配功能'}
            />
          ) : (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              {resolve(t, 'common.noResults') || '未找到匹配功能'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar
