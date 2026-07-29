import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ANNOT_TYPES } from '@/hooks/useAnnotations'
import { cn } from '@/lib/utils'

/**
 * AnnotationLayer - 批注绘制层
 * 叠加在 PdfViewer 每页 canvas 上，绘制已有批注 + 当前拖拽选区
 * 通过 pointer 事件捕获高亮/便签/文字操作
 *
 * @param {number} pageNum - 当前页码
 * @param {number} width - 渲染宽度（px，含 scale）
 * @param {number} height - 渲染高度（px，含 scale）
 * @param {Array} annotations - 本页批注列表
 * @param {string} tool - 当前工具：'highlight' | 'text' | 'note' | 'hand'
 * @param {object} color - 当前颜色 { name, value }
 * @param {string} textInput - 文字工具输入内容
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
  textInput,
  onAddAnnotation,
  onDeleteAnnotation,
  active = false,
}) {
  const canvasRef = useRef(null)
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)
  const [hoverAnnotId, setHoverAnnotId] = useState(null)

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
      if (!textInput || !textInput.trim()) return
      onAddAnnotation?.(pageNum, {
        type: ANNOT_TYPES.TEXT,
        x: pos.x,
        y: pos.y,
        text: textInput,
        fontSize: 16,
        color,
      })
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

  // 光标样式
  const cursorStyle = !active
    ? 'default'
    : tool === ANNOT_TYPES.HIGHLIGHT
    ? 'crosshair'
    : tool === ANNOT_TYPES.TEXT || tool === ANNOT_TYPES.NOTE
    ? 'text'
    : 'default'

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 z-10', active && 'pointer-events-auto')}
      style={{ cursor: cursorStyle, width, height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    />
  )
}

export default AnnotationLayer
