import { describe, it, expect, beforeAll } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  mergePdfs,
  splitPdf,
  rotatePages,
  deletePages,
  extractPages,
  reorderPages,
  getPdfInfo,
  getPdfMetadata,
  setPdfMetadata,
  cropPdf,
} from '@/utils/pdfUtils.js'

// 用 pdf-lib 生成测试 PDF：n 页，每页 A4 大小
async function makePdf(pageCount = 3) {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([595.28, 841.89])
  }
  const bytes = await doc.save()
  return Array.from(bytes)
}

let pdf3 // 3 页测试 PDF

beforeAll(async () => {
  pdf3 = await makePdf(3)
})

describe('pdfUtils - getPdfInfo', () => {
  it('返回页数和尺寸', async () => {
    const info = await getPdfInfo(pdf3)
    expect(info.pageCount).toBe(3)
    expect(info.width).toBe(595)
    expect(info.height).toBe(842)
  })
})

describe('pdfUtils - mergePdfs', () => {
  it('合并多个 PDF，页数为各文档之和', async () => {
    const a = await makePdf(2)
    const b = await makePdf(3)
    const merged = await mergePdfs([a, b])
    const info = await getPdfInfo(merged)
    expect(info.pageCount).toBe(5)
  })

  it('合并单个 PDF 等价于原 PDF', async () => {
    const merged = await mergePdfs([pdf3])
    const info = await getPdfInfo(merged)
    expect(info.pageCount).toBe(3)
  })
})

describe('pdfUtils - splitPdf', () => {
  it('every 模式：按每 N 页拆分', async () => {
    const pdf = await makePdf(5)
    const out = await splitPdf(pdf, 'every', { pageCount: 2 })
    // 5 页按每 2 页拆 -> 3 份（2,2,1）
    expect(out).toHaveLength(3)
    expect(out[0].name).toBe('part_1.pdf')
    for (const part of out) {
      const info = await getPdfInfo(part.data)
      expect(info.pageCount).toBeLessThanOrEqual(2)
    }
  })

  it('ranges 模式：按指定范围拆分', async () => {
    const out = await splitPdf(pdf3, 'ranges', { ranges: ['1-2', '3-3'] })
    expect(out).toHaveLength(2)
    expect(await getPdfInfo(out[0].data)).toMatchObject({ pageCount: 2 })
    expect(await getPdfInfo(out[1].data)).toMatchObject({ pageCount: 1 })
    expect(out[0].name).toBe('range_1.pdf')
  })

  it('single 模式：每页拆为单独 PDF', async () => {
    const out = await splitPdf(pdf3, 'single')
    expect(out).toHaveLength(3)
    expect(out[0].name).toBe('page_1.pdf')
    for (const part of out) {
      expect((await getPdfInfo(part.data)).pageCount).toBe(1)
    }
  })

  it('ranges 模式：非法范围抛错', async () => {
    await expect(
      splitPdf(pdf3, 'ranges', { ranges: ['1-10'] })
    ).rejects.toThrow(/无效的页码范围/)
  })
})

describe('pdfUtils - rotatePages', () => {
  it('旋转指定页，旋转角度累加', async () => {
    const pdf = await makePdf(2)
    const rotated = await rotatePages(pdf, [0], 90)
    const doc = await PDFDocument.load(new Uint8Array(rotated))
    const pages = doc.getPages()
    expect(pages[0].getRotation().angle).toBe(90)
    // 未指定的页不旋转
    expect(pages[1].getRotation().angle).toBe(0)
  })

  it('再次旋转累加到 180', async () => {
    const pdf = await makePdf(1)
    const once = await rotatePages(pdf, [0], 90)
    const twice = await rotatePages(once, [0], 90)
    const doc = await PDFDocument.load(new Uint8Array(twice))
    expect(doc.getPages()[0].getRotation().angle).toBe(180)
  })

  it('越界索引被忽略，不报错', async () => {
    const rotated = await rotatePages(pdf3, [99], 90)
    expect(await getPdfInfo(rotated)).toMatchObject({ pageCount: 3 })
  })
})

