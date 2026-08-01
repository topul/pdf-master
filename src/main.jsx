import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { LocaleProvider } from '@/hooks/useLocale.jsx'
import { DEFAULT_FAVORITES } from '@/config/navigation'
import './styles/global.css'

// 提前应用主题，避免首屏闪烁
;(function applyInitialTheme() {
  try {
    const stored = localStorage.getItem('pdf-master-theme') || 'system'
    const prefersDark =
      window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored === 'dark' || (stored === 'system' && prefersDark)
    document.documentElement.classList.toggle('dark', isDark)
  } catch (e) {
    // ignore
  }
})()

// 数据迁移：首次使用预置默认收藏
;(function migrateData() {
  try {
    const favorites = localStorage.getItem('pdf-master-favorites')
    if (!favorites) {
      localStorage.setItem(
        'pdf-master-favorites',
        JSON.stringify(DEFAULT_FAVORITES)
      )
    }
  } catch (e) {
    // ignore
  }
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LocaleProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </LocaleProvider>
  </React.StrictMode>,
)
