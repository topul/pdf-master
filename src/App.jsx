import React, { useState, useRef, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  FileText,
  PanelLeftClose,
  PanelLeft,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Star,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/hooks/useLocale.jsx'
import useShortcuts from '@/hooks/useShortcuts.jsx'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut.jsx'
import { useFavorites } from '@/hooks/useFavorites.jsx'
import { NAV_GROUPS } from '@/config/navigation'
import { SearchBar } from '@/components/SearchBar.jsx'
import { CollapsibleGroup } from '@/components/CollapsibleGroup.jsx'
import { FavoritesList } from '@/components/FavoritesList.jsx'
import { RecentTools } from '@/components/RecentTools.jsx'
import { ShortcutHelpDialog } from '@/components/ShortcutHelpDialog.jsx'
import { useContextMenu } from '@/components/ContextMenu'
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
import SignaturePage from './pages/SignaturePage.jsx'
import FormPage from './pages/FormPage.jsx'
import BookmarkPage from './pages/BookmarkPage.jsx'
import CropPage from './pages/CropPage.jsx'
import ComparePage from './pages/ComparePage.jsx'
import OcrPage from './pages/OcrPage.jsx'
import WatermarkRemovePage from './pages/WatermarkRemovePage.jsx'
import PdfToWordPage from './pages/PdfToWordPage.jsx'
import PdfToExcelPage from './pages/PdfToExcelPage.jsx'
import AnnotatePage from './pages/AnnotatePage.jsx'
import FormCreatePage from './pages/FormCreatePage.jsx'
import BatchRenamePage from './pages/BatchRenamePage.jsx'
import ViewerPage from './pages/ViewerPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import DragDropProvider from './components/DragDropProvider.jsx'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [showShortcutHelp, setShowShortcutHelp] = useState(false)
  const t = useTranslations()

  // 注册 Electron 层快捷键
  useShortcuts()

  // 全局 Ctrl+K：展开态聚焦侧边栏搜索框，收起态弹出浮动搜索面板
  useKeyboardShortcut('ctrl+k', () => {
    if (collapsed) {
      setShowSearchPanel((v) => !v)
    } else {
      // 触发侧边栏 SearchBar 聚焦：通过自定义事件
      window.dispatchEvent(new CustomEvent('sidebar:focus-search'))
    }
  })

  // Ctrl+B：收起/展开侧边栏
  useKeyboardShortcut('ctrl+b', () => setCollapsed((v) => !v))

  // ? 键：显示快捷键帮助面板
  useKeyboardShortcut('?', () => setShowShortcutHelp(true))

  // 收起态浮动面板 Esc 关闭
  useKeyboardShortcut('escape', () => setShowSearchPanel(false), [showSearchPanel])

  // 全局快捷键打开文件处理
  useEffect(() => {
    const handleOpenFile = async () => {
      const result = await window.electronAPI?.openFiles?.({
        properties: ['openFile'],
        filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
      })
      if (!result || result.canceled) return

      const filePath = result.filePaths[0]
      const fileResult = await window.electronAPI?.readFile?.(filePath)
      if (fileResult?.success) {
        const fileName = filePath.split(/[\\/]/).pop()
        window.dispatchEvent(
          new CustomEvent('files:dropped', {
            detail: {
              files: [
                {
                  path: filePath,
                  name: fileName,
                  data: fileResult.data,
                  size: fileResult.data.length,
                },
              ],
            },
          })
        )
      }
    }

    window.addEventListener('shortcut:openFile', handleOpenFile)
    return () => window.removeEventListener('shortcut:openFile', handleOpenFile)
  }, [])

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  // ====== 工具项右键菜单（收藏）======
  const { favorites, isFavorited, toggleFavorite } = useFavorites(t)
  const [contextTool, setContextTool] = useState(null)
  const searchPanelRef = useRef(null)

  const handleContextMenuTool = (e, tool) => {
    e.preventDefault()
    setContextTool(tool)
  }

  const toolMenuItems = [
    {
      label: t.common?.open || '打开',
      onClick: () => {
        if (contextTool) navigate(contextTool.path)
      },
    },
    { divider: true },
    {
      label: isFavorited(contextTool?.id)
        ? (t.common?.removeFavorite || '取消收藏')
        : (t.common?.addFavorite || '添加到收藏夹'),
      onClick: () => {
        if (contextTool) toggleFavorite(contextTool)
      },
    },
  ]

  const { renderMenu: renderToolMenu } = useContextMenu(toolMenuItems, [contextTool, favorites])

  return (
    <DragDropProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-muted/30 text-foreground">
        <aside
          className={cn(
            'flex h-full shrink-0 flex-col border-r bg-card transition-all duration-300 ease-out',
            collapsed ? 'w-[68px]' : 'w-[244px]'
          )}
        >
          {/* Logo 区域 */}
          <div className="flex h-14 items-center gap-3 border-b px-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold tracking-tight">PDF Master</span>
                <span className="text-[11px] text-muted-foreground">{t.home?.subtitle}</span>
              </div>
            )}
          </div>

          {/* 搜索框区域 */}
          <div className="px-2 pt-2">
            {collapsed ? (
              <button
                onClick={() => setShowSearchPanel(true)}
                className="flex h-10 w-full items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title={t.common?.search || '搜索功能'}
              >
                <SearchIcon className="h-[18px] w-[18px]" />
              </button>
            ) : (
              <SearchBar variant="sidebar" />
            )}
          </div>

          {/* 导航区域 */}
          <nav className="flex-1 overflow-y-auto px-2 py-2">
            <Link
              to="/"
              className={cn(
                'group mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive('/')
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
              title={t.common?.home}
            >
              <Home className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{t.common?.home}</span>}
            </Link>

            {/* 收藏夹 & 最近使用 */}
            {!collapsed ? (
              <>
                <FavoritesList collapsed={false} onContextMenuTool={handleContextMenuTool} />
                <RecentTools collapsed={false} />
                <div className="mx-3 my-2 border-t" />
              </>
            ) : (
              <>
                {favorites.length > 0 && (
                  <div className="mx-3 my-2 flex flex-col items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                )}
              </>
            )}

            {/* 分组导航：前两组视觉相邻（不加分隔） */}
            {NAV_GROUPS.map((group) => (
              <CollapsibleGroup
                key={group.id}
                group={group}
                isActive={isActive}
                collapsed={collapsed}
                onContextMenuTool={handleContextMenuTool}
              />
            ))}
          </nav>

          {/* 底部区域 */}
          <div className="flex flex-col gap-1 border-t p-2">
            <div
              className={cn(
                'flex',
                collapsed ? 'flex-col items-center gap-1' : 'items-center justify-between'
              )}
            >
              <Link
                to="/settings"
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title={t.common?.settings || '设置'}
              >
                <SettingsIcon className="h-[18px] w-[18px]" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? t.common?.expand : t.common?.collapse}
              >
                {collapsed ? (
                  <PanelLeft className="h-[18px] w-[18px]" />
                ) : (
                  <PanelLeftClose className="h-[18px] w-[18px]" />
                )}
              </Button>
            </div>
          </div>
        </aside>

        {/* 收起态浮动搜索面板 */}
        {showSearchPanel && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowSearchPanel(false)}
            />
            <div
              ref={searchPanelRef}
              className="fixed left-[68px] top-1/2 z-50 w-[360px] max-h-[400px] -translate-y-1/2 overflow-hidden rounded-lg border bg-popover shadow-lg"
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-medium">{t.common?.search || '搜索功能'}</span>
                <button
                  onClick={() => setShowSearchPanel(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-2">
                <SearchBar variant="sidebar" autoFocus onNavigate={() => setShowSearchPanel(false)} />
              </div>
            </div>
          </>
        )}

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
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/ocr" element={<OcrPage />} />
              <Route path="/watermark-remove" element={<WatermarkRemovePage />} />
              <Route path="/pdf-to-word" element={<PdfToWordPage />} />
              <Route path="/pdf-to-excel" element={<PdfToExcelPage />} />
              <Route path="/annotate" element={<AnnotatePage />} />
              <Route path="/form-create" element={<FormCreatePage />} />
              <Route path="/batch-rename" element={<BatchRenamePage />} />
              <Route path="/signature" element={<SignaturePage />} />
              <Route path="/form" element={<FormPage />} />
              <Route path="/bookmark" element={<BookmarkPage />} />
              <Route path="/crop" element={<CropPage />} />
              <Route path="/viewer" element={<ViewerPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>

        {renderToolMenu()}

        <ShortcutHelpDialog
          open={showShortcutHelp}
          onClose={() => setShowShortcutHelp(false)}
        />
      </div>
    </DragDropProvider>
  )
}

export default App
