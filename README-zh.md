# PDF Master

跨平台 PDF 处理桌面应用，基于 Electron + React 构建，支持合并、拆分、编辑、预览、打印等功能。

---

<img width="2154" height="2042" alt="image" src="https://github.com/user-attachments/assets/2676e8ed-78bd-4750-aaf7-37fb619d5526" />


**[English Version / 英文版](README.md)**

---

## 功能特性

### 核心功能
- 📎 **合并 PDF** - 将多个 PDF 文件按顺序合并为一个完整文档
- ✂️ **拆分 PDF** - 按页数、单页或自定义范围拆分 PDF
- ✏️ **编辑 PDF** - 旋转、删除、提取页面、重新排序，支持**实时页面预览**

### 更多工具
- 📝 **添加文字** - 在 PDF 指定位置点击添加文字（支持自定义字号、颜色）
- 💧 **添加水印** - 批量给 PDF 页面添加自定义文字水印（支持透明度、旋转、位置）
- 🔢 **添加页码** - 自动给 PDF 每页添加页码（支持多种格式和位置）
- 🖨️ **打印 PDF** - 调用系统打印对话框打印 PDF（支持自定义打印范围）
- 📦 **PDF 压缩** - 三种压缩模式（极速/推荐/强力），减小文件体积
- 📤 **提取内容** - 提取 PDF 中的文字或图片，支持批量导出
- 🔐 **加密/解密** - 添加密码保护或移除已有密码
- 📄 **元数据** - 编辑 PDF 标题、作者、主题等文档信息
- 🖼️ **图片转 PDF** - 将多张图片合并为 PDF
- 🖼️ **PDF 转图片** - 将 PDF 每页导出为图片

### 效率工具
- 📦 **批量处理** - 一次处理多个 PDF，支持批量压缩、加密、提取文字
- 🔍 **PDF 对比** - 对比两个 PDF 文件，高亮显示差异
- 📝 **OCR 识别** - 识别扫描版 PDF 中的文字（多语言支持）
- 🧹 **去除水印** - 移除 PDF 中的文字水印
- ✍️ **PDF 签名** - 手写签名并添加到 PDF 指定位置（支持颜色、粗细、多签名）
- 📝 **填写表单** - 填写 PDF AcroForm 表单域（文本框、复选框、单选框、下拉框）
- 🔖 **书签管理** - 查看、添加、编辑、删除 PDF 书签/目录
- ✂️ **页面裁剪** - 调整 PDF 页面边距，实时预览裁剪效果

### 格式转换与批注
- 📝 **PDF 转 Word** - 将 PDF 转换为可编辑的 Word 文档（.docx），支持保留排版选项
- 📊 **PDF 转 Excel** - 提取 PDF 中的表格数据到 Excel 文件（.xlsx），自动列检测
- 🖌️ **PDF 批注** - 添加高亮、文字注释和便签（多颜色，保存到 PDF）
- 📝 **表单创建** - 在 PDF 上添加 AcroForm 字段（文本框、复选框、单选框、下拉框）

### 特点
- 🔒 **本地处理** - 所有操作均在本地完成，文件不上传云端，保护隐私
- 👁️ **实时预览** - 基于 pdfjs-dist 的 PDF 页面真实渲染预览
- 🖥️ **跨平台** - 支持 Windows、MacOS、Linux

## 技术栈

- **前端框架**: React 18 + Vite 5
- **桌面框架**: Electron 31
- **PDF 处理**: pdf-lib（编辑）+ pdfjs-dist（预览渲染）+ qpdf-wasm（压缩/加密）
- **路由**: React Router v6
- **打包**: electron-builder

## 开发

```bash
# 安装依赖（国内网络可能需要配置镜像，见下文）
npm install

# 开发模式运行（热更新）
npm run electron:dev

# 构建前端
npm run build

# 构建桌面应用安装包
npm run electron:build

# 构建指定平台
npm run electron:build:linux   # Linux (deb + AppImage)
npm run electron:build:win      # Windows (nsis + portable)
npm run electron:build:mac      # MacOS (dmg + zip)
```

### 国内网络配置

项目已内置 `.npmrc` 配置国内镜像源，如果 Electron 二进制下载失败，可手动设置环境变量：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

## 项目结构

```
pdf-master/
├── electron/
│   ├── main.js          # Electron 主进程（窗口管理、IPC、文件操作）
│   └── preload.js       # 预加载脚本（安全的 contextBridge）
├── src/
│   ├── pages/           # 页面组件
│   │   ├── HomePage.jsx       # 首页
│   │   ├── MergePage.jsx      # 合并 PDF
│   │   ├── SplitPage.jsx      # 拆分 PDF
│   │   ├── EditPage.jsx       # 编辑 PDF（含预览）
│   │   ├── TextPage.jsx       # 添加文字
│   │   ├── WatermarkPage.jsx  # 添加水印
│   │   ├── PageNumberPage.jsx # 添加页码
│   │   ├── PrintPage.jsx      # 打印 PDF
│   │   ├── CompressPage.jsx   # PDF 压缩
│   │   ├── ExtractPage.jsx    # 提取内容（文字/图片）
│   │   ├── EncryptPage.jsx    # 加密/解密
│   │   ├── MetadataPage.jsx   # 元数据编辑
│   │   ├── ImageToPdfPage.jsx # 图片转 PDF
│   │   ├── PdfToImagePage.jsx # PDF 转图片
│   │   ├── BatchPage.jsx      # 批量处理
│   │   ├── SignaturePage.jsx # PDF 签名
│   │   ├── FormPage.jsx      # 填写表单
│   │   ├── BookmarkPage.jsx   # 书签管理
│   │   └── CropPage.jsx      # 页面裁剪
│   ├── styles/
│   │   └── global.css         # 全局样式
│   ├── utils/
│   │   └── pdfUtils.js        # PDF 处理工具函数
│   ├── App.jsx                # 根组件（侧边栏布局）
│   ├── main.jsx               # 入口文件
│   └── index.html             # HTML 模板
├── .npmrc                      # npm 镜像配置
├── package.json
├── vite.config.mjs
├── README.md
└── README-zh.md
```

## 关于 PDF 文字编辑的说明

PDF 格式本身不是为编辑设计的，已有文字散落在内容流中、字体可能未嵌入，**直接修改已有文字非常困难**（即便是 Adobe Acrobat 也依赖 OCR + 重排版实现）。

本应用的「添加文字」功能采用务实的方案：在 PDF 页面指定位置**叠加新文字**，覆盖补字、添加批注、填写表单等 95% 的文字处理需求。操作方式：点击预览图选择位置 → 输入文字 → 应用 → 保存。

## 许可证

MIT License
