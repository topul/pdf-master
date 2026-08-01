import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRecentTools } from '@/hooks/useRecentTools.jsx'

beforeEach(() => {
  localStorage.clear()
})

const tool = (id) => ({ id, name: `tool.${id}`, path: `/${id}` })

describe('useRecentTools - 记录使用', () => {
  it('初始为空', () => {
    const { result } = renderHook(() => useRecentTools())
    expect(result.current.recent).toEqual([])
    expect(result.current.MAX_RECENT).toBe(5)
  })

  it('recordUsage 记录工具，最新在前', () => {
    const { result } = renderHook(() => useRecentTools())
    act(() => result.current.recordUsage(tool('merge')))
    act(() => result.current.recordUsage(tool('split')))
    expect(result.current.recent).toHaveLength(2)
    expect(result.current.recent[0].id).toBe('split')
    expect(result.current.recent[1].id).toBe('merge')
    expect(result.current.recent[0].lastUsedAt).toBeTypeOf('number')
  })

  it('重复使用同工具会移到最前，不产生重复', () => {
    const { result } = renderHook(() => useRecentTools())
    act(() => result.current.recordUsage(tool('merge')))
    act(() => result.current.recordUsage(tool('split')))
    act(() => result.current.recordUsage(tool('merge')))
    expect(result.current.recent).toHaveLength(2)
    expect(result.current.recent[0].id).toBe('merge')
  })
})

describe('useRecentTools - 上限', () => {
  it('超过 5 个时保留最新 5 个', () => {
    const { result } = renderHook(() => useRecentTools())
    act(() => {
      for (let i = 0; i < 8; i++) {
        result.current.recordUsage(tool(`t${i}`))
      }
    })
    expect(result.current.recent).toHaveLength(5)
    expect(result.current.recent[0].id).toBe('t7')
    // t0~t2 被丢弃
    expect(result.current.recent.find((r) => r.id === 't0')).toBeUndefined()
    expect(result.current.recent.find((r) => r.id === 't4')).toBeDefined()
  })
})

describe('useRecentTools - 清空与持久化', () => {
  it('clearRecent 清空列表', () => {
    const { result } = renderHook(() => useRecentTools())
    act(() => result.current.recordUsage(tool('merge')))
    act(() => result.current.clearRecent())
    expect(result.current.recent).toEqual([])
  })

  it('数据写入 localStorage 并可恢复', () => {
    const { result: r1 } = renderHook(() => useRecentTools())
    act(() => r1.current.recordUsage(tool('merge')))

    const raw = JSON.parse(localStorage.getItem('pdf-master-recent-tools'))
    expect(raw).toHaveLength(1)
    expect(raw[0].id).toBe('merge')

    const { result: r2 } = renderHook(() => useRecentTools())
    expect(r2.current.recent).toHaveLength(1)
    expect(r2.current.recent[0].id).toBe('merge')
  })

  it('recent-tools:updated 事件跨实例同步', () => {
    const { result: r1 } = renderHook(() => useRecentTools())
    const { result: r2 } = renderHook(() => useRecentTools())
    act(() => r1.current.recordUsage(tool('merge')))
    expect(r2.current.recent).toHaveLength(1)
    expect(r2.current.recent[0].id).toBe('merge')
  })
})
