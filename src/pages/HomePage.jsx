import React from 'react'
import { Link } from 'react-router-dom'

function HomePage() {
  const features = [
    {
      path: '/merge',
      icon: '📎',
      title: '合并 PDF',
      description: '将多个 PDF 文件合并为一个完整的文档',
      color: 'primary',
    },
    {
      path: '/split',
      icon: '✂️',
      title: '拆分 PDF',
      description: '将 PDF 按页码范围或单页拆分成多个文件',
      color: 'success',
    },
    {
      path: '/edit',
      icon: '✏️',
      title: '编辑 PDF',
      description: '旋转页面、删除页面、提取页面、重新排序',
      color: 'warning',
    },
  ]

  return (
    <div className="home-page">
      <div className="hero-section">
        <h1 className="hero-title">
          <span className="hero-icon">📄</span>
          PDF Master
        </h1>
        <p className="hero-subtitle">
          强大的跨平台 PDF 处理工具，让 PDF 编辑变得简单高效
        </p>
      </div>

      <div className="features-grid">
        {features.map((feature) => (
          <Link
            key={feature.path}
            to={feature.path}
            className={`feature-card ${feature.color}`}
          >
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-desc">{feature.description}</p>
            <div className="feature-arrow">开始使用 →</div>
          </Link>
        ))}
      </div>

      <div className="info-section">
        <div className="info-card">
          <h3>💡 使用说明</h3>
          <ul>
            <li>所有处理均在本地完成，保护您的隐私安全</li>
            <li>支持批量处理，高效便捷</li>
            <li>纯前端处理，无需上传文件到服务器</li>
            <li>跨平台支持 Windows、MacOS、Linux</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default HomePage
