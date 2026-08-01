import { describe, it, expect, beforeEach } from 'vitest'
import {
  addHistory,
  getHistory,
  getSortedHistory,
  clearHistory,
  removeFromHistory,
  togglePin,
  formatDate,
  formatSize,
} from '@/utils/history.js'

beforeEach(() => {
  localStorage.clear()
})

describe('history - 基础增删查', () => {
  it('addHistory 写入后可被 getHistory 读出', () => {
    addHistory({ path: '/a.pdf', name: 'a.pdf', size: 1024 })
    const list = getHistory()
    expect(list).toHaveLength(1)
    expect(list[0].path).toBe('/a.pdf')
    // data 字段不应持久化
    expect(list[0].data).toBeUndefined()
    expect(list[0].accessedAt).toBeTypeOf('number')
  })

  it('新增的文件置顶（最新在前）', () => {
    addHistory({ path: '/a.pdf', name: 'a.pdf' })
    addHistory({ path: '/b.pdf', name: 'b.pdf' })
    const list = getHistory()
    expect(list[0].path).toBe('/b.pdf')
    expect(list[1].path).toBe('/a.pdf')
  })

  it('重复添加同路径文件会移到最前，不产生重复', () => {
    addHistory({ path: '/a.pdf', name: 'a.pdf' })
    addHistory({ path: '/b.pdf', name: 'b.pdf' })
    addHistory({ path: '/a.pdf', name: 'a.pdf' })
    const list = getHistory()
    expect(list).toHaveLength(2)
    expect(list[0].path).toBe('/a.pdf')
  })

  it('removeFromHistory 按 path 删除', () => {
    addHistory({ path: '/a.pdf', name: 'a.pdf' })
    addHistory({ path: '/b.pdf', name: 'b.pdf' })
    removeFromHistory('/a.pdf')
    const list = getHistory()
    expect(list).toHaveLength(1)
    expect(list[0].path).toBe('/b.pdf')
  })

  it('clearHistory 清空全部', () => {
    addHistory({ path: '/a.pdf', name: 'a.pdf' })
    clearHistory()
    expect(getHistory()).toEqual([])
  })
})

describe('history - 上限', () => {
  it('超过 20 条时丢弃最旧的', () => {
    for (let i = 0; i < 25; i++) {
      addHistory({ path: `/f${i}.pdf`, name: `f${i}.pdf` })
    }
    const list = getHistory()
    expect(list).toHaveLength(20)
    // 最新的 f24 在最前，最早的 f0~f4 被丢弃
    expect(list[0].path).toBe('/f24.pdf')
    expect(list.find((h) => h.path === '/f0.pdf')).toBeUndefined()
    expect(list.find((h) => h.path === '/f19.pdf')).toBeDefined()
  })
})

describe('history - 固定置顶 (pin)', () => {
  it('togglePin 切换固定状态，固定项在 getSortedHistory 中置顶', () => {
    addHistory({ path: '/a.pdf', name: 'a.pdf' })
    addHistory({ path: '/b.pdf', name: 'b.pdf' })
    addHistory({ path: '/c.pdf', name: 'c.pdf' })

    // 固定 a（当前在最末尾）
    togglePin('/a.pdf')

    const sorted = getSortedHistory()
    // a 被置顶，其余按访问时间倒序
    expect(sorted[0].path).toBe('/a.pdf')
    expect(sorted[0].pinned).toBe(true)
    expect(sorted[1].path).toBe('/c.pdf')
    expect(sorted[2].path).toBe('/b.pdf')
  })

  it('再次 togglePin 取消固定，回到按访问时间排序', () => {
    addHistory({ path: '/a.pdf', name: 'a.pdf' })
    addHistory({ path: '/b.pdf', name: 'b.pdf' })
    togglePin('/a.pdf')
    togglePin('/a.pdf') // 取消

    const sorted = getSortedHistory()
    expect(sorted[0].path).toBe('/b.pdf')
    expect(sorted.find((h) => h.path === '/a.pdf').pinned).toBe(false)
  })

  it('重新添加已固定文件时保留 pin 状态', () => {
    addHistory({ path: '/a.pdf', name: 'a.pdf' })
    togglePin('/a.pdf')
    // 再次添加同路径文件
    addHistory({ path: '/a.pdf', name: 'a.pdf', size: 999 })

    const sorted = getSortedHistory()
    expect(sorted[0].path).toBe('/a.pdf')
    expect(sorted[0].pinned).toBe(true)
  })

  it('togglePin 不存在的路径不影响列表', () => {
    addHistory({ path: '/a.pdf', name: 'a.pdf' })
    const sorted = togglePin('/not-exist.pdf')
    expect(sorted).toHaveLength(1)
  })
})

describe('history - formatSize', () => {
  it('字节级显示 B', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1023)).toBe('1023 B')
  })

  it('KB 级保留 1 位小数', () => {
    expect(formatSize(1024)).toBe('1.0 KB')
    expect(formatSize(2048)).toBe('2.0 KB')
    expect(formatSize(1536)).toBe('1.5 KB')
  })

  it('MB 级保留 2 位小数', () => {
    expect(formatSize(1024 * 1024)).toBe('1.00 MB')
    expect(formatSize(1024 * 1024 * 1.5)).toBe('1.50 MB')
  })
})

describe('history - formatDate', () => {
  it('1 分钟内显示「刚刚」', () => {
    expect(formatDate(Date.now())).toBe('刚刚')
    expect(formatDate(Date.now() - 30000)).toBe('刚刚')
  })

  it('1 小时内显示分钟', () => {
    expect(formatDate(Date.now() - 5 * 60000)).toBe('5 分钟前')
  })

  it('1 天内显示小时', () => {
    expect(formatDate(Date.now() - 3 * 3600000)).toBe('3 小时前')
  })

  it('7 天内显示天', () => {
    expect(formatDate(Date.now() - 2 * 86400000)).toBe('2 天前')
  })
})

describe('history - 异常容错', () => {
  it('getHistory 在 localStorage 无数据时返回空数组', () => {
    expect(getHistory()).toEqual([])
  })

  it('getHistory 在数据损坏时返回空数组', () => {
    localStorage.setItem('pdf_master_history', '{invalid json')
    expect(getHistory()).toEqual([])
  })
})
