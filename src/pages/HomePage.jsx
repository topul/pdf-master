import React from 'react'
import { Link } from 'react-router-dom'
import {
  FilePlus2,
  Scissors,
  PencilLine,
  Type,
  Droplet,
  Hash,
  Printer,
  ArrowRight,
  ShieldCheck,
  Cpu,
  WifiOff,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function HomePage() {
  const mainFeatures = [
    {
      path: '/merge',
      icon: FilePlus2,
      title: '合并 PDF',
      description: '将多个 PDF 按顺序合并为一个文档，支持任意顺序调整',
      accent: 'from-blue-500 to-indigo-600',
      tag: '常用',
    },
    {
      path: '/split',
      icon: Scissors,
      title: '拆分 PDF',
      description: '按页数、范围或单页拆分 PDF，灵活提取所需内容',
      accent: 'from-rose-500 to-pink-600',
      tag: '常用',
    },
    {
      path: '/edit',
      icon: PencilLine,
      title: '编辑 PDF',
      description: '旋转、删除、提取、重排页面，所有操作实时预览',
      accent: 'from-amber-500 to-orange-600',
      tag: '可视化',
    },
  ]

  const moreFeatures = [
    {
      path: '/text',
      icon: Type,
      title: '添加文字',
      description: '点击预览图选择位置，叠加自定义文字',
      accent: 'text-emerald-600 bg-emerald-500/10',
    },
    {
      path: '/watermark',
      icon: Droplet,
      title: '添加水印',
      description: '批量给所有页面添加自定义文字水印',
      accent: 'text-pink-600 bg-pink-500/10',
    },
    {
      path: '/pagenum',
      icon: Hash,
      title: '添加页码',
      description: '自动给每页添加页码，支持多种位置与格式',
      accent: 'text-violet-600 bg-violet-500/10',
    },
    {
      path: '/print',
      icon: Printer,
      title: '打印 PDF',
      description: '调用系统打印对话框，支持自定义打印范围',
      accent: 'text-cyan-600 bg-cyan-500/10',
    },
  ]

  const stats = [
    { value: '7+', label: 'PDF 工具' },
    { value: '3', label: '支持平台' },
    { value: '100%', label: '本地处理' },
    { value: '0', label: '文件上传' },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 lg:py-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 lg:p-12">
        <div className="absolute inset-0 -z-10 opacity-60">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
        <Badge className="mb-4 gap-1.5 border-primary/20 bg-primary/5 text-primary">
          <Sparkles className="h-3 w-3" />
          跨平台 · 本地处理 · 隐私安全
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-4xl">
          一站式 PDF 处理工具
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground lg:text-lg">
          所有操作均在本地完成，文件不上传云端，安全、快速、可离线使用。
          支持合并、拆分、编辑、文字、水印、页码与打印等常用功能。
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>隐私安全</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-blue-500" />
            <span>本地处理</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WifiOff className="h-4 w-4 text-violet-500" />
            <span>离线可用</span>
          </div>
        </div>
      </section>

      {/* 核心功能 */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">核心功能</h2>
            <p className="text-sm text-muted-foreground">最常用的 PDF 操作，一键开始</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {mainFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <Link key={feature.path} to={feature.path} className="group">
                <Card className="relative h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', feature.accent)} />
                  <CardContent className="flex h-full flex-col gap-3 p-6">
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
                          feature.accent
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {feature.tag}
                      </Badge>
                    </div>
                    <div className="mt-1 flex-1">
                      <h3 className="text-base font-semibold">{feature.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      开始使用
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {/* 更多工具 */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">更多工具</h2>
            <p className="text-sm text-muted-foreground">辅助功能让 PDF 处理更高效</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {moreFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <Link key={feature.path} to={feature.path} className="group">
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        feature.accent
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{feature.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      {/* 统计信息 */}
      <section className="mt-10">
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 text-center',
                  i !== stats.length - 1 && 'md:border-r'
                )}
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
    </div>
  )
}

export default HomePage
