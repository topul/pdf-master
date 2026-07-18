const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs/promises')
const { PDFDocument, rgb, degrees } = require('pdf-lib')
const fontkit = require('@pdf-lib/fontkit')

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
  // TTC 集合字体：用 fontkit.create 返回第 0 个字体
  // embedFont 内部已支持 TTC，直接传 Buffer 即可
  return await pdfDoc.embedFont(cachedFontBuffer, { subset: true })
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
