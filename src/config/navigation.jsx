// 侧边栏导航配置：按用户意图维度分组，前两组视觉相邻体现"阅读+编辑一体化"
// keywords 字段用于搜索别名匹配，逗号分隔，包含中英文同义词
export const NAV_GROUPS = [
  {
    id: 'view-annotate',
    name: 'nav.viewAnnotate', // 阅读与批注
    icon: 'BookOpen',
    defaultExpanded: true,
    tools: [
      { id: 'viewer', name: 'common.viewer', icon: 'BookOpen', path: '/viewer', description: 'nav.viewerDesc', keywords: '阅读,查看,浏览,打开,看pdf,reader,view' },
      { id: 'annotate', name: 'common.annotate', icon: 'Highlighter', path: '/annotate', description: 'nav.annotateDesc', keywords: '批注,标注,注释,高亮,笔记,画线,annotate,highlight' },
      { id: 'signature', name: 'common.signature', icon: 'PenTool', path: '/signature', description: 'nav.signatureDesc', keywords: '签名,签字,签署,手写签名,sign' },
      { id: 'bookmark', name: 'common.bookmark', icon: 'Bookmark', path: '/bookmark', description: 'nav.bookmarkDesc', keywords: '书签,目录,大纲,书签管理,bookmark,toc' },
    ],
  },
  {
    id: 'edit-extract',
    name: 'nav.editExtract', // 编辑与提取
    icon: 'PencilLine',
    defaultExpanded: false,
    tools: [
      { id: 'edit', name: 'common.edit', icon: 'PencilLine', path: '/edit', description: 'nav.editDesc', keywords: '编辑,修改,页面编辑,旋转,删除页面,排序,edit' },
      { id: 'crop', name: 'common.crop', icon: 'Crop', path: '/crop', description: 'nav.cropDesc', keywords: '裁剪,裁切,剪切,切边,边距,crop' },
      { id: 'extract', name: 'common.extract', icon: 'FileImage', path: '/extract', description: 'nav.extractDesc', keywords: '提取,抽取,导出内容,提取文字,提取图片,extract' },
      { id: 'text', name: 'common.text', icon: 'Type', path: '/text', description: 'nav.textDesc', keywords: '文字,文本,添加文字,叠加文字,text' },
      { id: 'pagenum', name: 'common.pagenum', icon: 'Hash', path: '/pagenum', description: 'nav.pagenumDesc', keywords: '页码,页数,页眉,页脚,自动页码,pagenumber' },
      { id: 'watermark', name: 'common.watermark', icon: 'Droplet', path: '/watermark', description: 'nav.watermarkDesc', keywords: '水印,添加水印,文字水印,图片水印,watermark' },
    ],
  },
  {
    id: 'convert',
    name: 'nav.convertFormat', // 格式转换
    icon: 'RefreshCw',
    defaultExpanded: false,
    tools: [
      { id: 'image-to-pdf', name: 'common.imageToPdf', icon: 'ImagePlus', path: '/image-to-pdf', description: 'nav.imageToPdfDesc', keywords: '图片转pdf,多图合并,jpg转pdf,png转pdf,图片合成,image2pdf' },
      { id: 'pdf-to-image', name: 'common.pdfToImage', icon: 'Image', path: '/pdf-to-image', description: 'nav.pdfToImageDesc', keywords: 'pdf转图片,导出图片,提取图片,pdf2image,png,jpg' },
      { id: 'pdf-to-word', name: 'common.pdfToWord', icon: 'FileType', path: '/pdf-to-word', description: 'nav.pdfToWordDesc', keywords: '转word,word,docx,doc,pdf2word' },
      { id: 'pdf-to-excel', name: 'common.pdfToExcel', icon: 'FileSpreadsheet', path: '/pdf-to-excel', description: 'nav.pdfToExcelDesc', keywords: '转excel,excel,xlsx,表格提取,pdf2excel' },
      { id: 'ocr', name: 'common.ocr', icon: 'Scan', path: '/ocr', description: 'nav.ocrDesc', keywords: 'ocr,文字识别,扫描识别,扫描件,识别,识别文字' },
    ],
  },
  {
    id: 'merge-batch',
    name: 'nav.mergeBatch', // 合并与批量
    icon: 'Layers',
    defaultExpanded: false,
    tools: [
      { id: 'merge', name: 'common.merge', icon: 'FilePlus2', path: '/merge', description: 'nav.mergeDesc', keywords: '合并,融合,合并文件,多文件合一,merge' },
      { id: 'split', name: 'common.split', icon: 'Scissors', path: '/split', description: 'nav.splitDesc', keywords: '拆分,分割,切割,切片,拆分pdf,split,divide' },
      { id: 'batch', name: 'common.batch', icon: 'Layers', path: '/batch', description: 'nav.batchDesc', keywords: '批量,批处理,多文件,批量操作,batch' },
      { id: 'batch-rename', name: 'common.batchRename', icon: 'FileEdit', path: '/batch-rename', description: 'nav.batchRenameDesc', keywords: '重命名,改名,批量改名,批量重命名,rename' },
    ],
  },
  {
    id: 'security-organize',
    name: 'nav.securityOrganize', // 安全与整理
    icon: 'ShieldCheck',
    defaultExpanded: false,
    tools: [
      { id: 'encrypt', name: 'common.encrypt', icon: 'Lock', path: '/encrypt', description: 'nav.encryptDesc', keywords: '加密,密码,解密,密码保护,decrypt,protect' },
      { id: 'compress', name: 'common.compress', icon: 'FileDown', path: '/compress', description: 'nav.compressDesc', keywords: '压缩,减小体积,压缩体积,compress,reduce' },
      { id: 'watermark-remove', name: 'common.watermarkRemove', icon: 'Eraser', path: '/watermark-remove', description: 'nav.watermarkRemoveDesc', keywords: '去水印,移除水印,删除水印,去除水印,remove watermark' },
      { id: 'metadata', name: 'common.metadata', icon: 'FileCog', path: '/metadata', description: 'nav.metadataDesc', keywords: '元数据,属性,文档信息,信息,metadata,info' },
      { id: 'print', name: 'common.print', icon: 'Printer', path: '/print', description: 'nav.printDesc', keywords: '打印,打印机,系统打印,print,printer' },
      { id: 'form-create', name: 'common.formCreate', icon: 'ListChecks', path: '/form-create', description: 'nav.formCreateDesc', keywords: '创建表单,制作表单,表单生成,form,create form' },
      { id: 'form', name: 'common.form', icon: 'FileEdit', path: '/form', description: 'nav.formDesc', keywords: '表单,填写表单,表单域,fill form' },
      { id: 'compare', name: 'common.compare', icon: 'GitCompare', path: '/compare', description: 'nav.compareDesc', keywords: '对比,比较,diff,差异,文件对比,compare' },
    ],
  },
]

