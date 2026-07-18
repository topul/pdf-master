import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'

export async function loadPdf(fileData) {
  const uint8Array = new Uint8Array(fileData)
  const pdfDoc = await PDFDocument.load(uint8Array)
  return pdfDoc
}

export async function mergePdfs(fileDataList) {
  const mergedPdf = await PDFDocument.create()

  for (const fileData of fileDataList) {
    const pdfDoc = await loadPdf(fileData)
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
    copiedPages.forEach((page) => {
      mergedPdf.addPage(page)
    })
  }

  const mergedPdfBytes = await mergedPdf.save()
  return Array.from(mergedPdfBytes)
}

export async function splitPdf(fileData, splitMode, options = {}) {
  const pdfDoc = await loadPdf(fileData)
  const totalPages = pdfDoc.getPageCount()
  const outputs = []

  if (splitMode === 'every') {
    const pageCount = options.pageCount || 1
    for (let i = 0; i < totalPages; i += pageCount) {
      const newPdf = await PDFDocument.create()
      const end = Math.min(i + pageCount, totalPages)
      const indices = []
      for (let j = i; j < end; j++) {
        indices.push(j)
      }
      const copiedPages = await newPdf.copyPages(pdfDoc, indices)
      copiedPages.forEach((page) => newPdf.addPage(page))
      const bytes = await newPdf.save()
      outputs.push({
        name: `part_${Math.floor(i / pageCount) + 1}.pdf`,
        data: Array.from(bytes),
      })
    }
  } else if (splitMode === 'ranges') {
    const ranges = options.ranges || []
    for (let idx = 0; idx < ranges.length; idx++) {
      const range = ranges[idx]
      const [start, end] = range.split('-').map((s) => parseInt(s.trim(), 10))
      if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
        throw new Error(`无效的页码范围: ${range}`)
      }
      const newPdf = await PDFDocument.create()
      const indices = []
      for (let j = start - 1; j < end; j++) {
        indices.push(j)
      }
      const copiedPages = await newPdf.copyPages(pdfDoc, indices)
      copiedPages.forEach((page) => newPdf.addPage(page))
      const bytes = await newPdf.save()
      outputs.push({
        name: `range_${idx + 1}.pdf`,
        data: Array.from(bytes),
      })
    }
  } else if (splitMode === 'single') {
    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFDocument.create()
      const copiedPages = await newPdf.copyPages(pdfDoc, [i])
      copiedPages.forEach((page) => newPdf.addPage(page))
      const bytes = await newPdf.save()
      outputs.push({
        name: `page_${i + 1}.pdf`,
        data: Array.from(bytes),
      })
    }
  }

  return outputs
}

export async function rotatePages(fileData, pageIndices, degrees) {
  const pdfDoc = await loadPdf(fileData)

  const pages = pdfDoc.getPages()
  for (const idx of pageIndices) {
    if (idx >= 0 && idx < pages.length) {
      const page = pages[idx]
      const currentRotation = page.getRotation().angle
      page.setRotation((currentRotation + degrees) % 360)
    }
  }

  const bytes = await pdfDoc.save()
  return Array.from(bytes)
}

export async function deletePages(fileData, pageIndicesToDelete) {
  const pdfDoc = await loadPdf(fileData)
  const totalPages = pdfDoc.getPageCount()

  const indicesToKeep = []
  const sortedToDelete = [...pageIndicesToDelete].sort((a, b) => a - b)
  let deleteIdx = 0

  for (let i = 0; i < totalPages; i++) {
    if (deleteIdx < sortedToDelete.length && i === sortedToDelete[deleteIdx]) {
      deleteIdx++
    } else {
      indicesToKeep.push(i)
    }
  }

  const newPdf = await PDFDocument.create()
  const copiedPages = await newPdf.copyPages(pdfDoc, indicesToKeep)
  copiedPages.forEach((page) => newPdf.addPage(page))

  const bytes = await newPdf.save()
  return Array.from(bytes)
}

export async function extractPages(fileData, pageIndices) {
  const pdfDoc = await loadPdf(fileData)

  const newPdf = await PDFDocument.create()
  const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices)
  copiedPages.forEach((page) => newPdf.addPage(page))

  const bytes = await newPdf.save()
  return Array.from(bytes)
}

