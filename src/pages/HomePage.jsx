import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Trash2,
  Clock,
  ShieldCheck,
  Cpu,
  WifiOff,
  Sparkles,
  Pin,
  PinOff,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { SearchBar } from '@/components/SearchBar.jsx'
import { QuickActions } from '@/components/QuickActions.jsx'
import { CategoryCards } from '@/components/CategoryCards.jsx'
import { getSortedHistory, clearHistory, removeFromHistory, togglePin, formatDate, formatSize } from '../utils/history'
import { useContextMenu } from '../components/ContextMenu'

function HomePage() {
  const t = useTranslations()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [contextFile, setContextFile] = useState(null)

  useEffect(() => {
    setHistory(getSortedHistory())
  }, [])

  const handleClearHistory = () => {
    clearHistory()
    setHistory([])
  }

  const handleDeleteFile = (file) => {
    const filtered = removeFromHistory(file.path)
    setHistory(filtered)
  }

  const handleTogglePin = (file) => {
    setHistory(togglePin(file.path))
  }

  // 在系统文件管理器中显示文件所在文件夹
  const handleShowInFolder = async (file) => {
    try {
      await window.electronAPI?.showItemInFolder?.(file.path)
    } catch (e) {
      // 降级：复制路径到剪贴板
      handleCopyPath(file)
    }
  }

  // 复制文件路径到剪贴板
  const handleCopyPath = async (file) => {
    try {
      await navigator.clipboard.writeText(file.path)
    } catch (e) {
      // ignore
    }
  }

  const handleOpenFile = async (file) => {
    const result = await window.electronAPI.readFile(file.path)
    if (result.success) {
      const fileData = {
        path: file.path,
        name: file.name,
        data: result.data,
        size: result.data.length,
      }
      navigate('/viewer', { state: { file: fileData } })
    }
  }

  const handleContextMenu = (e, file) => {
    e.preventDefault()
    setContextFile(file)
  }

  const menuItems = [
    {
      label: t.common?.open || '打开',
      onClick: () => handleOpenFile(contextFile),
    },
    {
      label: contextFile?.pinned
        ? (t.common?.unpin || '取消固定')
        : (t.common?.pin || '固定置顶'),
      onClick: () => handleTogglePin(contextFile),
    },
    { divider: true },
    {
      label: t.common?.showInFolder || '在文件夹中显示',
      onClick: () => handleShowInFolder(contextFile),
    },
    {
      label: t.common?.copyPath || '复制路径',
      onClick: () => handleCopyPath(contextFile),
    },
    { divider: true },
    {
      label: t.common?.delete || '删除',
      danger: true,
      onClick: () => handleDeleteFile(contextFile),
    },
  ]

  const { renderMenu } = useContextMenu(menuItems, [contextFile])

  const stats = [
    { value: '27+', label: t.home?.statFeatures || t.home?.features || '功能' },
    { value: '3', label: t.home?.statPlatforms || 'Platforms' },
    { value: '100%', label: t.home?.statLocal || 'Local' },
    { value: '0', label: t.home?.statUploads || 'Uploads' },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 lg:px-10 lg:py-10">
      {/* Hero + 搜索区域 */}
      <section className="relative rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 lg:p-10">
        {/* 装饰层独立裁剪，避免外层 overflow-hidden 截断搜索下拉框 */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl opacity-60">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
        <Badge className="mb-4 gap-1.5 border-primary/20 bg-primary/5 text-primary">
          <Sparkles className="h-3 w-3" />
          {t.home?.subtitle}
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-3xl">
          {t.home?.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground lg:text-base">
          {t.home?.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>{t.common?.confirm}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-blue-500" />
            <span>{t.home?.subtitle?.split(' · ')[1]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WifiOff className="h-4 w-4 text-violet-500" />
            <span>{t.home?.subtitle?.split(' · ')[2]}</span>
          </div>
        </div>

        {/* 大尺寸搜索框 */}
        <div className="mt-6 flex justify-center">
          <SearchBar variant="hero" />
        </div>
      </section>

      {/* 快捷操作 */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          {t.home?.quickStart || '快速开始'}
        </h2>
        <QuickActions />
      </section>

      {/* 工具分类 */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          {t.home?.categories || '工具分类'}
        </h2>
        <CategoryCards />
      </section>

      {/* 统计数据 */}
      <section className="mt-8">
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={
                  'flex flex-col items-center justify-center gap-1 py-2 text-center ' +
                  (i !== stats.length - 1 ? 'md:border-r' : '')
                }
              >
                <div className="text-2xl font-bold tracking-tight text-primary">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* 最近文件 */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight">
              {t.home?.recentFiles || '最近文件'}
            </h2>
          </div>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearHistory}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {t.home?.clearHistory || '清除历史'}
            </Button>
          )}
        </div>
        {history.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {history.slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className="group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    onClick={() => handleOpenFile(item)}
                  >
                    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                      {item.pinned && (
                        <Pin className="absolute -right-1 -top-1 h-3 w-3 rotate-45 fill-primary text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{item.name}</span>
                        {item.pinned && (
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {t.common?.pinned || '已固定'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatSize(item.size)}</span>
                        <span>·</span>
                        <span>{formatDate(item.accessedAt)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTogglePin(item)
                      }}
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                      title={item.pinned ? (t.common?.unpin || '取消固定') : (t.common?.pin || '固定置顶')}
                    >
                      {item.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteFile(item)
                      }}
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <FileText className="mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm">{t.home?.noRecentFiles || '暂无最近打开的文件'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {renderMenu()}
    </div>
  )
}

export default HomePage
