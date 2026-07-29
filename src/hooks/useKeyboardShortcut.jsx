import { useEffect } from 'react'

/**
 * 注册全局快捷键（渲染进程层面）
 * 支持：
 * - 'ctrl+k' / 'cmd+k'：Ctrl/Cmd + K
 * - 'ctrl+b' / 'cmd+b'：侧边栏收起/展开
 * - 'ctrl+,'：打开设置
 * - 'escape'：Escape
 * - '?'：快捷键帮助
 * - 'home' / 'end'：Home / End
 * - '+' / '-' / '0'：缩放
 * - '/'：聚焦搜索
 *
 * @param {string} key - 快捷键标识
 * @param {function} callback - 回调
 * @param {Array} deps - 依赖
 * @param {boolean} ignoreInput - 在输入框内是否触发（默认 false）
 */
export function useKeyboardShortcut(key, callback, deps = [], ignoreInput = false) {
  useEffect(() => {
    const handler = (e) => {
      // 输入框内默认不触发（除非显式允许）
      if (!ignoreInput) {
        const tag = e.target?.tagName?.toLowerCase()
        const isEditable =
          tag === 'input' ||
          tag === 'textarea' ||
          e.target?.isContentEditable
        if (isEditable) return
      }

      const k = e.key.toLowerCase()
      const withMod = e.ctrlKey || e.metaKey

      // Ctrl/Cmd 组合键
      if (key === 'ctrl+k' && withMod && k === 'k') {
        e.preventDefault()
        callback()
        return
      }
      if (key === 'ctrl+b' && withMod && k === 'b') {
        e.preventDefault()
        callback()
        return
      }
      if (key === 'ctrl+,' && withMod && k === ',') {
        e.preventDefault()
        callback()
        return
      }

      // 单键
      if (key === 'escape' && e.key === 'Escape') {
        callback()
        return
      }
      if (key === '?' && k === '?' && !withMod) {
        e.preventDefault()
        callback()
        return
      }
      if (key === '/' && k === '/' && !withMod) {
        e.preventDefault()
        callback()
        return
      }
      if (key === 'home' && e.key === 'Home' && !withMod) {
        e.preventDefault()
        callback()
        return
      }
      if (key === 'end' && e.key === 'End' && !withMod) {
        e.preventDefault()
        callback()
        return
      }
      if (key === '+' && (k === '+' || k === '=')) {
        callback()
        return
      }
      if (key === '-' && k === '-') {
        callback()
        return
      }
      if (key === '0' && k === '0' && !withMod) {
        callback()
        return
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export default useKeyboardShortcut
