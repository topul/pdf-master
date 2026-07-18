import React, { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import MergePage from './pages/MergePage.jsx'
import SplitPage from './pages/SplitPage.jsx'
import EditPage from './pages/EditPage.jsx'
import HomePage from './pages/HomePage.jsx'
import TextPage from './pages/TextPage.jsx'
import WatermarkPage from './pages/WatermarkPage.jsx'
import PrintPage from './pages/PrintPage.jsx'
import PageNumberPage from './pages/PageNumberPage.jsx'

function App() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const menuGroups = [
    {
      label: '核心功能',
      items: [
        { path: '/merge', label: '合并 PDF', icon: '📎' },
        { path: '/split', label: '拆分 PDF', icon: '✂️' },
        { path: '/edit', label: '编辑 PDF', icon: '✏️' },
      ],
    },
    {
      label: '更多工具',
      items: [
        { path: '/text', label: '添加文字', icon: '📝' },
        { path: '/watermark', label: '添加水印', icon: '💧' },
        { path: '/pagenum', label: '添加页码', icon: '🔢' },
        { path: '/print', label: '打印 PDF', icon: '🖨️' },
      ],
    },
  ]

  const isActive = (path) => location.pathname === path

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
          <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
            <span className="nav-icon">🏠</span>
            {!collapsed && <span className="nav-label">首页</span>}
          </Link>
          {menuGroups.map((group, gi) => (
            <div key={gi} className="nav-group">
              {!collapsed && <div className="nav-group-label">{group.label}</div>}
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        {!collapsed && (
          <div className="sidebar-footer">
            <p>v1.1.0</p>
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
          <Route path="/text" element={<TextPage />} />
          <Route path="/watermark" element={<WatermarkPage />} />
          <Route path="/pagenum" element={<PageNumberPage />} />
          <Route path="/print" element={<PrintPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
