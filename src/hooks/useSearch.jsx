import { useState, useEffect, useMemo } from 'react'
import { NAV_GROUPS } from '@/config/navigation'

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

// 相关性打分：名称完全匹配 > 名称包含 > 关键词包含 > 描述包含 > 分组包含
const SCORE = {
  NAME_EXACT: 1000,
  NAME_STARTS_WITH: 800,
  NAME_INCLUDES: 500,
  KEYWORDS_INCLUDES: 200,
  DESC_INCLUDES: 50,
  GROUP_INCLUDES: 10,
}

function scoreTool(tool, q) {
  let score = 0
  const name = tool.nameText.toLowerCase()
  const desc = tool.descText.toLowerCase()
  const group = tool.groupName.toLowerCase()
  const keywords = (tool.keywords || '').toLowerCase()
  const id = (tool.id || '').toLowerCase()

  if (name === q) score = Math.max(score, SCORE.NAME_EXACT)
  else if (name.startsWith(q)) score = Math.max(score, SCORE.NAME_STARTS_WITH)
  else if (name.includes(q)) score = Math.max(score, SCORE.NAME_INCLUDES)

  if (keywords.includes(q)) score = Math.max(score, SCORE.KEYWORDS_INCLUDES)
  if (desc.includes(q)) score = Math.max(score, SCORE.DESC_INCLUDES)
  if (group.includes(q)) score = Math.max(score, SCORE.GROUP_INCLUDES)
  if (id.includes(q)) score = Math.max(score, SCORE.GROUP_INCLUDES)

  return score
}

// 将 NAV_GROUPS 展平为可搜索的工具列表，携带分组信息与解析后的文本
export function useSearch(t, query, options = {}) {
  const { maxResults = 8 } = options
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  // debounce 150ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150)
    return () => clearTimeout(timer)
  }, [query])

  // 构建带文本的扁平工具列表（缓存，t 变化时重建）
  const allTools = useMemo(() => {
    const list = []
    for (const group of NAV_GROUPS) {
      const groupName = resolve(t, group.name) || group.id
      for (const tool of group.tools) {
        const name = resolve(t, tool.name) || tool.id
        const desc = resolve(t, tool.description) || ''
        list.push({
          ...tool,
          groupName,
          groupNameKey: group.name,
          nameText: name,
          descText: desc,
          keywords: tool.keywords || '',
        })
      }
    }
    return list
  }, [t])

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return []
    return allTools
      .map((tool) => ({ tool, score: scoreTool(tool, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ tool }) => tool)
  }, [allTools, debouncedQuery, maxResults])

  return {
    results,
    hasQuery: debouncedQuery.trim().length > 0,
  }
}

export default useSearch
