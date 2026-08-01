import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCurrentFile, setCurrentFile, getCurrentFile, clearCurrentFile } from '@/hooks/useCurrentFile.jsx'

beforeEach(() => {
  clearCurrentFile()
})

const file = (name) => ({ path: `/${name}`, name, data: [1, 2, 3], size: 3 })

describe('useCurrentFile - 模块级 API', () => {
  it('setCurrentFile/getCurrentFile 读写上下文', () => {
    expect(getCurrentFile()).toBeNull()
    setCurrentFile(file('a.pdf'))
    expect(getCurrentFile()).toEqual(file('a.pdf'))
  })

  it('clearCurrentFile 清除上下文', () => {
    setCurrentFile(file('a.pdf'))
    clearCurrentFile()
    expect(getCurrentFile()).toBeNull()
  })
})

describe('useCurrentFile - hook 订阅', () => {
  it('hook 读取当前已设置的文件', () => {
    setCurrentFile(file('a.pdf'))
    const { result } = renderHook(() => useCurrentFile(false))
    expect(result.current.currentFile).toEqual(file('a.pdf'))
  })

  it('setCurrentFile 后订阅者收到更新', () => {
    const { result } = renderHook(() => useCurrentFile(false))
    expect(result.current.currentFile).toBeNull()
    act(() => setCurrentFile(file('a.pdf')))
    expect(result.current.currentFile).toEqual(file('a.pdf'))
  })

  it('clearCurrentFile 后订阅者收到 null', () => {
    setCurrentFile(file('a.pdf'))
    const { result } = renderHook(() => useCurrentFile(false))
    act(() => clearCurrentFile())
    expect(result.current.currentFile).toBeNull()
  })

  it('consume 读取并清除', () => {
    setCurrentFile(file('a.pdf'))
    const { result } = renderHook(() => useCurrentFile(false))
    let consumed
    act(() => {
      consumed = result.current.consume()
    })
    expect(consumed).toEqual(file('a.pdf'))
    expect(getCurrentFile()).toBeNull()
  })
})

describe('useCurrentFile - autoConsume', () => {
  it('autoConsume=true（默认）首次读取后自动清除上下文', () => {
    setCurrentFile(file('a.pdf'))
    renderHook(() => useCurrentFile())
    // mount 后上下文应被清除，避免重复加载
    expect(getCurrentFile()).toBeNull()
  })

  it('autoConsume=false 保留上下文', () => {
    setCurrentFile(file('a.pdf'))
    renderHook(() => useCurrentFile(false))
    expect(getCurrentFile()).toEqual(file('a.pdf'))
  })
})
