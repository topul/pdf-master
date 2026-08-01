import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut.jsx'
import { useTranslations } from '@/hooks/useLocale.jsx'

/**
 * ShortcutHelpDialog - 快捷键帮助面板
 * 按 ? 键唤起，Esc 关闭
 */
const SHORTCUT_GROUPS = [
  {
    titleKey: 'shortcutGlobal',
    defaultTitle: '全局',
    items: [
      { keys: ['Ctrl', 'K'], labelKey: 'scSearch', def: '搜索功能' },
      { keys: ['Ctrl', 'B'], labelKey: 'scSidebar', def: '收起/展开侧边栏' },
      { keys: ['Ctrl', ','], labelKey: 'scSettings', def: '打开设置' },
      { keys: ['Ctrl', 'O'], labelKey: 'scOpenFile', def: '打开 PDF 文件' },
      { keys: ['?'], labelKey: 'scHelp', def: '显示快捷键面板' },
    ],
  },
  {
    titleKey: 'shortcutReader',
    defaultTitle: '阅读器',
    items: [
      { keys: ['Home'], labelKey: 'scFirstPage', def: '跳转首页' },
      { keys: ['End'], labelKey: 'scLastPage', def: '跳转末页' },
      { keys: ['+'], labelKey: 'scZoomIn', def: '放大' },
      { keys: ['-'], labelKey: 'scZoomOut', def: '缩小' },
      { keys: ['0'], labelKey: 'scZoomReset', def: '重置缩放' },
    ],
  },
]

export function ShortcutHelpDialog({ open, onClose }) {
  const t = useTranslations()

  // Esc 关闭
  useKeyboardShortcut('escape', onClose, [open], true)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-4 text-lg font-semibold">
          {t.common?.shortcutHelp || '键盘快捷键'}
        </h2>

        <div className="space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.titleKey}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.common?.[group.titleKey] || group.defaultTitle}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded px-2 py-1 hover:bg-accent/50"
                  >
                    <span className="text-sm text-foreground">
                      {t.common?.[item.labelKey] || item.def}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <kbd
                          key={i}
                          className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {t.common?.shortcutHint || '在输入框内时部分快捷键会失效'}
        </p>
      </div>
    </div>
  )
}

export default ShortcutHelpDialog
