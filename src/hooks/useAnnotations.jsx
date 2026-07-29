import { useState, useCallback, useRef } from 'react'

/**
 * useAnnotations - 批注状态管理 hook
 * 管理 PDF 各页的批注数据，支持高亮、便签、文字三种类型
 * 数据结构：{ [pageNum]: Annotation[] }
 * Annotation: { id, type, x, y, width?, height?, text?, color, fontSize? }
 * 坐标系：以渲染 scale 下的 canvas 像素为准（与 AnnotatePage 保持一致）
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

export function useAnnotations() {
  const [annotations, setAnnotations] = useState({})
  // 生成唯一 id
  const idCounter = useRef(0)

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
