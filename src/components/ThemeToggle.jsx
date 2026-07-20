import React, { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import useTheme from '@/hooks/useTheme.js'
import { useTranslations } from '@/hooks/useLocale.jsx'
import { cn } from '@/lib/utils'

function ThemeToggle({ compact = false }) {
  const { mode, resolved, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const t = useTranslations()

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onEsc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const OPTIONS = [
    { value: 'light', label: t.common.light, icon: Sun },
    { value: 'dark', label: t.common.dark, icon: Moon },
    { value: 'system', label: t.common.system, icon: Monitor },
  ]

  const CurrentIcon = resolved === 'dark' ? Moon : Sun

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title={t.common.theme}
      >
        <CurrentIcon className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-40 overflow-hidden rounded-md border bg-popover p-1 shadow-md">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon
            const active = mode === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-sm transition-colors',
                  active
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{opt.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ThemeToggle