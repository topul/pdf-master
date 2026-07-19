import React, { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import {
  Home,
  FilePlus2,
  Scissors,
  PencilLine,
  Type,
  Droplet,
  Hash,
  Printer,
  PanelLeftClose,
  PanelLeft,
  FileText,
  ImagePlus,
  Image as ImageIcon,
  FileCog,
  Lock,
  FileDown,
  FileImage,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle.jsx'
import MergePage from './pages/MergePage.jsx'
import SplitPage from './pages/SplitPage.jsx'
import EditPage from './pages/EditPage.jsx'
import HomePage from './pages/HomePage.jsx'
import TextPage from './pages/TextPage.jsx'
import WatermarkPage from './pages/WatermarkPage.jsx'
import PrintPage from './pages/PrintPage.jsx'
import PageNumberPage from './pages/PageNumberPage.jsx'
import ImageToPdfPage from './pages/ImageToPdfPage.jsx'
import PdfToImagePage from './pages/PdfToImagePage.jsx'
import MetadataPage from './pages/MetadataPage.jsx'
import EncryptPage from './pages/EncryptPage.jsx'
import CompressPage from './pages/CompressPage.jsx'
import ExtractPage from './pages/ExtractPage.jsx'
import BatchPage from './pages/BatchPage.jsx'

function App() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const menuGroups = [
    {
      label: '核心功能',
      items: [
        { path: '/merge', label: '合并 PDF', icon: FilePlus2, desc: '多文件合一' },
        { path: '/split', label: '拆分 PDF', icon: Scissors, desc: '按页或范围' },
        { path: '/edit', label: '编辑 PDF', icon: PencilLine, desc: '旋转/删除/排序' },
      ],
    },
    {
      label: '格式转换',
      items: [
        { path: '/image-to-pdf', label: '图片转 PDF', icon: ImagePlus, desc: '多图合并' },
        { path: '/pdf-to-image', label: 'PDF 转图片', icon: ImageIcon, desc: '逐页导出' },
      ],
    },
    {
      label: '更多工具',
      items: [
        { path: '/compress', label: 'PDF 压缩', icon: FileDown, desc: '减小文件体积' },
        { path: '/extract', label: '提取内容', icon: FileImage, desc: '文字/图片提取' },
        { path: '/text', label: '添加文字', icon: Type, desc: '指定位置叠加' },
        { path: '/watermark', label: '添加水印', icon: Droplet, desc: '批量水印' },
        { path: '/pagenum', label: '添加页码', icon: Hash, desc: '自动页码' },
        { path: '/metadata', label: '元数据', icon: FileCog, desc: '编辑文档信息' },
        { path: '/encrypt', label: '加密/解密', icon: Lock, desc: '密码保护' },
        { path: '/print', label: '打印 PDF', icon: Printer, desc: '调用系统打印' },
      ],
    },
    {
      label: '效率工具',
      items: [
        { path: '/batch', label: '批量处理', icon: Layers, desc: '多文件批量操作' },
      ],
    },
  ]

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-muted/30 text-foreground">
      {/* 侧边栏 */}
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col border-r bg-card transition-all duration-300 ease-out',
          collapsed ? 'w-[68px]' : 'w-[244px]'
        )}
      >
        {/* Logo 区 */}
        <div className="flex h-16 items-center gap-3 border-b px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">PDF Master</span>
              <span className="text-[11px] text-muted-foreground">本地 · 安全 · 快速</span>
            </div>
          )}
        </div>

        {/* 导航区 */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <Link
            to="/"
            className={cn(
              'group mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive('/')
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
            title="首页"
          >
            <Home className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>首页</span>}
          </Link>

          {menuGroups.map((group, gi) => (
            <div key={gi} className="mt-4">
              {!collapsed && (
                <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </div>
              )}
              {collapsed && <div className="mx-3 my-2 border-t" />}
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'group mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-foreground/75 hover:bg-accent hover:text-foreground'
                    )}
                    title={item.label}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-colors',
                        active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      )}
                    />
                    {!collapsed && (
                      <div className="flex flex-col leading-tight">
                        <span>{item.label}</span>
                        <span className="text-[11px] text-muted-foreground/80">{item.desc}</span>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* 底部操作区 */}
        <div className="flex items-center gap-1 border-t p-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-3 px-3 font-normal text-muted-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeft className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}
            {!collapsed && <span>收起侧边栏</span>}
          </Button>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/merge" element={<MergePage />} />
            <Route path="/split" element={<SplitPage />} />
            <Route path="/edit" element={<EditPage />} />
            <Route path="/image-to-pdf" element={<ImageToPdfPage />} />
            <Route path="/pdf-to-image" element={<PdfToImagePage />} />
            <Route path="/text" element={<TextPage />} />
            <Route path="/watermark" element={<WatermarkPage />} />
            <Route path="/pagenum" element={<PageNumberPage />} />
            <Route path="/compress" element={<CompressPage />} />
            <Route path="/extract" element={<ExtractPage />} />
            <Route path="/metadata" element={<MetadataPage />} />
            <Route path="/encrypt" element={<EncryptPage />} />
            <Route path="/print" element={<PrintPage />} />
            <Route path="/batch" element={<BatchPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App
