import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'pdf-master-recent-tools'
const MAX_RECENT = 5

function loadRecent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveRecent(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 忽略写入错误
  }
}

export function useRecentTools() {
  const [recent, setRecent] = useState(() => loadRecent())

  // 监听跨组件变更
  useEffect(() => {
    const handler = () => setRecent(loadRecent())
    window.addEventListener('recent-tools:updated', handler)
    return () => window.removeEventListener('recent-tools:updated', handler)
  }, [])

  // 记录/更新工具使用
  const recordUsage = useCallback((tool) => {
    setRecent((prev) => {
      const filtered = prev.filter((r) => r.id !== tool.id)
      const next = [{ ...tool, lastUsedAt: Date.now() }, ...filtered]
      if (next.length > MAX_RECENT) next.length = MAX_RECENT
      saveRecent(next)
      window.dispatchEvent(new CustomEvent('recent-tools:updated'))
      return next
    })
  }, [])

  const clearRecent = useCallback(() => {
    saveRecent([])
    setRecent([])
    window.dispatchEvent(new CustomEvent('recent-tools:updated'))
  }, [])

  return {
    recent,
    recordUsage,
    clearRecent,
    MAX_RECENT,
  }
}

export default useRecentTools
