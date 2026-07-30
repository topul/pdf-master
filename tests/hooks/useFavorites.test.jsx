import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFavorites } from '@/hooks/useFavorites.jsx'

beforeEach(() => {
  localStorage.clear()
})

const tool = (id) => ({ id, name: `tool.${id}`, path: `/${id}` })

describe('useFavorites - 增删切换', () => {
  it('初始为空', () => {
    const { result } = renderHook(() => useFavorites({}))
    expect(result.current.favorites).toEqual([])
    expect(result.current.MAX_FAVORITES).toBe(12)
  })

  it('addFavorite 加入收藏', () => {
    const { result } = renderHook(() => useFavorites({}))
    act(() => result.current.addFavorite(tool('merge')))
    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.favorites[0].id).toBe('merge')
    expect(result.current.favorites[0].addedAt).toBeTypeOf('number')
  })

  it('重复添加同 id 不产生重复', () => {
    const { result } = renderHook(() => useFavorites({}))
    act(() => result.current.addFavorite(tool('merge')))
    act(() => result.current.addFavorite(tool('merge')))
    expect(result.current.favorites).toHaveLength(1)
  })

  it('removeFavorite 按 id 移除', () => {
    const { result } = renderHook(() => useFavorites({}))
    act(() => result.current.addFavorite(tool('merge')))
    act(() => result.current.addFavorite(tool('split')))
    act(() => result.current.removeFavorite('merge'))
    expect(result.current.favorites).toHaveLength(1)
    expect(result.current.favorites[0].id).toBe('split')
  })

  it('toggleFavorite 切换收藏状态', () => {
    const { result } = renderHook(() => useFavorites({}))
    act(() => result.current.toggleFavorite(tool('merge')))
    expect(result.current.isFavorited('merge')).toBe(true)
    act(() => result.current.toggleFavorite(tool('merge')))
    expect(result.current.isFavorited('merge')).toBe(false)
  })

  it('isFavorited 返回正确布尔值', () => {
    const { result } = renderHook(() => useFavorites({}))
    expect(result.current.isFavorited('merge')).toBe(false)
    act(() => result.current.addFavorite(tool('merge')))
    expect(result.current.isFavorited('merge')).toBe(true)
    expect(result.current.isFavorited('split')).toBe(false)
  })
})

describe('useFavorites - 上限', () => {
  it('超过 12 个时保留最新 12 个', () => {
    const { result } = renderHook(() => useFavorites({}))
    act(() => {
      for (let i = 0; i < 15; i++) {
        result.current.addFavorite(tool(`t${i}`))
      }
    })
    expect(result.current.favorites).toHaveLength(12)
    // 最新的在前，t14 应存在，t0~t2 被丢弃
    expect(result.current.favorites[0].id).toBe('t14')
    expect(result.current.isFavorited('t14')).toBe(true)
    expect(result.current.isFavorited('t0')).toBe(false)
  })
})

describe('useFavorites - 持久化与跨组件同步', () => {
  it('收藏数据写入 localStorage', () => {
    const { result } = renderHook(() => useFavorites({}))
    act(() => result.current.addFavorite(tool('merge')))
    const raw = JSON.parse(localStorage.getItem('pdf-master-favorites'))
    expect(raw).toHaveLength(1)
    expect(raw[0].id).toBe('merge')
  })

  it('新实例初始化时从 localStorage 恢复', () => {
    const { result: r1 } = renderHook(() => useFavorites({}))
    act(() => r1.current.addFavorite(tool('merge')))

    const { result: r2 } = renderHook(() => useFavorites({}))
    expect(r2.current.favorites).toHaveLength(1)
    expect(r2.current.favorites[0].id).toBe('merge')
  })

  it('favorites:updated 事件触发后其它实例同步', () => {
    const { result: r1 } = renderHook(() => useFavorites({}))
    const { result: r2 } = renderHook(() => useFavorites({}))

    act(() => r1.current.addFavorite(tool('merge')))
    // r2 应通过事件同步
    expect(r2.current.favorites).toHaveLength(1)
    expect(r2.current.favorites[0].id).toBe('merge')
  })
})

describe('useFavorites - 名称解析', () => {
  it('favoritesWithNames 解析翻译 key', () => {
    const t = { tool: { merge: '合并 PDF' } }
    const { result } = renderHook(() => useFavorites(t))
    act(() => result.current.addFavorite({ id: 'merge', name: 'tool.merge', path: '/merge' }))
    expect(result.current.favoritesWithNames[0].displayName).toBe('合并 PDF')
  })

  it('翻译缺失时回退到 id', () => {
    const { result } = renderHook(() => useFavorites({}))
    act(() => result.current.addFavorite({ id: 'merge', name: 'tool.missing', path: '/merge' }))
    expect(result.current.favoritesWithNames[0].displayName).toBe('merge')
  })
})
