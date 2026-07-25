import React, { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    { keys: ['Ctrl', 'O'], desc: '打开文件' },
    { keys: ['Ctrl', 'N'], desc: '新建窗口' },
    { keys: ['Ctrl', 'Home'], desc: '返回首页' },
    { keys: ['Ctrl', '1'], desc: '跳转到第 1 个功能页' },
    { keys: ['Ctrl', '2~9'], desc: '跳转到对应功能页' },
    { keys: ['F12'], desc: '开发者工具（开发环境）' },
  ]

  const [historyLimit, setHistoryLimit] = useState(20)

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
        title="设置"
        description="自定义 PDF Master 的外观和行为"
      />

      <Tabs defaultValue="general" className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">常规</TabsTrigger>
          <TabsTrigger value="appearance">外观</TabsTrigger>
          <TabsTrigger value="shortcuts">快捷键</TabsTrigger>
          <TabsTrigger value="about">关于</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex-1 overflow-y-auto">
          <TabsContent value="general" className="mt-0">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Globe className="h-4 w-4" />
                    语言
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
                    历史记录
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="history-limit">最大记录数</Label>
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
                      设置为 0 则不保存历史记录
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
                  主题
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
                  全局快捷键
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
                <p className="mt-1 text-sm text-muted-foreground">版本 1.9.0</p>
                <p className="mt-4 max-w-sm text-xs text-muted-foreground">
                  一款完全在本地运行的 PDF 处理工具集，保护您的隐私安全。
                </p>
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" size="sm">
                    检查更新
                  </Button>
                  <Button variant="outline" size="sm">
                    开源地址
                  </Button>
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
