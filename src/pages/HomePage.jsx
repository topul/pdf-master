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
  ImagePlus,
  Image as ImageIcon,
  FileCog,
  Lock,
  FileDown,
  FileImage,
  Layers,
  PenTool,
  FileEdit,
  Bookmark,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTranslations } from '@/hooks/useLocale.js'
import { cn } from '@/lib/utils'

function HomePage() {
  const t = useTranslations()

  const mainFeatures = [
    {
      path: '/merge',
      icon: FilePlus2,
      title: t.common.merge,
      description: t.home.feature1,
      accent: 'from-blue-500 to-indigo-600',
      tag: '常用',
    },
    {
      path: '/split',
      icon: Scissors,
      title: t.common.split,
      description: t.home.feature2,
      accent: 'from-rose-500 to-pink-600',
      tag: '常用',
    },
    {
      path: '/edit',
      icon: PencilLine,
      title: t.common.edit,
      description: t.home.feature3,
      accent: 'from-amber-500 to-orange-600',
      tag: '可视化',
    },
  ]

  const convertFeatures = [
    {
      path: '/image-to-pdf',
      icon: ImagePlus,
      title: t.common.imageToPdf,
      description: t.home.feature4,
      accent: 'text-emerald-600 bg-emerald-500/10',
    },
    {
      path: '/pdf-to-image',
      icon: ImageIcon,
      title: t.common.pdfToImage,
      description: t.home.feature4,
      accent: 'text-orange-600 bg-orange-500/10',
    },
  ]

  const moreFeatures = [
    {
      path: '/compress',
      icon: FileDown,
      title: t.common.compress,
      description: t.nav.compressDesc,
      accent: 'text-emerald-600 bg-emerald-500/10',
    },
    {
      path: '/extract',
      icon: FileImage,
      title: t.common.extract,
      description: t.nav.extractDesc,
      accent: 'text-amber-600 bg-amber-500/10',
    },
    {
      path: '/text',
      icon: Type,
      title: t.common.text,
      description: t.nav.textDesc,
      accent: 'text-emerald-600 bg-emerald-500/10',
    },
    {
      path: '/watermark',
      icon: Droplet,
      title: t.common.watermark,
      description: t.nav.watermarkDesc,
      accent: 'text-pink-600 bg-pink-500/10',
    },
    {
      path: '/pagenum',
      icon: Hash,
      title: t.common.pagenum,
      description: t.nav.pagenumDesc,
      accent: 'text-violet-600 bg-violet-500/10',
    },
    {
      path: '/metadata',
      icon: FileCog,
      title: t.common.metadata,
      description: t.nav.metadataDesc,
      accent: 'text-sky-600 bg-sky-500/10',
    },
    {
      path: '/encrypt',
      icon: Lock,
      title: t.common.encrypt,
      description: t.nav.encryptDesc,
      accent: 'text-red-600 bg-red-500/10',
    },
    {
      path: '/print',
      icon: Printer,
      title: t.common.print,
      description: t.nav.printDesc,
      accent: 'text-cyan-600 bg-cyan-500/10',
    },
    {
      path: '/batch',
      icon: Layers,
      title: t.common.batch,
      description: t.nav.batchDesc,
      accent: 'text-violet-600 bg-violet-500/10',
    },
    {
      path: '/signature',
      icon: PenTool,
      title: t.common.signature,
      description: t.nav.signatureDesc,
      accent: 'text-orange-600 bg-orange-500/10',
    },
    {
      path: '/form',
      icon: FileEdit,
      title: t.common.form,
      description: t.nav.formDesc,
      accent: 'text-pink-600 bg-pink-500/10',
    },
    {
      path: '/bookmark',
      icon: Bookmark,
      title: t.common.bookmark,
      description: t.nav.bookmarkDesc,
      accent: 'text-indigo-600 bg-indigo-500/10',
    },
    {
      path: '/crop',
      icon: Scissors,
      title: t.common.crop,
      description: t.nav.cropDesc,
      accent: 'text-teal-600 bg-teal-500/10',
    },
  ]

  const stats = [
    { value: '19+', label: t.home.features },
    { value: '3', label: 'Platforms' },
    { value: '100%', label: 'Local' },
    { value: '0', label: 'Uploads' },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 lg:py-12">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 lg:p-12">
        <div className="absolute inset-0 -z-10 opacity-60">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
        <Badge className="mb-4 gap-1.5 border-primary/20 bg-primary/5 text-primary">
          <Sparkles className="h-3 w-3" />
          {t.home.subtitle}
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-4xl">
          {t.home.title}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground lg:text-lg">
          {t.home.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>{t.common.confirm}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Cpu className="h-4 w-4 text-blue-500" />
            <span>{t.home.subtitle.split(' · ')[1]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <WifiOff className="h-4 w-4 text-violet-500" />
            <span>{t.home.subtitle.split(' · ')[2]}</span>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t.nav.core}</h2>
            <p className="text-sm text-muted-foreground">{t.home.description}</p>
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
                      {t.common.apply}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t.nav.convert}</h2>
            <p className="text-sm text-muted-foreground">{t.home.description}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {convertFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <Link key={feature.path} to={feature.path} className="group">
                <Card className="relative h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex h-full items-center gap-4 p-5">
                    <div
                      className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                        feature.accent
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold">{feature.title}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t.nav.tools}</h2>
            <p className="text-sm text-muted-foreground">{t.home.description}</p>
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