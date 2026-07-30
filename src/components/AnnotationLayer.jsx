import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ANNOT_TYPES } from '@/hooks/useAnnotations'
import { cn } from '@/lib/utils'

/**
 * AnnotationLayer - 批注绘制层
 * 叠加在 PdfViewer 每页 canvas 上，绘制已有批注 + 当前拖拽选区
 * 通过 pointer 事件捕获高亮/便签/文字操作
 *
 * 文字批注采用「页面内 inline 输入」：
 * - 选中文字工具后点击页面，在落点渲染一个临时 input
 * - 用户输入文字，按 Enter 确认添加 / Esc 取消
 * - 输入框自动聚焦，避免工具栏 input 失焦问题
 *
 * @param {number} pageNum - 当前页码
 * @param {number} width - 渲染宽度（px，含 scale）
 * @param {number} height - 渲染高度（px，含 scale）
 * @param {Array} annotations - 本页批注列表
 * @param {string} tool - 当前工具：'highlight' | 'text' | 'note' | 'hand'
 * @param {object} color - 当前颜色 { name, value }
 * @param {function} onAddAnnotation(pageNum, annot) - 添加批注回调
 * @param {function} onDeleteAnnotation(pageNum, id) - 删除批注回调
 * @param {boolean} active - 是否激活批注模式（false 时只读展示）
 */
