import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

export function useContextMenu(items, deps = []) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef(null)

  const handleContextMenu = useCallback(
    (e) => {
      e.preventDefault()
      setPosition({ x: e.clientX, y: e.clientY })
      setIsOpen(true)
    },
    deps
  )

  const handleClickOutside = useCallback(
    (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    },
    deps
  )

  useEffect(() => {
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [handleClickOutside])

  const renderMenu = () => {
    if (!isOpen) return null

    return (
      <ContextMenu
        ref={menuRef}
        position={position}
        items={items}
        onClose={() => setIsOpen(false)}
      />
    )
  }

  return { isOpen, handleContextMenu, renderMenu, setIsOpen }
}

export function ContextMenu({ position, items, onClose, className, ...props }) {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const newPosition = { ...position }

      if (newPosition.x + rect.width > window.innerWidth) {
        newPosition.x = window.innerWidth - rect.width - 10
      }
      if (newPosition.y + rect.height > window.innerHeight) {
        newPosition.y = window.innerHeight - rect.height - 10
      }

      menuRef.current.style.left = `${newPosition.x}px`
      menuRef.current.style.top = `${newPosition.y}px`
    }
  }, [position])

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-50 min-w-[180px] rounded-md border bg-popover p-1 shadow-lg outline-none',
        className
      )}
      style={{ left: position.x, top: position.y, position: 'fixed' }}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {items.map((item, idx) => {
        if (item.divider) {
          return <div key={idx} className="my-1 border-t" />
        }
        const Icon = item.icon
        return (
          <button
            key={idx}
            onClick={() => {
              item.onClick?.()
              onClose()
            }}
            disabled={item.disabled}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
              item.disabled
                ? 'text-muted-foreground cursor-not-allowed'
                : 'hover:bg-accent hover:text-foreground',
              item.danger && 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400'
            )}
          >
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            {item.label}
            {item.shortcut && (
              <span className="ml-auto text-xs text-muted-foreground">{item.shortcut}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function FileContextMenu({ file, onOpen, onDelete, onRename, onProperties, onClose }) {
  const items = [
    {
      label: '打开',
      icon: null,
      onClick: () => onOpen?.(file),
    },
    { divider: true },
    {
      label: '重命名',
      icon: null,
      onClick: () => onRename?.(file),
    },
    {
      label: '属性',
      icon: null,
      onClick: () => onProperties?.(file),
    },
    { divider: true },
    {
      label: '删除',
      icon: null,
      danger: true,
      onClick: () => onDelete?.(file),
    },
  ]

  return <ContextMenu position={{ x: 0, y: 0 }} items={items} onClose={onClose} />
}
