const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFiles: (options) => ipcRenderer.invoke('dialog:openFiles', options),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  writeFiles: (files) => ipcRenderer.invoke('fs:writeFiles', files),
  readSystemFont: () => ipcRenderer.invoke('fs:readSystemFont'),
  // PDF 文字相关操作（在主进程执行，确保中文字体正常）
  pdfAddText: (fileData, options) => ipcRenderer.invoke('pdf:addText', { fileData, options }),
  pdfAddWatermark: (fileData, options) => ipcRenderer.invoke('pdf:addWatermark', { fileData, options }),
  pdfAddPageNumbers: (fileData, options) => ipcRenderer.invoke('pdf:addPageNumbers', { fileData, options }),
  pdfEncrypt: (fileData, options) => ipcRenderer.invoke('pdf:encrypt', { fileData, options }),
  pdfDecrypt: (fileData, password) => ipcRenderer.invoke('pdf:decrypt', { fileData, password }),
  pdfCompress: (fileData, mode, jpegQuality) => ipcRenderer.invoke('pdf:compress', { fileData, mode, jpegQuality }),
  pdfExtractImages: (fileData) => ipcRenderer.invoke('pdf:extractImages', { fileData }),
  // 快捷键监听
  onShortcut: (callback) => {
    ipcRenderer.on('shortcut:openFile', () => callback('openFile'))
    ipcRenderer.on('shortcut:newWindow', () => callback('newWindow'))
    ipcRenderer.on('shortcut:goHome', () => callback('goHome'))
    ipcRenderer.on('shortcut:gotoPage', (event, pageIndex) => callback('gotoPage', pageIndex))
  },
  removeShortcutListeners: () => {
    ipcRenderer.removeAllListeners('shortcut:openFile')
    ipcRenderer.removeAllListeners('shortcut:newWindow')
    ipcRenderer.removeAllListeners('shortcut:goHome')
    ipcRenderer.removeAllListeners('shortcut:gotoPage')
  },
})
