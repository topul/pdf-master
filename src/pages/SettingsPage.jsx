import React, { useState, useEffect, useCallback } from 'react'
import {
  Settings,
  Palette,
  Globe,
  Keyboard,
  History,
  Monitor,
  Sun,
  Moon,
  ChevronRight,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useTheme } from '@/hooks/useTheme.js'
import { useLocale } from '@/hooks/useLocale.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/PageHeader.jsx'

function SettingsPage() {
  const t = useTranslations()
  const { mode: themeMode, setTheme } = useTheme()
  const { locale, changeLocale } = useLocale()

  const themeOptions = [
    { value: 'system', label: '跟随系统', icon: Monitor },
    { value: 'light', label: '浅色', icon: Sun },
    { value: 'dark', label: '深色', icon: Moon },
  ]

  const localeOptions = [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en-US', label: 'English' },
  ]

  const shortcuts = [
    { keys: ['Ctrl', 'O'], desc: t.shortcuts?.openFile || '打开文件' },
    { keys: ['Ctrl', 'N'], desc: t.shortcuts?.newWindow || '新建窗口' },
    { keys: ['Ctrl', 'Home'], desc: t.shortcuts?.goHome || '返回首页' },
    { keys: ['Ctrl', '1'], desc: t.common.merge },
    { keys: ['Ctrl', '2'], desc: t.common.split },
    { keys: ['Ctrl', '3'], desc: t.common.edit },
    { keys: ['Ctrl', '4'], desc: t.common.imageToPdf },
    { keys: ['Ctrl', '5'], desc: t.common.pdfToImage },
    { keys: ['Ctrl', '6'], desc: t.common.compress },
    { keys: ['Ctrl', '7'], desc: t.common.extract },
    { keys: ['Ctrl', '8'], desc: t.common.text },
  ]

  const [historyLimit, setHistoryLimit] = useState(20)

  // ====== 自动更新状态 ======
  // status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  const [updateStatus, setUpdateStatus] = useState('idle')
  const [updateInfo, setUpdateInfo] = useState(null) // { version, releaseNotes, releaseDate }
  const [downloadPercent, setDownloadPercent] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  // 订阅主进程推送的更新状态
  useEffect(() => {
    const api = window.electronAPI
    if (!api?.onUpdateStatus) return
    const unsubscribe = api.onUpdateStatus((payload) => {
      if (!payload) return
      switch (payload.event) {
        case 'checking':
          setUpdateStatus('checking')
          setErrorMsg('')
          break
        case 'available':
          setUpdateStatus('available')
          setUpdateInfo({ version: payload.version, releaseNotes: payload.releaseNotes, releaseDate: payload.releaseDate })
          setDownloadPercent(0)
          setErrorMsg('')
          break
        case 'not-available':
          setUpdateStatus('not-available')
          setErrorMsg('')
          break
        case 'downloading':
          setUpdateStatus('downloading')
          setDownloadPercent(payload.percent || 0)
          break
        case 'downloaded':
          setUpdateStatus('downloaded')
          setDownloadPercent(100)
          break
        case 'error':
          setUpdateStatus('error')
          setErrorMsg(payload.message || 'unknown error')
          break
        default:
          break
      }
    })
    return unsubscribe
  }, [])

  const handleCheckUpdate = useCallback(() => {
    setUpdateStatus('checking')
    setErrorMsg('')
    window.electronAPI?.updateCheck?.()
  }, [])

  const handleDownloadUpdate = useCallback(() => {
    setUpdateStatus('downloading')
    setDownloadPercent(0)
    window.electronAPI?.updateDownload?.()
  }, [])

  const handleInstallUpdate = useCallback(() => {
    window.electronAPI?.updateInstall?.()
  }, [])

  const handleHistoryLimitChange = (e) => {
    const val = parseInt(e.target.value)
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setHistoryLimit(val)
      localStorage.setItem('pdf-master-history-limit', String(val))
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-5 px-6 py-6 lg:px-8">
      <PageHeader
        icon={Settings}
        title={t.settings?.title || '设置'}
        description={t.settings?.description || '自定义 PDF Master 的外观和行为'}
      />

      <Tabs defaultValue="general" className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">{t.settings?.general || '常规'}</TabsTrigger>
          <TabsTrigger value="appearance">{t.settings?.appearance || '外观'}</TabsTrigger>
          <TabsTrigger value="shortcuts">{t.settings?.shortcuts || '快捷键'}</TabsTrigger>
          <TabsTrigger value="about">{t.settings?.about || '关于'}</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex-1 overflow-y-auto">
          <TabsContent value="general" className="mt-0">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Globe className="h-4 w-4" />
                    {t.settings?.language || '语言'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {localeOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => changeLocale(opt.value)}
                        className={cn(
                          'flex items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-all',
                          locale === opt.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-muted-foreground/30'
                        )}
                      >
                        <span>{opt.label}</span>
                        {locale === opt.value && (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4" />
                    {t.settings?.history || '历史记录'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="history-limit">{t.settings?.maxHistory || '最大记录数'}</Label>
                    <Input
                      id="history-limit"
                      type="number"
                      min={0}
                      max={100}
                      value={historyLimit}
                      onChange={handleHistoryLimitChange}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t.settings?.historyHint || '设置为 0 则不保存历史记录'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Palette className="h-4 w-4" />
                    {t.settings?.theme || '主题'}
                  </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {themeOptions.map((opt) => {
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-md border px-3 py-4 text-sm transition-all',
                          themeMode === opt.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-muted-foreground/30'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shortcuts" className="mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Keyboard className="h-4 w-4" />
                    {t.settings?.globalShortcuts || '全局快捷键'}
                  </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {shortcuts.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2.5"
                    >
                      <span className="text-sm">{item.desc}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, ki) => (
                          <React.Fragment key={ki}>
                            <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-medium">
                              {key}
                            </kbd>
                            {ki < item.keys.length - 1 && (
                              <span className="text-xs text-muted-foreground">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="mt-0">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md">
                  <Settings className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold">PDF Master</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.settings?.version || '版本'} 1.9.0
                </p>
                <p className="mt-4 max-w-sm text-xs text-muted-foreground">
                  {t.settings?.aboutDesc || '一款完全在本地运行的 PDF 处理工具集，保护您的隐私安全。'}
                </p>

                {/* 更新状态区 */}
                <div className="mt-6 w-full max-w-sm space-y-3">
                  {/* 状态提示行 */}
                  {updateStatus === 'checking' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t.settings?.updateChecking || '正在检查更新...'}</span>
                    </div>
                  )}
                  {updateStatus === 'available' && updateInfo && (
                    <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        {(t.settings?.updateAvailable || '发现新版本 {version}').replace('{version}', updateInfo.version || '')}
                      </span>
                    </div>
                  )}
                  {updateStatus === 'not-available' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>{t.settings?.updateLatest || '已是最新版本'}</span>
                    </div>
                  )}
                  {updateStatus === 'downloading' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Download className="h-3.5 w-3.5" />
                          {t.settings?.updateDownloading || '下载中...'}
                        </span>
                        <span className="tabular-nums">{downloadPercent}%</span>
                      </div>
                      <Progress value={downloadPercent} className="h-1.5" />
                    </div>
                  )}
                  {updateStatus === 'downloaded' && (
                    <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t.settings?.updateDownloaded || '更新已下载，重启后生效'}</span>
                    </div>
                  )}
                  {updateStatus === 'error' && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-left text-xs text-destructive">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div>
                        <div className="font-medium">{t.settings?.updateError || '更新失败'}</div>
                        {errorMsg && <div className="mt-0.5 break-all opacity-80">{errorMsg}</div>}
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {(updateStatus === 'idle' || updateStatus === 'error' || updateStatus === 'not-available') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCheckUpdate}
                        disabled={updateStatus === 'checking'}
                      >
                        <RefreshCw className="mr-1.5 h-4 w-4" />
                        {t.settings?.checkUpdate || '检查更新'}
                      </Button>
                    )}
                    {updateStatus === 'available' && (
                      <Button size="sm" onClick={handleDownloadUpdate}>
                        <Download className="mr-1.5 h-4 w-4" />
                        {t.settings?.updateDownload || '下载更新'}
                      </Button>
                    )}
                    {updateStatus === 'downloaded' && (
                      <Button size="sm" onClick={handleInstallUpdate}>
                        <RotateCcw className="mr-1.5 h-4 w-4" />
                        {t.settings?.updateInstallRestart || '重启并安装'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.electronAPI?.openExternal?.(
                          'https://github.com/topul/pdf-master/releases'
                        )
                      }
                    >
                      {t.settings?.openSource || '开源地址'}
                    </Button>
                  </div>

                  {/* 发布说明 */}
                  {updateInfo?.releaseNotes && (updateStatus === 'available' || updateStatus === 'downloaded') && (
                    <details className="mt-2 rounded-md border bg-muted/30 p-2.5 text-left">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                        {t.settings?.updateReleaseNotes || '更新内容'}
                      </summary>
                      <div className="mt-2 whitespace-pre-wrap text-xs text-foreground/80">
                        {typeof updateInfo.releaseNotes === 'string'
                          ? updateInfo.releaseNotes
                          : JSON.stringify(updateInfo.releaseNotes)}
                      </div>
                    </details>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default SettingsPage
