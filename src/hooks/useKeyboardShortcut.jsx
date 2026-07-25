import { useEffect } from 'react'

// 注册全局快捷键（渲染进程层面的键盘监听，用于 Ctrl+K 等）
// 注意：Electron 层的菜单快捷键（Ctrl+O 等）由 useShortcuts 通过 IPC 处理
export function useKeyboardShortcut(key, callback, deps = []) {
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+K (Windows/Linux) 或 Cmd+K (Mac)
      if (key === 'ctrl+k') {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault()
          callback()
        }
      } else if (key === 'escape') {
        if (e.key === 'Escape') {
          callback()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export default useKeyboardShortcut
