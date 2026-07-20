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
  PenTool,
  FileEdit,
  Bookmark,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle.jsx'
import { useTranslations, useLocale } from '@/hooks/useLocale.jsx'
import { getLocaleName } from '@/i18n/index.js'
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

function App() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const { locale, changeLocale } = useLocale()
  const t = useTranslations()

  const menuGroups = [
    {
      label: t.nav.core,
      items: [
        { path: '/merge', label: t.common.merge, icon: FilePlus2, desc: t.nav.mergeDesc },
        { path: '/split', label: t.common.split, icon: Scissors, desc: t.nav.splitDesc },
        { path: '/edit', label: t.common.edit, icon: PencilLine, desc: t.nav.editDesc },
      ],
    },
    {
      label: t.nav.convert,
      items: [
        { path: '/image-to-pdf', label: t.common.imageToPdf, icon: ImagePlus, desc: t.nav.imageToPdfDesc },
        { path: '/pdf-to-image', label: t.common.pdfToImage, icon: ImageIcon, desc: t.nav.pdfToImageDesc },
      ],
    },
    {
      label: t.nav.tools,
      items: [
        { path: '/compress', label: t.common.compress, icon: FileDown, desc: t.nav.compressDesc },
        { path: '/extract', label: t.common.extract, icon: FileImage, desc: t.nav.extractDesc },
        { path: '/text', label: t.common.text, icon: Type, desc: t.nav.textDesc },
        { path: '/watermark', label: t.common.watermark, icon: Droplet, desc: t.nav.watermarkDesc },
        { path: '/pagenum', label: t.common.pagenum, icon: Hash, desc: t.nav.pagenumDesc },
        { path: '/metadata', label: t.common.metadata, icon: FileCog, desc: t.nav.metadataDesc },
        { path: '/encrypt', label: t.common.encrypt, icon: Lock, desc: t.nav.encryptDesc },
        { path: '/print', label: t.common.print, icon: Printer, desc: t.nav.printDesc },
      ],
    },
    {
      label: t.nav.efficiency,
      items: [
        { path: '/batch', label: t.common.batch, icon: Layers, desc: t.nav.batchDesc },
        { path: '/signature', label: t.common.signature, icon: PenTool, desc: t.nav.signatureDesc },
        { path: '/form', label: t.common.form, icon: FileEdit, desc: t.nav.formDesc },
        { path: '/bookmark', label: t.common.bookmark, icon: Bookmark, desc: t.nav.bookmarkDesc },
        { path: '/crop', label: t.common.crop, icon: Scissors, desc: t.nav.cropDesc },
      ],
    },
  ]

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const availableLocales = [
    { value: 'zh-CN', label: t.common.chinese },
    { value: 'en-US', label: t.common.english },
  ]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-muted/30 text-foreground">
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col border-r bg-card transition-all duration-300 ease-out',
          collapsed ? 'w-[68px]' : 'w-[244px]'
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">PDF Master</span>
              <span className="text-[11px] text-muted-foreground">{t.home.subtitle}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <Link
            to="/"
            className={cn(
              'group mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive('/')
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
            title={t.common.home}
          >
            <Home className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{t.common.home}</span>}
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

        <div className="flex flex-col gap-1 border-t p-2">
          <div className={cn('flex', collapsed ? 'flex-col items-center gap-1' : 'items-center justify-between')}>
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title={t.common.language}
              >
                <Globe className="h-[18px] w-[18px]" />
              </button>
              {showLangMenu && (
                <div className={cn(
                  'absolute z-50 w-36 overflow-hidden rounded-md border bg-popover p-1 shadow-md',
                  collapsed ? 'left-full top-0 ml-2' : 'bottom-full right-0 mb-2'
                )}>
                  {availableLocales.map((loc) => (
                    <button
                      key={loc.value}
                      onClick={() => {
                        changeLocale(loc.value)
                        setShowLangMenu(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-sm transition-colors',
                        locale === loc.value
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <Globe className="h-4 w-4" />
                      <span>{loc.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? t.common.expand : t.common.collapse}
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
            <Route path="/signature" element={<SignaturePage />} />
            <Route path="/form" element={<FormPage />} />
            <Route path="/bookmark" element={<BookmarkPage />} />
            <Route path="/crop" element={<CropPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default App