export async function getPdfInfo(fileData) {
  const pdfDoc = await loadPdf(fileData)
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]
  const { width, height } = firstPage.getSize()

  return {
    pageCount: pages.length,
    width: Math.round(width),
    height: Math.round(height),
  }
}

export async function reorderPages(fileData, newOrder) {
  const pdfDoc = await loadPdf(fileData)

  const newPdf = await PDFDocument.create()
  const copiedPages = await newPdf.copyPages(pdfDoc, newOrder)
  copiedPages.forEach((page) => newPdf.addPage(page))

  const bytes = await newPdf.save()
  return Array.from(bytes)
}

// 添加文字到指定页面指定位置
export async function addText(fileData, options) {
  const {
    pageIndex,
    text,
    x,
    y,
    fontSize = 16,
    color = { r: 0, g: 0, b: 0 },
    opacity = 1,
  } = options

  const pdfDoc = await loadPdf(fileData)
  const pages = pdfDoc.getPages()

  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(`无效的页码: ${pageIndex + 1}`)
  }

  const page = pages[pageIndex]
  const { width, height } = page.getSize()

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(color.r, color.g, color.b),
    opacity,
  })

  const bytes = await pdfDoc.save()
  return Array.from(bytes)
}

// 给所有页面添加水印
export async function addWatermark(fileData, options) {
  const {
    text,
    fontSize = 60,
    opacity = 0.2,
    color = { r: 0.8, g: 0.8, b: 0.8 },
    rotation = -45,
    position = 'center',
  } = options

  const pdfDoc = await loadPdf(fileData)
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  for (const page of pages) {
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(text, fontSize)

    let x, y
    if (position === 'center') {
      x = width / 2 - textWidth / 2
      y = height / 2
    } else if (position === 'top-left') {
      x = 50
      y = height - 50
    } else if (position === 'bottom-right') {
      x = width - textWidth - 50
      y = 50
    } else {
      x = width / 2 - textWidth / 2
      y = height / 2
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(rotation),
    })
  }

  const bytes = await pdfDoc.save()
  return Array.from(bytes)
}

// 给所有页面添加页码
export async function addPageNumbers(fileData, options = {}) {
  const {
    position = 'bottom-center',
    fontSize = 12,
    color = { r: 0, g: 0, b: 0 },
    startNumber = 1,
    format = '{page}',
  } = options

  const pdfDoc = await loadPdf(fileData)
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  pages.forEach((page, idx) => {
    const { width, height } = page.getSize()
    const pageNum = startNumber + idx
    const text = format.replace('{page}', pageNum).replace('{total}', pages.length)

    const textWidth = font.widthOfTextAtSize(text, fontSize)
    const margin = 30

    let x, y
    if (position === 'bottom-center') {
      x = width / 2 - textWidth / 2
      y = margin
    } else if (position === 'bottom-right') {
      x = width - textWidth - margin
      y = margin
    } else if (position === 'bottom-left') {
      x = margin
      y = margin
    } else if (position === 'top-center') {
      x = width / 2 - textWidth / 2
      y = height - margin - fontSize
    } else if (position === 'top-right') {
      x = width - textWidth - margin
      y = height - margin - fontSize
    } else if (position === 'top-left') {
      x = margin
      y = height - margin - fontSize
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    })
  })

  const bytes = await pdfDoc.save()
  return Array.from(bytes)
}

// 压缩 PDF（降低图片质量以减小体积）
export async function compressPdf(fileData, options = {}) {
  const pdfDoc = await loadPdf(fileData)
  const bytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  })
  return Array.from(bytes)
}

// 将 PDF 页面提取为图片（返回 blob url 列表供预览）
export async function renderPdfToImages(fileData, scale = 1.5) {
  const pdfjsLib = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default

  const uint8Array = new Uint8Array(fileData)
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
  const pdf = await loadingTask.promise

  const images = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({
      canvasContext: context,
      viewport,
    }).promise

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/png')
    })
    images.push({
      url: URL.createObjectURL(blob),
      width: viewport.width,
      height: viewport.height,
    })
  }

  return images
}
