import React, { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import MergePage from './pages/MergePage.jsx'
import SplitPage from './pages/SplitPage.jsx'
import EditPage from './pages/EditPage.jsx'
import HomePage from './pages/HomePage.jsx'

function App() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const menuItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/merge', label: '合并 PDF', icon: '📎' },
    { path: '/split', label: '拆分 PDF', icon: '✂️' },
    { path: '/edit', label: '编辑 PDF', icon: '✏️' },
  ]

  return (
    <div className="app-container">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">📄</span>
            {!collapsed && <span className="logo-text">PDF Master</span>}
          </div>
          <button
            className="toggle-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? '展开' : '收起'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>
        {!collapsed && (
          <div className="sidebar-footer">
            <p>v1.0.0</p>
            <p className="footer-sub">PDF 处理工具</p>
          </div>
        )}
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/merge" element={<MergePage />} />
          <Route path="/split" element={<SplitPage />} />
          <Route path="/edit" element={<EditPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
