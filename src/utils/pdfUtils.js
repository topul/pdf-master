import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
  PDFName,
  PDFString,
  PDFArray,
  PDFHexString,
  PDFNumber,
  PDFDict,
} from 'pdf-lib'

// ===== 图片转 PDF =====
export async function imagesToPdf(imageFiles, options = {}) {
  const pdfDoc = await PDFDocument.create()
  const pageSize = options.pageSize || 'a4'
  const margin = options.margin ?? 20
  const fit = options.fit ?? true

  const a4Width = 595.28
  const a4Height = 841.89

  for (let i = 0; i < imageFiles.length; i++) {
    const imgFile = imageFiles[i]
    const uint8 = new Uint8Array(imgFile.data)

    let image
    const ext = (imgFile.name.split('.').pop() || '').toLowerCase()

    if (ext === 'png') {
      image = await pdfDoc.embedPng(uint8)
    } else if (ext === 'jpg' || ext === 'jpeg') {
      image = await pdfDoc.embedJpg(uint8)
    } else {
      const bitmap = await loadImageBitmap(uint8)
      const pngData = await bitmapToPng(bitmap)
      image = await pdfDoc.embedPng(pngData)
    }

    const { width: imgWidth, height: imgHeight } = image.scale(1)

    let pageWidth, pageHeight
    if (pageSize === 'a4') {
      pageWidth = a4Width
      pageHeight = a4Height
    } else if (pageSize === 'fit') {
      pageWidth = imgWidth + margin * 2
      pageHeight = imgHeight + margin * 2
    } else {
      pageWidth = a4Width
      pageHeight = a4Height
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight])

    let drawWidth = imgWidth
    let drawHeight = imgHeight

    if (fit && pageSize !== 'fit') {
      const maxWidth = pageWidth - margin * 2
      const maxHeight = pageHeight - margin * 2
      const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1)
      drawWidth = imgWidth * scale
      drawHeight = imgHeight * scale
    }

    const x = (pageWidth - drawWidth) / 2
    const y = (pageHeight - drawHeight) / 2

    page.drawImage(image, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    })
  }

  const bytes = await pdfDoc.save()
  return Array.from(bytes)
}

async function loadImageBitmap(uint8Array) {
  const blob = new Blob([uint8Array])
  const bitmap = await createImageBitmap(blob)
  return bitmap
}

async function bitmapToPng(bitmap) {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader()
      reader.onload = () => resolve(new Uint8Array(reader.result))
      reader.readAsArrayBuffer(blob)
    }, 'image/png')
  })
}

// ===== 读取 PDF 元数据 =====
export async function getPdfMetadata(fileData) {
  const pdfDoc = await loadPdf(fileData)
  return {
    title: pdfDoc.getTitle() || '',
    author: pdfDoc.getAuthor() || '',
    subject: pdfDoc.getSubject() || '',
    keywords: pdfDoc.getKeywords() || '',
    creator: pdfDoc.getCreator() || 'PDF Master',
    producer: pdfDoc.getProducer() || 'PDF Master',
    creationDate: pdfDoc.getCreationDate() || null,
    modificationDate: pdfDoc.getModificationDate() || null,
    pageCount: pdfDoc.getPageCount(),
    isEncrypted: false,
  }
}

// ===== 设置 PDF 元数据 =====
export async function setPdfMetadata(fileData, metadata) {
  const pdfDoc = await loadPdf(fileData)

  if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title)
  if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author)
  if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject)
  if (metadata.keywords !== undefined) pdfDoc.setKeywords(metadata.keywords)
  if (metadata.creator !== undefined) pdfDoc.setCreator(metadata.creator)
  // Producer 支持用户自定义，默认 PDF Master
  pdfDoc.setProducer(metadata.producer || 'PDF Master')
  // 更新修改时间
  pdfDoc.setModificationDate(new Date())

  const bytes = await pdfDoc.save()
  return Array.from(bytes)
}

