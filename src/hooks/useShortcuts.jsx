import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function useShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!window.electronAPI?.onShortcut) return

    const handleShortcut = (action, data) => {
      switch (action) {
        case 'openFile':
          // 触发文件选择（通过自定义事件）
          window.dispatchEvent(new CustomEvent('shortcut:openFile'))
          break
        case 'newWindow':
          // 新建窗口暂不实现
          break
        case 'goHome':
          navigate('/')
          break
        case 'gotoPage':
          // 快速跳转功能页
          const routes = [
            '/', '/merge', '/split', '/edit', '/image-to-pdf',
            '/pdf-to-image', '/compress', '/extract', '/text'
          ]
          if (data >= 1 && data <= routes.length) {
            navigate(routes[data - 1])
          }
          break
      }
    }

    window.electronAPI.onShortcut(handleShortcut)

    return () => {
      window.electronAPI.removeShortcutListeners?.()
    }
  }, [navigate])
}