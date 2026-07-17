import { PDFDocument } from 'pdf-lib'

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
