import React from 'react'
import { Link } from 'react-router-dom'

function HomePage() {
  const mainFeatures = [
    {
      path: '/merge',
      icon: '📎',
      title: '合并 PDF',
      description: '将多个 PDF 文件按顺序合并为一个完整文档',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      tag: '常用',
    },
    {
      path: '/split',
      icon: '✂️',
      title: '拆分 PDF',
      description: '按页码范围或单页拆分成多个独立文件',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      tag: '常用',
    },
    {
      path: '/edit',
      icon: '✏️',
      title: '编辑 PDF',
      description: '旋转、删除、提取页面，支持实时预览',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      tag: '预览',
    },
  ]

  const moreFeatures = [
    {
      path: '/text',
      icon: '📝',
      title: '添加文字',
      description: '在 PDF 指定位置添加文字内容',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    },
    {
      path: '/watermark',
      icon: '💧',
      title: '添加水印',
      description: '批量给 PDF 页面添加自定义文字水印',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    {
      path: '/print',
      icon: '🖨️',
      title: '打印 PDF',
      description: '直接调用系统打印对话框打印 PDF',
      gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    },
    {
      path: '/pagenum',
      icon: '🔢',
      title: '添加页码',
      description: '自动给 PDF 每页添加页码',
      gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    },
  ]

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-badge">🚀 跨平台 · 本地处理 · 隐私安全</div>
        <h1 className="hero-title">
          <span className="hero-icon">📄</span>
          PDF Master
        </h1>
        <p className="hero-subtitle">
          一站式 PDF 处理工具，所有操作本地完成，文件不上传云端
        </p>
      </div>

      <div className="features-section">
        <div className="section-label">核心功能</div>
        <div className="features-grid main-grid">
          {mainFeatures.map((feature) => (
            <Link
              key={feature.path}
              to={feature.path}
              className="feature-card-main"
              style={{ background: feature.gradient }}
            >
              <div className="feature-card-content">
                <div className="feature-icon-large">{feature.icon}</div>
                <h3 className="feature-title-large">{feature.title}</h3>
                <p className="feature-desc-large">{feature.description}</p>
                <div className="feature-tag">{feature.tag}</div>
              </div>
              <div className="feature-card-overlay">
                <span>开始使用 →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="features-section">
        <div className="section-label">更多工具</div>
        <div className="features-grid more-grid">
          {moreFeatures.map((feature) => (
            <Link
              key={feature.path}
              to={feature.path}
              className="feature-card-more"
            >
              <div
                className="more-icon-wrapper"
                style={{ background: feature.gradient }}
              >
                {feature.icon}
              </div>
              <div className="more-content">
                <h4 className="more-title">{feature.title}</h4>
                <p className="more-desc">{feature.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="stats-section">
        <div className="stat-item">
          <div className="stat-number">7+</div>
          <div className="stat-label">PDF 工具</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <div className="stat-number">3</div>
          <div className="stat-label">支持平台</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <div className="stat-number">100%</div>
          <div className="stat-label">本地处理</div>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <div className="stat-number">0</div>
          <div className="stat-label">文件上传</div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
