import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { LocaleProvider } from '@/hooks/useLocale.js'
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LocaleProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </LocaleProvider>
  </React.StrictMode>,
)