export function AnnotationLayer({
  pageNum,
  width,
  height,
  annotations = [],
  tool,
  color,
  onAddAnnotation,
  onDeleteAnnotation,
  active = false,
}) {
  const canvasRef = useRef(null)
  const inputRef = useRef(null)
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)
  const [hoverAnnotId, setHoverAnnotId] = useState(null)
  // 文字批注的临时输入态：{ x, y, value } 存在时显示 inline input
  const [textDraft, setTextDraft] = useState(null)
  // 同步草稿到 ref，避免 onBlur 与 pointerdown 重复提交
  const textDraftRef = useRef(null)
  useEffect(() => {
    textDraftRef.current = textDraft
  }, [textDraft])

  // 绘制 overlay
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    // 同步物理像素
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    // 绘制已有批注
    for (const annot of annotations) {
      const isHover = hoverAnnotId === annot.id
      if (annot.type === ANNOT_TYPES.HIGHLIGHT) {
        ctx.fillStyle = annot.color.value + (isHover ? 'DD' : 'AA')
        ctx.fillRect(annot.x, annot.y, annot.width, annot.height)
        ctx.strokeStyle = annot.color.value
        ctx.lineWidth = isHover ? 2 : 1
        ctx.strokeRect(annot.x, annot.y, annot.width, annot.height)
      } else if (annot.type === ANNOT_TYPES.TEXT) {
        ctx.font = `${annot.fontSize || 16}px sans-serif`
        ctx.fillStyle = annot.color.value
        ctx.fillText(annot.text, annot.x, annot.y + (annot.fontSize || 16))
      } else if (annot.type === ANNOT_TYPES.NOTE) {
        ctx.fillStyle = annot.color.value + 'CC'
        ctx.fillRect(annot.x, annot.y, 24, 24)
        ctx.strokeStyle = isHover ? '#000' : 'rgba(0,0,0,0.5)'
        ctx.lineWidth = isHover ? 2 : 1
        ctx.strokeRect(annot.x, annot.y, 24, 24)
        ctx.fillStyle = '#000'
        ctx.font = 'bold 14px sans-serif'
        ctx.fillText('!', annot.x + 9, annot.y + 17)
      }
    }

    // 绘制当前拖拽选区
    if (dragStart && dragEnd) {
      const x = Math.min(dragStart.x, dragEnd.x)
      const y = Math.min(dragStart.y, dragEnd.y)
      const w = Math.abs(dragEnd.x - dragStart.x)
      const h = Math.abs(dragEnd.y - dragStart.y)
      ctx.fillStyle = color.value + 'AA'
      ctx.fillRect(x, y, w, h)
      ctx.strokeStyle = color.value
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, w, h)
    }
  }, [width, height, annotations, dragStart, dragEnd, color, hoverAnnotId])

  useEffect(() => {
    draw()
  }, [draw])

  // 文字草稿出现时自动聚焦
  useEffect(() => {
    if (textDraft && inputRef.current) {
      inputRef.current.focus()
    }
  }, [textDraft])

  // 切换工具或关闭批注模式时，取消未完成的文字草稿
  useEffect(() => {
    setTextDraft(null)
  }, [tool, active])

  // 坐标转换：客户端坐标 -> canvas 逻辑坐标
  const getPos = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  // 命中检测：点击是否落在已有批注上
  const hitTest = (pos) => {
    // 从后往前遍历（后绘制的在上层）
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i]
      if (a.type === ANNOT_TYPES.HIGHLIGHT) {
        if (
          pos.x >= a.x && pos.x <= a.x + a.width &&
          pos.y >= a.y && pos.y <= a.y + a.height
        ) return a
      } else if (a.type === ANNOT_TYPES.NOTE) {
        if (pos.x >= a.x && pos.x <= a.x + 24 && pos.y >= a.y && pos.y <= a.y + 24) return a
      } else if (a.type === ANNOT_TYPES.TEXT) {
        const fs = a.fontSize || 16
        if (pos.x >= a.x && pos.x <= a.x + a.text.length * fs * 0.6 && pos.y >= a.y && pos.y <= a.y + fs) return a
      }
    }
    return null
  }

  const handlePointerDown = (e) => {
    if (!active) return
    // 只响应左键
    if (e.button !== 0) return
    const pos = getPos(e)

    // 手型工具：点击批注可删除（配合 Alt 键）
    if (tool === 'hand' || e.altKey) {
      const hit = hitTest(pos)
      if (hit) {
        onDeleteAnnotation?.(pageNum, hit.id)
      }
      return
    }

    if (tool === ANNOT_TYPES.HIGHLIGHT) {
      setDragStart(pos)
      setDragEnd(pos)
    } else if (tool === ANNOT_TYPES.NOTE) {
      onAddAnnotation?.(pageNum, {
        type: ANNOT_TYPES.NOTE,
        x: pos.x,
        y: pos.y,
        color,
      })
    } else if (tool === ANNOT_TYPES.TEXT) {
      // 点击页面：在该位置开启 inline 输入，而非立即添加
      // 已有草稿时先确认上一个（若非空）
      if (textDraft && textDraft.value.trim()) {
        commitTextDraft()
      }
      setTextDraft({ x: pos.x, y: pos.y, value: '' })
    }
  }

  const handlePointerMove = (e) => {
    if (!active) return
    const pos = getPos(e)

    // 高亮拖拽中
    if (tool === ANNOT_TYPES.HIGHLIGHT && dragStart) {
      setDragEnd(pos)
      return
    }

    // 手型工具悬停检测，显示可删除态
    if (tool === 'hand') {
      const hit = hitTest(pos)
      setHoverAnnotId(hit ? hit.id : null)
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hit ? 'pointer' : 'default'
      }
    }
  }

  const handlePointerUp = (e) => {
    if (!active) return
    if (tool === ANNOT_TYPES.HIGHLIGHT && dragStart) {
      const end = getPos(e)
      const x = Math.min(dragStart.x, end.x)
      const y = Math.min(dragStart.y, end.y)
      const w = Math.abs(end.x - dragStart.x)
      const h = Math.abs(end.y - dragStart.y)
      if (w > 3 && h > 3) {
        onAddAnnotation?.(pageNum, {
          type: ANNOT_TYPES.HIGHLIGHT,
          x, y, width: w, height: h,
          color,
        })
      }
      setDragStart(null)
      setDragEnd(null)
    }
  }

  const handlePointerLeave = () => {
    if (dragStart) {
      setDragStart(null)
      setDragEnd(null)
    }
    setHoverAnnotId(null)
  }

  // 提交文字草稿为批注
  const commitTextDraft = () => {
    // 读 ref 拿最新草稿，并立即清空，防止 onBlur/pointerdown 重复提交
    const draft = textDraftRef.current
    if (!draft) return
    textDraftRef.current = null
    setTextDraft(null)
    const value = draft.value.trim()
    if (value) {
      onAddAnnotation?.(pageNum, {
        type: ANNOT_TYPES.TEXT,
        x: draft.x,
        y: draft.y,
        text: value,
        fontSize: 16,
        color,
      })
    }
  }

  const handleTextKeyDown = (e) => {
    // 阻止事件冒泡到全局快捷键监听
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      commitTextDraft()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setTextDraft(null)
    }
  }

  // 光标样式
  const cursorStyle = !active
    ? 'default'
    : tool === ANNOT_TYPES.HIGHLIGHT
    ? 'crosshair'
    : tool === ANNOT_TYPES.TEXT || tool === ANNOT_TYPES.NOTE
    ? 'text'
    : 'default'

  return (
    <>
      <canvas
        ref={canvasRef}
        className={cn('absolute inset-0 z-10', active && 'pointer-events-auto')}
        style={{ cursor: cursorStyle, width, height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
      {/* 文字批注的页面内 inline 输入框 */}
      {textDraft && (
        <input
          ref={inputRef}
          type="text"
          value={textDraft.value}
          onChange={(e) => setTextDraft((d) => ({ ...d, value: e.target.value }))}
          onKeyDown={handleTextKeyDown}
          onBlur={commitTextDraft}
          placeholder="输入文字 (Enter 确认)"
          className="absolute z-20 min-w-[120px] rounded border bg-white px-1 py-0.5 text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
          style={{
            left: textDraft.x,
            top: textDraft.y,
            color: color.value,
            fontSize: '16px',
          }}
        />
      )}
    </>
  )
}

export default AnnotationLayer
