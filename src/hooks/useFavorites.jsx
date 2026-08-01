import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'pdf-master-favorites'
const MAX_FAVORITES = 12

// 从 localStorage 读取收藏
function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function saveFavorites(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // 忽略写入错误
  }
}

// 获取嵌套翻译值：t("common.merge") => translations.common.merge
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

export function useFavorites(t) {
  const [favorites, setFavorites] = useState(() => loadFavorites())

  // 监听跨组件变更（右键菜单添加/移除后同步）
  useEffect(() => {
    const handler = () => setFavorites(loadFavorites())
    window.addEventListener('favorites:updated', handler)
    return () => window.removeEventListener('favorites:updated', handler)
  }, [])

  const persist = useCallback((list) => {
    setFavorites(list)
    saveFavorites(list)
    window.dispatchEvent(new CustomEvent('favorites:updated'))
  }, [])

  const addFavorite = useCallback(
    (tool) => {
      setFavorites((prev) => {
        if (prev.some((f) => f.id === tool.id)) return prev
        const next = [{ ...tool, addedAt: Date.now() }, ...prev]
        if (next.length > MAX_FAVORITES) next.length = MAX_FAVORITES
        saveFavorites(next)
        window.dispatchEvent(new CustomEvent('favorites:updated'))
        return next
      })
    },
    []
  )

  const removeFavorite = useCallback((id) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id)
      saveFavorites(next)
      window.dispatchEvent(new CustomEvent('favorites:updated'))
      return next
    })
  }, [])

  const isFavorited = useCallback(
    (id) => favorites.some((f) => f.id === id),
    [favorites]
  )

  const toggleFavorite = useCallback(
    (tool) => {
      if (isFavorited(tool.id)) {
        removeFavorite(tool.id)
      } else {
        addFavorite(tool)
      }
    },
    [isFavorited, addFavorite, removeFavorite]
  )

  // 带名称解析的收藏列表（用于展示）
  const favoritesWithNames = useCallback(
    () =>
      favorites.map((f) => ({
        ...f,
        displayName: resolve(t, f.name) || f.id,
      })),
    [favorites, t]
  )

  return {
    favorites,
    favoritesWithNames: favoritesWithNames(),
    addFavorite,
    removeFavorite,
    isFavorited,
    toggleFavorite,
    MAX_FAVORITES,
  }
}

export default useFavorites
