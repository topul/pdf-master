import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * useAnnotations - 批注状态管理 hook
 * 管理 PDF 各页的批注数据，支持高亮、便签、文字三种类型
 * 数据结构：{ [pageNum]: Annotation[] }
 * Annotation: { id, type, x, y, width?, height?, text?, color, fontSize? }
 * 坐标系：以渲染 scale 下的 canvas 像素为准（与 AnnotatePage 保持一致）
 *
 * 持久化：传入 fileKey 后，批注会按文件维度存入 localStorage，
 * 切换文件时自动加载对应批注，刷新/重启后不丢失。
 */

const COLORS = [
  { name: 'yellow', value: '#FFEB3B' },
  { name: 'green', value: '#A5D6A7' },
  { name: 'blue', value: '#90CAF9' },
  { name: 'pink', value: '#F48FB1' },
  { name: 'orange', value: '#FFCC80' },
]

export const ANNOT_TYPES = {
  HIGHLIGHT: 'highlight',
  TEXT: 'text',
  NOTE: 'note',
}

export { COLORS }

const STORAGE_PREFIX = 'pdf-master:annotations:'
const storageKeyOf = (fileKey) => (fileKey ? `${STORAGE_PREFIX}${fileKey}` : '')

// 读取持久化的批注；非法或缺失返回 null
const loadFromStorage = (fileKey) => {
  if (!fileKey) return null
  try {
    const raw = localStorage.getItem(storageKeyOf(fileKey))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed
    return null
  } catch {
    return null
  }
}

const saveToStorage = (fileKey, annotations) => {
  if (!fileKey) return
  try {
    // 空批注时移除 key，避免堆积无用条目
    const hasAny = Object.values(annotations).some((list) => list && list.length > 0)
    if (!hasAny) {
      localStorage.removeItem(storageKeyOf(fileKey))
      return
    }
    localStorage.setItem(storageKeyOf(fileKey), JSON.stringify(annotations))
  } catch {
    // 配额不足或存储不可用时静默失败
  }
}

export function useAnnotations(fileKey) {
  // 初始值：若提供 fileKey，尝试从 localStorage 恢复
  const [annotations, setAnnotations] = useState(() => {
    const stored = loadFromStorage(fileKey)
    return stored || {}
  })
  // 生成唯一 id
  const idCounter = useRef(0)
  // 当前生效的 fileKey（用于写入存储时定位）
  const activeKeyRef = useRef(fileKey)
  // 防止初次加载触发一次写回
  const initializedRef = useRef(false)

  // fileKey 变化时重新加载对应批注
  useEffect(() => {
    activeKeyRef.current = fileKey
    const stored = loadFromStorage(fileKey)
    setAnnotations(stored || {})
    initializedRef.current = true
  }, [fileKey])

  // 批注变更时写回 localStorage（跳过首次加载）
  useEffect(() => {
    if (!initializedRef.current) return
    saveToStorage(activeKeyRef.current, annotations)
  }, [annotations])

  const addAnnotation = useCallback((pageNum, annot) => {
    idCounter.current += 1
    const id = `${Date.now()}-${idCounter.current}`
    setAnnotations((prev) => {
      const list = prev[pageNum] || []
      return { ...prev, [pageNum]: [...list, { ...annot, id }] }
    })
    return id
  }, [])

  const deleteAnnotation = useCallback((pageNum, id) => {
    setAnnotations((prev) => {
      const list = prev[pageNum] || []
      return { ...prev, [pageNum]: list.filter((a) => a.id !== id) }
    })
  }, [])

  const clearPage = useCallback((pageNum) => {
    setAnnotations((prev) => ({ ...prev, [pageNum]: [] }))
  }, [])

  const clearAll = useCallback(() => {
    setAnnotations({})
  }, [])

  const getPageAnnotations = useCallback(
    (pageNum) => annotations[pageNum] || [],
    [annotations]
  )

  // 导出为扁平数组，用于保存为 PDF
  const getAllAnnotations = useCallback(() => {
    const result = []
    for (const [page, list] of Object.entries(annotations)) {
      for (const annot of list) {
        result.push({ ...annot, page: parseInt(page) })
      }
    }
    return result
  }, [annotations])

  const hasAnnotations = useCallback(() => {
    return Object.values(annotations).some((list) => list.length > 0)
  }, [annotations])

  return {
    annotations,
    addAnnotation,
    deleteAnnotation,
    clearPage,
    clearAll,
    getPageAnnotations,
    getAllAnnotations,
    hasAnnotations,
  }
}

export default useAnnotations