// ===== PDF 加密（主进程执行，使用 qpdf-wasm）=====
export async function encryptPdf(fileData, options) {
  const result = await window.electronAPI.pdfEncrypt(fileData, options)
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.data
}

// ===== PDF 解密（主进程执行，使用 qpdf-wasm）=====
export async function decryptPdf(fileData, password) {
  const result = await window.electronAPI.pdfDecrypt(fileData, password)
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.data
}

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

// 添加文字到指定页面指定位置（通过 IPC 在主进程执行，使用中文字体）
export async function addText(fileData, options) {
  const result = await window.electronAPI.pdfAddText(fileData, options)
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.data
}

// 给所有页面添加水印（通过 IPC 在主进程执行）
export async function addWatermark(fileData, options) {
  const result = await window.electronAPI.pdfAddWatermark(fileData, options)
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.data
}

// 给所有页面添加页码（通过 IPC 在主进程执行）
export async function addPageNumbers(fileData, options = {}) {
  const result = await window.electronAPI.pdfAddPageNumbers(fileData, options)
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.data
}

// 压缩 PDF（主进程 qpdf-wasm 执行）
// mode: 'fast' | 'recommended' | 'strong'
export async function compressPdf(fileData, mode = 'recommended', jpegQuality) {
  const result = await window.electronAPI.pdfCompress(fileData, mode, jpegQuality)
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.data
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

// 提取 PDF 文字内容（每页文字 + 总文字）
export async function extractPdfText(fileData) {
  const pdfjsLib = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default

  const uint8Array = new Uint8Array(fileData)
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
  const pdf = await loadingTask.promise

  const pages = []
  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    pages.push({ pageIndex: i - 1, text: pageText })
    fullText += pageText + '\n\n'
  }

  return {
    pageCount: pdf.numPages,
    pages,
    fullText: fullText.trim(),
  }
}

// 提取 PDF 中的图片（主进程执行，遍历 XObject）
export async function extractPdfImages(fileData) {
  const result = await window.electronAPI.pdfExtractImages(fileData)
  if (!result.success) {
    throw new Error(result.error)
  }
  return result.images
}

// 获取 PDF 表单域信息
export async function getFormFields(fileData) {
  const uint8Array = new Uint8Array(fileData)
  const pdfDoc = await PDFDocument.load(uint8Array)

  const form = pdfDoc.getForm()
  const fields = []

  const fieldNames = form.getFields().map((f) => f.getName())
  for (const name of fieldNames) {
    const field = form.getField(name)
    if (!field) continue

    let type = 'TextField'
    let value = ''
    let options = []

    try {
      if (field instanceof PDFTextField) {
        type = 'TextField'
        value = field.getText() || ''
      } else if (field instanceof PDFCheckBox) {
        type = 'CheckBox'
        value = field.isChecked() ? 'Yes' : 'Off'
      } else if (field instanceof PDFRadioGroup) {
        type = 'Radio'
        value = field.getSelected() || ''
        options = field.getOptions().map((o) => o.getValue())
      } else if (field instanceof PDFDropdown) {
        type = 'Dropdown'
        value = field.getSelected() || ''
        options = field.getOptions().map((o) => o.getValue())
      } else {
        const fieldType = field.constructor.name
        if (fieldType.includes('Signature')) {
          type = 'Signature'
        }
      }
    } catch (e) {
      type = 'TextField'
      try {
        value = field.getText?.() || ''
      } catch {}
    }

    fields.push({
      name,
      type,
      value,
      options,
      label: name,
    })
  }

  return fields
}

