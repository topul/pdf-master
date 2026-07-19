const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs/promises')
const fsSync = require('fs')
const pdfLib = require('pdf-lib')
const { PDFDocument, rgb, degrees } = pdfLib
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

// 注：PDF 加密/解密使用 qpdf-wasm（纯 WASM，无 native 依赖，跨平台一致）
// qpdf 是成熟的 PDF 处理库，加密后能被 Adobe Reader / Chrome / Edge 正确识别
const createQpdfModule = require('@neslinesli93/qpdf-wasm/dist/qpdf.js')
let qpdfModulePromise = null

async function getQpdf() {
  if (!qpdfModulePromise) {
    const wasmPath = require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.wasm')
    const wasmBinary = fsSync.readFileSync(wasmPath)
    qpdfModulePromise = createQpdfModule({
      locateFile: () => wasmPath,
      wasmBinary,
      noInitialRun: true,
    })
  }
  return qpdfModulePromise
}

// 在 qpdf 实例上运行一次命令，返回输出文件的 Uint8Array
// 每次 callMain 后实例状态可能受影响，所以每次都新建实例
async function runQpdfCommand(inputData, args) {
  const createModule = createQpdfModule
  const wasmPath = require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.wasm')
  const wasmBinary = fsSync.readFileSync(wasmPath)
  const qpdf = await createModule({
    locateFile: () => wasmPath,
    wasmBinary,
    noInitialRun: true,
  })

  qpdf.FS.writeFile('/input.pdf', new Uint8Array(inputData))
  try {
    qpdf.callMain([...args, '--', '/input.pdf', '/output.pdf'])
  } catch (e) {
    // callMain 出错时抛出字符串错误（来自 qpdf stderr）
    throw new Error(typeof e === 'string' ? e : e.message || String(e))
  }

  let outputBytes
  try {
    outputBytes = qpdf.FS.readFile('/output.pdf')
  } catch (e) {
    throw new Error('qpdf 未产生输出文件，请检查密码或参数')
  }
  if (!outputBytes || outputBytes.length === 0) {
    throw new Error('qpdf 输出为空')
  }
  return Array.from(outputBytes)
}

// 把权限布尔值映射成 qpdf 的 --print/--modify/--extract 等独立 flag
// 参考 https://qpdf.readthedocs.io/en/stable/encryption.html
function buildEncryptArgs(options) {
  const userPassword = options.userPassword || ''
  const ownerPassword = options.ownerPassword || options.userPassword || ''
  // qpdf --encrypt user owner bits -- input output
  // 权限 flag 在 bits 和 -- 之间，每个都是独立的 --xxx=y/n 或 --xxx=none/...
  const args = ['--encrypt', userPassword, ownerPassword, '256']

  // 打印权限：--print=none | --print=low | --print=full
  if (options.allowPrint === false) {
    args.push('--print=none')
  } else {
    args.push('--print=full')
  }

  // 修改权限：--modify=none | --modify=all | --modify=annotate | --modify=form | --modify=assembly
  // 我们的选项是布尔值，简化处理：allowModify=false 时禁止所有修改
  if (options.allowModify === false) {
    // 但 allowFillForms/allowAnnotate/allowAssembly 仍可单独允许
    let modify = []
    if (options.allowAnnotate !== false) modify.push('annotate')
    if (options.allowFillForms !== false) modify.push('form')
    if (options.allowAssembly !== false) modify.push('assembly')
    args.push('--modify=' + (modify.length > 0 ? modify.join(',') : 'none'))
  } else {
    args.push('--modify=all')
  }

  // 提取（复制）：--extract=y | --extract=n
  args.push(options.allowCopy === false ? '--extract=n' : '--extract=y')

  return args
}

// PDF 加密
ipcMain.handle('pdf:encrypt', async (event, args) => {
  try {
    const { fileData, options } = args
    const encArgs = buildEncryptArgs(options)
    const data = await runQpdfCommand(fileData, encArgs)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message || String(error) }
  }
})

// PDF 解密
ipcMain.handle('pdf:decrypt', async (event, args) => {
  try {
    const { fileData, password } = args
    const decArgs = password ? [`--password=${password}`] : []
    decArgs.push('--decrypt')
    const data = await runQpdfCommand(fileData, decArgs)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message || String(error) }
  }
})

// 根据压缩等级生成 qpdf 参数
// mode: 'fast' | 'recommended' | 'strong'
// jpegQuality: 1-100（strong 模式下有效，默认 50）
function buildCompressArgs(mode, jpegQuality = 50) {
  const args = ['--compress-streams=y', '--remove-unreferenced-resources=yes']

  if (mode === 'fast') {
    args.push('--object-streams=generate')
    return args
  }

  // recommended & strong: 重新压缩 flate 流
  args.push('--recompress-flate')
  args.push('--compression-level=9')
  args.push('--object-streams=generate')

  if (mode === 'strong') {
    const q = Math.max(1, Math.min(100, jpegQuality))
    args.push(`--jpeg-quality=${q}`)
  }

  return args
}

// PDF 压缩
ipcMain.handle('pdf:compress', async (event, args) => {
  try {
    const { fileData, mode = 'recommended', jpegQuality } = args
    const compressArgs = buildCompressArgs(mode, jpegQuality)
    const data = await runQpdfCommand(fileData, compressArgs)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message || String(error) }
  }
})

// 提取 PDF 中的所有图片（遍历页面对象树，找 Image XObject）
ipcMain.handle('pdf:extractImages', async (event, args) => {
  try {
    const { fileData } = args
    const uint8 = new Uint8Array(fileData)
    const pdfDoc = await PDFDocument.load(uint8)
    const pages = pdfDoc.getPages()
    const images = []
    const seenRefs = new Set()
    const PDFName = pdfLib.PDFName
    const PDFArray = pdfLib.PDFArray

    for (const page of pages) {
      const resources = page.node.XObject()
      if (!resources) continue

      const entries = resources.entries()
      for (const [name, ref] of entries) {
        const refStr = ref.toString()
        if (seenRefs.has(refStr)) continue
        seenRefs.add(refStr)

        try {
          const xobj = pdfDoc.context.lookup(ref)
          if (!xobj) continue
          const subtype = xobj.dict?.get(PDFName.of('Subtype'))
          if (!subtype || subtype.encodedName !== 'Image') continue

          const dict = xobj.dict
          const width = dict.get(PDFName.of('Width'))?.value
          const height = dict.get(PDFName.of('Height'))?.value
          const filter = dict.get(PDFName.of('Filter'))

          let format = 'raw'
          const data = xobj.contents ? xobj.contents.slice() : new Uint8Array()

          if (filter) {
            let filterName
            if (filter instanceof PDFArray) {
              const arr = filter.array()
              filterName = arr[arr.length - 1]?.encodedName
            } else {
              filterName = filter.encodedName
            }
            if (filterName === 'DCTDecode') {
              format = 'jpeg'
            } else if (filterName === 'JPXDecode') {
              format = 'jp2'
            } else if (filterName === 'FlateDecode') {
              format = 'flate'
            }
          }

          images.push({
            name: name.value || `image_${images.length + 1}`,
            data: Array.from(data),
            width: width || 0,
            height: height || 0,
            format,
          })
        } catch (e) {
          // 跳过无法解析的 XObject
        }
      }
    }

    return { success: true, images }
  } catch (error) {
    return { success: false, error: error.message || String(error) }
  }
})
