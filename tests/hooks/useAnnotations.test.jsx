import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnnotations } from '@/hooks/useAnnotations.jsx'

beforeEach(() => {
  localStorage.clear()
})

describe('useAnnotations - 增删查', () => {
  it('初始无批注', () => {
    const { result } = renderHook(() => useAnnotations('fileA'))
    expect(result.current.hasAnnotations()).toBe(false)
    expect(result.current.getPageAnnotations(1)).toEqual([])
  })

  it('addAnnotation 添加批注并返回 id', () => {
    const { result } = renderHook(() => useAnnotations('fileA'))
    let id
    act(() => {
      id = result.current.addAnnotation(1, { type: 'highlight', x: 10, y: 20, color: '#ff0' })
    })
    expect(id).toBeTypeOf('string')
    const list = result.current.getPageAnnotations(1)
    expect(list).toHaveLength(1)
    expect(list[0].type).toBe('highlight')
    expect(list[0].id).toBe(id)
  })

  it('不同页码的批注互不影响', () => {
    const { result } = renderHook(() => useAnnotations('fileA'))
    act(() => {
      result.current.addAnnotation(1, { type: 'highlight', x: 0, y: 0 })
      result.current.addAnnotation(2, { type: 'note', x: 10, y: 10, text: 'hi' })
    })
    expect(result.current.getPageAnnotations(1)).toHaveLength(1)
    expect(result.current.getPageAnnotations(2)).toHaveLength(1)
    expect(result.current.getPageAnnotations(3)).toEqual([])
    expect(result.current.hasAnnotations()).toBe(true)
  })

  it('deleteAnnotation 按 id 删除', () => {
    const { result } = renderHook(() => useAnnotations('fileA'))
    let id1, id2
    act(() => {
      id1 = result.current.addAnnotation(1, { type: 'highlight', x: 0, y: 0 })
      id2 = result.current.addAnnotation(1, { type: 'note', x: 10, y: 10 })
    })
    act(() => result.current.deleteAnnotation(1, id1))
    const list = result.current.getPageAnnotations(1)
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(id2)
  })

  it('clearPage 清空指定页', () => {
    const { result } = renderHook(() => useAnnotations('fileA'))
    act(() => {
      result.current.addAnnotation(1, { type: 'highlight', x: 0, y: 0 })
      result.current.addAnnotation(2, { type: 'note', x: 0, y: 0 })
    })
    act(() => result.current.clearPage(1))
    expect(result.current.getPageAnnotations(1)).toEqual([])
    expect(result.current.getPageAnnotations(2)).toHaveLength(1)
  })

  it('clearAll 清空所有页', () => {
    const { result } = renderHook(() => useAnnotations('fileA'))
    act(() => {
      result.current.addAnnotation(1, { type: 'highlight', x: 0, y: 0 })
      result.current.addAnnotation(2, { type: 'note', x: 0, y: 0 })
    })
    act(() => result.current.clearAll())
    expect(result.current.hasAnnotations()).toBe(false)
  })
})

describe('useAnnotations - getAllAnnotations', () => {
  it('导出扁平数组并附带 page 字段', () => {
    const { result } = renderHook(() => useAnnotations('fileA'))
    act(() => {
      result.current.addAnnotation(1, { type: 'highlight', x: 0, y: 0 })
      result.current.addAnnotation(1, { type: 'note', x: 1, y: 1 })
      result.current.addAnnotation(3, { type: 'text', x: 2, y: 2 })
    })
    const all = result.current.getAllAnnotations()
    expect(all).toHaveLength(3)
    expect(all.every((a) => typeof a.page === 'number')).toBe(true)
    expect(all.filter((a) => a.page === 1)).toHaveLength(2)
    expect(all.filter((a) => a.page === 3)).toHaveLength(1)
  })
})

describe('useAnnotations - 持久化', () => {
  it('批注写入 localStorage（以 fileKey 为维度）', () => {
    const { result } = renderHook(() => useAnnotations('fileA'))
    act(() => {
      result.current.addAnnotation(1, { type: 'highlight', x: 0, y: 0, color: '#ff0' })
    })
    const raw = localStorage.getItem('pdf-master:annotations:fileA')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw)
    expect(parsed[1]).toHaveLength(1)
    expect(parsed[1][0].color).toBe('#ff0')
  })

  it('切换 fileKey 时加载对应批注', () => {
    // 先用 fileA 写入
    const { result: r1, rerender: rerender1 } = renderHook(
      ({ fk }) => useAnnotations(fk),
      { initialProps: { fk: 'fileA' } }
    )
    act(() => {
      r1.current.addAnnotation(1, { type: 'highlight', x: 0, y: 0 })
    })

    // 切换到 fileB，应无批注
    rerender1({ fk: 'fileB' })
    expect(r1.current.hasAnnotations()).toBe(false)

    // 切回 fileA，应恢复批注
    rerender1({ fk: 'fileA' })
    expect(r1.current.getPageAnnotations(1)).toHaveLength(1)
  })

  it('空批注时从 localStorage 移除 key，避免堆积', () => {
    const { result } = renderHook(() => useAnnotations('fileA'))
    act(() => {
      result.current.addAnnotation(1, { type: 'highlight', x: 0, y: 0 })
    })
    expect(localStorage.getItem('pdf-master:annotations:fileA')).not.toBeNull()
    act(() => result.current.clearAll())
    expect(localStorage.getItem('pdf-master:annotations:fileA')).toBeNull()
  })

  it('无 fileKey 时不读写 localStorage', () => {
    const { result } = renderHook(() => useAnnotations(''))
    act(() => {
      result.current.addAnnotation(1, { type: 'highlight', x: 0, y: 0 })
    })
    // 无 fileKey 时不应写入任何 key
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith('pdf-master:annotations:')
    )
    expect(keys).toHaveLength(0)
  })
})
