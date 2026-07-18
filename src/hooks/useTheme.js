import { useEffect, useState, useCallback } from 'react'

/**
 * 主题 Hook
 * - mode: 'light' | 'dark' | 'system'
 * - 实际生效值: 'light' | 'dark'
 * - 持久化到 localStorage，跟随系统变化
 */
export function useTheme() {
  const [mode, setMode] = useState('system')
  const [resolved, setResolved] = useState('light')

  // 读取 localStorage
  useEffect(() => {
    const stored = localStorage.getItem('pdf-master-theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setMode(stored)
    }
  }, [])

  // 计算实际生效主题
  useEffect(() => {
    const apply = () => {
      let actual = mode
      if (mode === 'system') {
        actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      setResolved(actual)
      document.documentElement.classList.toggle('dark', actual === 'dark')
    }

    apply()

    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => apply()
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [mode])

  const setTheme = useCallback((next) => {
    setMode(next)
    localStorage.setItem('pdf-master-theme', next)
  }, [])

  const toggle = useCallback(() => {
    const next = resolved === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }, [resolved, setTheme])

  return { mode, resolved, setTheme, toggle }
}

export default useTheme