// 首页快捷操作
export const QUICK_ACTIONS = [
  { id: 'merge', title: 'home.quickMerge', desc: 'home.quickMergeDesc', icon: 'FilePlus2', path: '/merge' },
  { id: 'split', title: 'home.quickSplit', desc: 'home.quickSplitDesc', icon: 'Scissors', path: '/split' },
  { id: 'convert', title: 'home.quickConvert', desc: 'home.quickConvertDesc', icon: 'RefreshCw', path: '/image-to-pdf' },
  { id: 'compress', title: 'home.quickCompress', desc: 'home.quickCompressDesc', icon: 'FileDown', path: '/compress' },
  { id: 'watermark', title: 'home.quickWatermark', desc: 'home.quickWatermarkDesc', icon: 'Droplet', path: '/watermark' },
  { id: 'encrypt', title: 'home.quickEncrypt', desc: 'home.quickEncryptDesc', icon: 'Lock', path: '/encrypt' },
]

// 默认收藏（首次使用预置）
export const DEFAULT_FAVORITES = [
  { id: 'merge', name: 'common.merge', icon: 'FilePlus2', path: '/merge', addedAt: 0 },
  { id: 'split', name: 'common.split', icon: 'Scissors', path: '/split', addedAt: 0 },
  { id: 'compress', name: 'common.compress', icon: 'FileDown', path: '/compress', addedAt: 0 },
  { id: 'pdf-to-word', name: 'common.pdfToWord', icon: 'FileType', path: '/pdf-to-word', addedAt: 0 },
]

export default NAV_GROUPS
