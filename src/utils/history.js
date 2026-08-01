const HISTORY_KEY = 'pdf_master_history'
const MAX_HISTORY = 20

export function addHistory(file) {
  const history = getHistory()
  const existsIdx = history.findIndex((h) => h.path === file.path)
  // 已存在时保留 pin 状态
  const wasPinned = existsIdx !== -1 ? history[existsIdx].pinned : false
  if (existsIdx !== -1) {
    history.splice(existsIdx, 1)
  }
  const { data, ...meta } = file
  history.unshift({
    ...meta,
    accessedAt: Date.now(),
    pinned: wasPinned,
  })
  if (history.length > MAX_HISTORY) {
    history.pop()
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export function getHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// 返回排序后的历史：pinned 置顶（按 pin 时间倒序），其余按访问时间倒序
export function getSortedHistory() {
  const history = getHistory()
  const pinned = history.filter((h) => h.pinned)
  const normal = history.filter((h) => !h.pinned)
  return [...pinned, ...normal]
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

export function removeFromHistory(path) {
  const history = getHistory()
  const filtered = history.filter((h) => h.path !== path)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered))
  return getSortedHistory()
}

// 固定/取消固定文件
export function togglePin(path) {
  const history = getHistory()
  const item = history.find((h) => h.path === path)
  if (!item) return getSortedHistory()
  item.pinned = !item.pinned
  item.pinnedAt = item.pinned ? Date.now() : undefined
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  return getSortedHistory()
}

export function formatDate(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}
