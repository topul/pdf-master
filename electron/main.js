const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs/promises')

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
