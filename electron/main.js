const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs/promises')
const { PDFDocument, rgb, degrees } = require('pdf-lib')
const _fontkitImport = require('@pdf-lib/fontkit')

// 兼容 @pdf-lib/fontkit 的导出（CJS/ESM 互操作）
const realFontkit = _fontkitImport.default || _fontkitImport

// 包装 fontkit：TTC 字体集合自动取第一个字体
// pdf-lib 的 embedFont 内部调用 fontkit.create(buffer)
// 对 TTC 返回 FontCollection（有 .fonts 数组），而非单个 Font
// 这里包装成返回单个 Font，确保 createSubset/layout 方法可用
const fontkit = {
  create: (data, opts) => {
    const result = realFontkit.create(data, opts)
    if (result && Array.isArray(result.fonts) && result.fonts.length > 0) {
      return result.fonts[0]
    }
    return result
  },
}

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    title: 'PDF Master',
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('dialog:openFiles', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: options?.filters || [{ name: 'PDF Files', extensions: ['pdf'] }],
  })
  return result
})

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  return result
})

ipcMain.handle('dialog:saveFile', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options?.defaultPath || 'output.pdf',
    filters: options?.filters || [{ name: 'PDF Files', extensions: ['pdf'] }],
  })
  return result
})

ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath)
    return { success: true, data: Array.from(data) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('fs:writeFile', async (event, filePath, dataArray) => {
  try {
    const data = new Uint8Array(dataArray)
    await fs.writeFile(filePath, data)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('fs:writeFiles', async (event, files) => {
  try {
    for (const file of files) {
      const dir = path.dirname(file.path)
      try {
        await fs.access(dir)
      } catch {
        await fs.mkdir(dir, { recursive: true })
      }
      const data = new Uint8Array(file.data)
      await fs.writeFile(file.path, data)
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 读取系统中文字体，返回 ArrayBuffer
// 优先 TTF/OTF（单字体文件，兼容性最好），其次 TTC（字体集合，需 fontkit 解析）
ipcMain.handle('fs:readSystemFont', async () => {
  const candidates = {
    darwin: [
      // TTF 优先
      '/System/Library/Fonts/Supplemental/Songti.ttc',
      '/System/Library/Fonts/STHeiti Light.ttc',
      '/System/Library/Fonts/STHeiti Medium.ttc',
      '/System/Library/Fonts/PingFang.ttc',
      '/Library/Fonts/Arial Unicode.ttf',
    ],
    win32: [
      // TTF 优先
      'C:/Windows/Fonts/simhei.ttf',
      'C:/Windows/Fonts/simsun.ttc',
      'C:/Windows/Fonts/msyh.ttc',
      'C:/Windows/Fonts/msyhbd.ttc',
    ],
    linux: [
      '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
      '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/opentype/noto/NotoSansCJK.ttc',
    ],
  }

  const platform = process.platform
  const paths = candidates[platform] || candidates.linux

  for (const fontPath of paths) {
    try {
      await fs.access(fontPath)
      const data = await fs.readFile(fontPath)
      return { success: true, data: Array.from(new Uint8Array(data)), path: fontPath }
    } catch {
      // 当前路径不存在，继续尝试下一个
    }
  }

  return { success: false, error: '未找到可用的中文字体' }
})

// ============ PDF 文字相关操作（在主进程执行，保证 fontkit 正常工作）============
// 加载并缓存系统字体
let cachedFontBuffer = null

async function getChineseFont(pdfDoc) {
  if (!cachedFontBuffer) {
    const candidates = {
      darwin: [
        '/System/Library/Fonts/Supplemental/Songti.ttc',
        '/System/Library/Fonts/STHeiti Light.ttc',
        '/System/Library/Fonts/STHeiti Medium.ttc',
        '/System/Library/Fonts/PingFang.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
      ],
      win32: [
        'C:/Windows/Fonts/simhei.ttf',
        'C:/Windows/Fonts/simsun.ttc',
        'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/msyhbd.ttc',
      ],
      linux: [
        '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
        '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK.ttc',
      ],
    }
    const paths = candidates[process.platform] || candidates.linux
    for (const fontPath of paths) {
      try {
        await fs.access(fontPath)
        cachedFontBuffer = await fs.readFile(fontPath)
        break
      } catch {
        // 继续尝试
      }
    }
    if (!cachedFontBuffer) {
      throw new Error('未找到可用的中文字体')
    }
  }

  pdfDoc.registerFontkit(fontkit)
  // 不使用 subset:true，先确保 embedFont 能正确处理 TTC
  // 字体方法 (layout/createSubset) 由包装后的 fontkit 正确提供
  return await pdfDoc.embedFont(cachedFontBuffer)
}

// 添加文字
ipcMain.handle('pdf:addText', async (event, args) => {
  try {
    const { fileData, options } = args
    const pdfDoc = await PDFDocument.load(new Uint8Array(fileData))
    const pages = pdfDoc.getPages()

    if (options.pageIndex < 0 || options.pageIndex >= pages.length) {
      throw new Error(`无效的页码: ${options.pageIndex + 1}`)
    }

    const page = pages[options.pageIndex]
    const font = await getChineseFont(pdfDoc)
    const color = options.color || { r: 0, g: 0, b: 0 }

    page.drawText(options.text, {
      x: options.x,
      y: options.y,
      size: options.fontSize || 16,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity: options.opacity != null ? options.opacity : 1,
    })

    const bytes = await pdfDoc.save()
    return { success: true, data: Array.from(bytes) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 添加水印
ipcMain.handle('pdf:addWatermark', async (event, args) => {
  try {
    const { fileData, options } = args
    const pdfDoc = await PDFDocument.load(new Uint8Array(fileData))
    const pages = pdfDoc.getPages()
    const font = await getChineseFont(pdfDoc)
    const color = options.color || { r: 0.8, g: 0.8, b: 0.8 }

    for (const page of pages) {
      const { width, height } = page.getSize()
      const textWidth = font.widthOfTextAtSize(options.text, options.fontSize || 60)

      let x, y
      const position = options.position || 'center'
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

      page.drawText(options.text, {
        x,
        y,
        size: options.fontSize || 60,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity: options.opacity != null ? options.opacity : 0.2,
        rotate: degrees(options.rotation != null ? options.rotation : -45),
      })
    }

    const bytes = await pdfDoc.save()
    return { success: true, data: Array.from(bytes) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 添加页码
ipcMain.handle('pdf:addPageNumbers', async (event, args) => {
  try {
    const { fileData, options } = args
    const pdfDoc = await PDFDocument.load(new Uint8Array(fileData))
    const pages = pdfDoc.getPages()
    const font = await getChineseFont(pdfDoc)
    const color = options.color || { r: 0, g: 0, b: 0 }

    const position = options.position || 'bottom-center'
    const fontSize = options.fontSize || 12
    const startNumber = options.startNumber || 1
    const format = options.format || '{page}'
    const margin = 30

    pages.forEach((page, idx) => {
      const { width, height } = page.getSize()
      const pageNum = startNumber + idx
      const text = format.replace('{page}', pageNum).replace('{total}', pages.length)
      const textWidth = font.widthOfTextAtSize(text, fontSize)

      let x, y
      if (position === 'bottom-center') {
        x = width / 2 - textWidth / 2; y = margin
      } else if (position === 'bottom-right') {
        x = width - textWidth - margin; y = margin
      } else if (position === 'bottom-left') {
        x = margin; y = margin
      } else if (position === 'top-center') {
        x = width / 2 - textWidth / 2; y = height - margin - fontSize
      } else if (position === 'top-right') {
        x = width - textWidth - margin; y = height - margin - fontSize
      } else if (position === 'top-left') {
        x = margin; y = height - margin - fontSize
      }

      page.drawText(text, {
        x, y, size: fontSize, font,
        color: rgb(color.r, color.g, color.b),
      })
    })

    const bytes = await pdfDoc.save()
    return { success: true, data: Array.from(bytes) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// PDF 加密
ipcMain.handle('pdf:encrypt', async (event, args) => {
  try {
    const { fileData, options } = args
    const srcDoc = await PDFDocument.load(new Uint8Array(fileData))

    // 已知问题：直接对已加载的 PDF 调用 save({ encrypt }) 加密不会生效
    // 修复方式：把页面复制到全新的 PDF 文档，再加密保存
    const newDoc = await PDFDocument.create()
    const pages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices())
    pages.forEach((page) => newDoc.addPage(page))

    // 保留元数据
    const title = srcDoc.getTitle()
    const author = srcDoc.getAuthor()
    const subject = srcDoc.getSubject()
    const keywords = srcDoc.getKeywords()
    if (title) newDoc.setTitle(title)
    if (author) newDoc.setAuthor(author)
    if (subject) newDoc.setSubject(subject)
    if (keywords) newDoc.setKeywords(keywords)
    newDoc.setCreator('PDF Master')
    newDoc.setProducer('PDF Master')

    const encryptOptions = {
      userPassword: options.userPassword || '',
      ownerPassword: options.ownerPassword || options.userPassword || '',
      permissions: {
        printing: options.allowPrint !== false ? 'highResolution' : 'none',
        modifying: options.allowModify !== false,
        copying: options.allowCopy !== false,
        annotating: options.allowAnnotate !== false,
        fillingForms: options.allowFillForms !== false,
        contentAccessibility: options.allowAccessibility !== false,
        documentAssembly: options.allowAssembly !== false,
      },
    }

    const bytes = await newDoc.save({ encrypt: encryptOptions })
    return { success: true, data: Array.from(bytes) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// PDF 解密
ipcMain.handle('pdf:decrypt', async (event, args) => {
  try {
    const { fileData, password } = args
    const srcDoc = await PDFDocument.load(new Uint8Array(fileData), {
      password: password || '',
    })

    // 同样把页面复制到新文档，去掉加密
    const newDoc = await PDFDocument.create()
    const pages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices())
    pages.forEach((page) => newDoc.addPage(page))

    const title = srcDoc.getTitle()
    const author = srcDoc.getAuthor()
    const subject = srcDoc.getSubject()
    const keywords = srcDoc.getKeywords()
    if (title) newDoc.setTitle(title)
    if (author) newDoc.setAuthor(author)
    if (subject) newDoc.setSubject(subject)
    if (keywords) newDoc.setKeywords(keywords)
    newDoc.setCreator('PDF Master')
    newDoc.setProducer('PDF Master')

    const bytes = await newDoc.save()
    return { success: true, data: Array.from(bytes) }
  } catch (error) {
    return { success: false, error: error.message }
  }
})