// 填写 PDF 表单
export async function fillForm(fileData, values) {
  const uint8Array = new Uint8Array(fileData)
  const pdfDoc = await PDFDocument.load(uint8Array)

  const form = pdfDoc.getForm()

  for (const [name, value] of Object.entries(values)) {
    try {
      const field = form.getField(name)
      if (!field) continue

      if (field instanceof PDFTextField) {
        field.setText(value)
      } else if (field instanceof PDFCheckBox) {
        field.check(value === 'Yes' || value === true || value === 'true')
      } else if (field instanceof PDFRadioGroup) {
        field.select(value)
      } else if (field instanceof PDFDropdown) {
        field.select(value)
      }
    } catch (e) {
      console.warn(`Failed to fill field ${name}:`, e)
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Array.from(pdfBytes)
}

// 获取 PDF 书签
export async function getBookmarks(fileData) {
  const uint8Array = new Uint8Array(fileData)
  const pdfDoc = await PDFDocument.load(uint8Array)

  const bookmarks = []
  const catalog = pdfDoc.catalog
  const outlineDict = catalog.get(PDFName.of('Outlines'))
  if (!outlineDict) return bookmarks

  const lookup = pdfDoc.context.lookup.bind(pdfDoc.context)
  const outlinesObj = lookup(outlineDict)
  if (!outlinesObj || !outlinesObj.dict) return bookmarks

  const first = outlinesObj.dict.get(PDFName.of('First'))
  if (!first) return bookmarks

  const pages = pdfDoc.getPages()
  const pageRefs = pages.map((p) => p.ref)

  const collect = (itemRef, list, parentId = null, idx = 0) => {
    if (!itemRef) return
    const item = lookup(itemRef)
    if (!item || !item.dict) return

    const titleObj = item.dict.get(PDFName.of('Title'))
    let title = '未命名'
    if (titleObj) {
      if (titleObj instanceof PDFHexString) {
        try {
          title = decodeHex(titleObj.value)
        } catch {
          title = titleObj.value
        }
      } else if (titleObj instanceof PDFString) {
        title = titleObj.value
      }
    }

    let pageIndex = -1
    const dest = item.dict.get(PDFName.of('Dest'))
    const a = item.dict.get(PDFName.of('A'))
    let destArray = null
    if (dest) {
      if (dest instanceof PDFArray) {
        destArray = dest
      } else if (dest instanceof PDFString || dest instanceof PDFHexString) {
        // named dest, skip
      }
    } else if (a && a instanceof PDFDict) {
      const s = a.dict.get(PDFName.of('S'))
      const d = a.dict.get(PDFName.of('D'))
      if (s && s.toString() === '/GoTo' && d && d instanceof PDFArray) {
        destArray = d
      }
    }

    if (destArray && destArray.size() > 0) {
      const pageRef = destArray.get(0)
      const refIdx = pageRefs.findIndex(
        (r) => r.objectNumber === pageRef.objectNumber && r.generationNumber === pageRef.generationNumber
      )
      if (refIdx >= 0) pageIndex = refIdx
    }

    const id = `${parentId || 'root'}-${idx}`
    list.push({ id, title, pageIndex: pageIndex >= 0 ? pageIndex : 0, parentId })

    const child = item.dict.get(PDFName.of('First'))
    if (child) {
      let childIdx = 0
      let cur = child
      while (cur) {
        collect(cur, list, id, childIdx++)
        const curItem = lookup(cur)
        cur = curItem && curItem.dict ? curItem.dict.get(PDFName.of('Next')) : null
      }
    }
  }

  let idx = 0
  let cur = first
  while (cur) {
    collect(cur, bookmarks, null, idx++)
    const curItem = lookup(cur)
    cur = curItem && curItem.dict ? curItem.dict.get(PDFName.of('Next')) : null
  }

  return bookmarks
}

// 添加书签（通过低层字典操作）
export async function addBookmark(fileData, bookmark) {
  const uint8Array = new Uint8Array(fileData)
  const pdfDoc = await PDFDocument.load(uint8Array)

  const context = pdfDoc.context
  const catalog = pdfDoc.catalog

  // 获取或创建 Outlines 字典
  let outlinesRef = catalog.get(PDFName.of('Outlines'))
  let outlines
  if (outlinesRef) {
    outlines = context.lookup(outlinesRef)
  }
  if (!outlines) {
    outlines = context.obj({})
    outlinesRef = context.register(outlines)
    catalog.set(PDFName.of('Outlines'), outlinesRef)
  }

  // 获取或创建 First/Last 链
  const page = pdfDoc.getPage(bookmark.pageIndex)
  const destArray = context.obj([page.ref, PDFName.of('Fit')])

  // 创建新的 outline item
  const newItem = context.obj({
    Title: PDFHexString.of(Buffer.from(bookmark.title, 'utf-8').toString('hex')),
    Parent: outlinesRef,
    Dest: destArray,
  })
  const newItemRef = context.register(newItem)

  const first = outlines.dict.get(PDFName.of('First'))
  if (!first) {
    // 第一个书签
    outlines.dict.set(PDFName.of('First'), newItemRef)
    outlines.dict.set(PDFName.of('Last'), newItemRef)
    outlines.dict.set(PDFName.of('Count'), PDFNumber.of(1))
  } else {
    // 插入到末尾
    let lastRef = outlines.dict.get(PDFName.of('Last'))
    const lastItem = context.lookup(lastRef)
    if (lastItem && lastItem.dict) {
      lastItem.dict.set(PDFName.of('Next'), newItemRef)
      newItem.dict.set(PDFName.of('Prev'), lastRef)
    }
    outlines.dict.set(PDFName.of('Last'), newItemRef)
    const count = outlines.dict.get(PDFName.of('Count'))
    outlines.dict.set(PDFName.of('Count'), PDFNumber.of((count ? count.value : 0) + 1))
  }

  const pdfBytes = await pdfDoc.save()
  return Array.from(pdfBytes)
}

// 更新书签标题
export async function updateBookmark(fileData, bookmarkId, updates) {
  const uint8Array = new Uint8Array(fileData)
  const pdfDoc = await PDFDocument.load(uint8Array)

  const catalog = pdfDoc.catalog
  const outlinesRef = catalog.get(PDFName.of('Outlines'))
  if (!outlinesRef) return Array.from(await pdfDoc.save())

  const outlines = pdfDoc.context.lookup(outlinesRef)
  if (!outlines || !outlines.dict) return Array.from(await pdfDoc.save())

  const first = outlines.dict.get(PDFName.of('First'))
  if (!first) return Array.from(await pdfDoc.save())

  const idx = parseInt(bookmarkId.split('-').pop(), 10)
  if (isNaN(idx)) return Array.from(await pdfDoc.save())

  // 遍历到第 idx 个
  let cur = first
  for (let i = 0; i < idx; i++) {
    const item = pdfDoc.context.lookup(cur)
    if (!item || !item.dict) break
    cur = item.dict.get(PDFName.of('Next'))
    if (!cur) break
  }

  if (cur) {
    const item = pdfDoc.context.lookup(cur)
    if (item && item.dict && updates.title) {
      item.dict.set(PDFName.of('Title'), PDFHexString.of(Buffer.from(updates.title, 'utf-8').toString('hex')))
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Array.from(pdfBytes)
}

// 删除书签
export async function removeBookmark(fileData, bookmarkId) {
  const uint8Array = new Uint8Array(fileData)
  const pdfDoc = await PDFDocument.load(uint8Array)

  const catalog = pdfDoc.catalog
  const outlinesRef = catalog.get(PDFName.of('Outlines'))
  if (!outlinesRef) return Array.from(await pdfDoc.save())

  const outlines = pdfDoc.context.lookup(outlinesRef)
  if (!outlines || !outlines.dict) return Array.from(await pdfDoc.save())

  const first = outlines.dict.get(PDFName.of('First'))
  if (!first) return Array.from(await pdfDoc.save())

  const idx = parseInt(bookmarkId.split('-').pop(), 10)
  if (isNaN(idx)) return Array.from(await pdfDoc.save())

  // 遍历到第 idx 个
  let cur = first
  let prev = null
  for (let i = 0; i < idx; i++) {
    const item = pdfDoc.context.lookup(cur)
    if (!item || !item.dict) break
    prev = cur
    cur = item.dict.get(PDFName.of('Next'))
    if (!cur) break
  }

  if (!cur) return Array.from(await pdfDoc.save())

  const item = pdfDoc.context.lookup(cur)
  if (!item || !item.dict) return Array.from(await pdfDoc.save())

  const next = item.dict.get(PDFName.of('Next'))

  if (prev) {
    const prevItem = pdfDoc.context.lookup(prev)
    if (prevItem && prevItem.dict) {
      if (next) {
        prevItem.dict.set(PDFName.of('Next'), next)
        const nextItem = pdfDoc.context.lookup(next)
        if (nextItem && nextItem.dict) {
          nextItem.dict.set(PDFName.of('Prev'), prev)
        }
      } else {
        prevItem.dict.delete(PDFName.of('Next'))
        outlines.dict.set(PDFName.of('Last'), prev)
      }
    }
  } else {
    // 删除第一个
    if (next) {
      outlines.dict.set(PDFName.of('First'), next)
      const nextItem = pdfDoc.context.lookup(next)
      if (nextItem && nextItem.dict) {
        nextItem.dict.delete(PDFName.of('Prev'))
      }
    } else {
      outlines.dict.delete(PDFName.of('First'))
      outlines.dict.delete(PDFName.of('Last'))
      outlines.dict.delete(PDFName.of('Count'))
    }
  }

  // 更新计数
  const count = outlines.dict.get(PDFName.of('Count'))
  if (count) {
    const newCount = Math.max(0, count.value - 1)
    outlines.dict.set(PDFName.of('Count'), PDFNumber.of(newCount))
  }

  const pdfBytes = await pdfDoc.save()
  return Array.from(pdfBytes)
}

// 裁剪 PDF 页面
export async function cropPdf(fileData, margins) {
  const uint8Array = new Uint8Array(fileData)
  const pdfDoc = await PDFDocument.load(uint8Array)

  const pages = pdfDoc.getPages()
  for (const page of pages) {
    const { width, height } = page.getSize()

    const newWidth = width - margins.left - margins.right
    const newHeight = height - margins.top - margins.bottom

    if (newWidth <= 0 || newHeight <= 0) {
      throw new Error('裁剪边距过大，页面尺寸不能为零')
    }

    page.setSize(newWidth, newHeight)
    page.translateContent(-margins.left, margins.bottom)
  }

  const pdfBytes = await pdfDoc.save()
  return Array.from(pdfBytes)
}

// 辅助：解码 PDF Hex 字符串
function decodeHex(hex) {
  if (!hex) return ''
  let str = ''
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16))
  }
  // 尝试 UTF-16BE 解码（PDF 标准）
  try {
    const bytes = new Uint8Array(str.length)
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
    return new TextDecoder('utf-16be').decode(bytes)
  } catch {
    return str
  }
}

// 签名 PDF（将手写签名图片插入指定位置）
export async function signPdf(fileData, signatures) {
  const uint8Array = new Uint8Array(fileData)
  const pdfDoc = await PDFDocument.load(uint8Array)

  for (const sig of signatures) {
    const base64Data = sig.dataUrl.split(',')[1]
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))

    let image
    try {
      image = await pdfDoc.embedPng(imageBytes)
    } catch {
      image = await pdfDoc.embedJpg(imageBytes)
    }

    const page = pdfDoc.getPage(sig.pageIndex)
    const { width: pageWidth, height: pageHeight } = page.getSize()

    const scale = (40 / image.height) * image.width
    page.drawImage(image, {
      x: sig.x,
      y: pageHeight - sig.y,
      width: scale,
      height: 40,
    })
  }

  const pdfBytes = await pdfDoc.save()
  return Array.from(pdfBytes)
}