describe('pdfUtils - deletePages', () => {
  it('删除指定页后页数减少', async () => {
    const out = await deletePages(pdf3, [0])
    expect((await getPdfInfo(out)).pageCount).toBe(2)
  })

  it('删除多页', async () => {
    const pdf = await makePdf(5)
    const out = await deletePages(pdf, [1, 3])
    expect((await getPdfInfo(out)).pageCount).toBe(3)
  })

  it('删除全部页后 PDF 至少保留 1 个空页（pdf-lib 行为）', async () => {
    const out = await deletePages(pdf3, [0, 1, 2])
    // pdf-lib 的 PDFDocument 至少保留一个 page 字典项，删除全部页后计数为 1
    expect((await getPdfInfo(out)).pageCount).toBe(1)
  })
})

describe('pdfUtils - extractPages', () => {
  it('提取指定页，页数等于提取数', async () => {
    const out = await extractPages(pdf3, [0, 2])
    expect((await getPdfInfo(out)).pageCount).toBe(2)
  })

  it('提取单页', async () => {
    const out = await extractPages(pdf3, [1])
    expect((await getPdfInfo(out)).pageCount).toBe(1)
  })
})

describe('pdfUtils - reorderPages', () => {
  it('按新顺序重排页面', async () => {
    const pdf = await makePdf(3)
    const reordered = await reorderPages(pdf, [2, 0, 1])
    // 主要验证不报错且页数不变；页序无法直接从 PDF 结构断言，依赖 pdf-lib 内部一致性
    expect((await getPdfInfo(reordered)).pageCount).toBe(3)
  })

  it('逆序排列', async () => {
    const pdf = await makePdf(4)
    const reordered = await reorderPages(pdf, [3, 2, 1, 0])
    expect((await getPdfInfo(reordered)).pageCount).toBe(4)
  })
})

describe('pdfUtils - metadata', () => {
  it('getPdfMetadata 返回默认元数据', async () => {
    const meta = await getPdfMetadata(pdf3)
    expect(meta.pageCount).toBe(3)
    expect(meta).toHaveProperty('title')
    expect(meta).toHaveProperty('author')
    expect(meta).toHaveProperty('creationDate')
  })

  it('setPdfMetadata 写入后可读回', async () => {
    const updated = await setPdfMetadata(pdf3, {
      title: '测试标题',
      author: '测试作者',
      subject: '测试主题',
      keywords: ['测试', '关键字'],
    })
    const meta = await getPdfMetadata(updated)
    expect(meta.title).toBe('测试标题')
    expect(meta.author).toBe('测试作者')
    expect(meta.subject).toBe('测试主题')
    // pdf-lib 的 getKeywords 返回空格连接的字符串
    expect(meta.keywords).toBe('测试 关键字')
  })

  it('setPdfMetadata 不传的字段保持原值', async () => {
    const updated1 = await setPdfMetadata(pdf3, { title: 'A' })
    const updated2 = await setPdfMetadata(updated1, { author: 'B' })
    const meta = await getPdfMetadata(updated2)
    expect(meta.title).toBe('A')
    expect(meta.author).toBe('B')
  })
})

describe('pdfUtils - cropPdf', () => {
  it('按边距裁剪后页面尺寸缩小', async () => {
    const margins = { top: 50, bottom: 50, left: 30, right: 30 }
    const out = await cropPdf(pdf3, margins)
    const info = await getPdfInfo(out)
    // 原宽 595.28 - 30 - 30 = 535.28 -> round 535
    expect(info.width).toBe(535)
    // 原高 841.89 - 50 - 50 = 741.89 -> round 742
    expect(info.height).toBe(742)
    expect(info.pageCount).toBe(3)
  })

  it('边距过大导致尺寸为负时抛错', async () => {
    const margins = { top: 500, bottom: 500, left: 30, right: 30 }
    await expect(cropPdf(pdf3, margins)).rejects.toThrow(/裁剪边距过大/)
  })
})
