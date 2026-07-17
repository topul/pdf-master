# PDF Master

跨平台 PDF 处理桌面应用，基于 Electron + React 构建，支持合并、拆分、编辑等功能。

## 功能特性

- 📎 **合并 PDF** - 将多个 PDF 文件按顺序合并为一个完整文档
- ✂️ **拆分 PDF** - 按页数、单页或自定义范围拆分 PDF
- ✏️ **编辑 PDF** - 旋转页面、删除页面、提取页面、重新排序
- 🔒 **本地处理** - 所有操作均在本地完成，保护隐私安全
- 🖥️ **跨平台** - 支持 Windows、MacOS、Linux

## 技术栈

- **前端框架**: React 18 + Vite
- **桌面框架**: Electron 31
- **PDF 处理**: pdf-lib
- **路由**: React Router v6

## 开发

```bash
# 安装依赖
npm install

# 开发模式运行
npm run electron:dev

# 构建生产版本
npm run electron:build

# 构建指定平台
npm run electron:build:linux
npm run electron:build:win
npm run electron:build:mac
```

## 项目结构

```
pdf-master/
├── electron/
│   ├── main.js          # Electron 主进程
│   └── preload.js       # 预加载脚本（IPC 桥接）
├── src/
│   ├── pages/           # 页面组件
│   │   ├── HomePage.jsx
│   │   ├── MergePage.jsx
│   │   ├── SplitPage.jsx
│   │   └── EditPage.jsx
│   ├── styles/          # 全局样式
│   ├── utils/           # 工具函数
│   │   └── pdfUtils.js  # PDF 处理工具
│   ├── App.jsx          # 应用根组件
│   ├── main.jsx         # 入口文件
│   └── index.html       # HTML 模板
├── package.json
├── vite.config.js
└── README.md
```

## 许可证

MIT License
