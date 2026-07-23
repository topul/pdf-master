# PDF Master

A cross-platform PDF processing desktop application built with Electron + React, supporting merge, split, edit, preview, print and more.

---

<img width="2154" height="2042" alt="image" src="https://github.com/user-attachments/assets/ec79ba00-0111-4d0e-95a8-d91c66f69b0d" />


**[中文版本 / Chinese Version](README-zh.md)**

---

## Features

### Core Functions
- 📎 **Merge PDF** - Combine multiple PDF files into a single document
- ✂️ **Split PDF** - Split PDF by pages, single page or custom range
- ✏️ **Edit PDF** - Rotate, delete, extract pages, reorder with **real-time page preview**

### More Tools
- 📝 **Add Text** - Add text at specified positions (custom font size, color)
- 💧 **Add Watermark** - Batch add custom text watermarks (transparency, rotation, position)
- 🔢 **Add Page Numbers** - Auto add page numbers (multiple formats and positions)
- 🖨️ **Print PDF** - Print PDF via system print dialog (custom print range)
- 📦 **PDF Compression** - Three compression modes (Fast/Recommended/Strong) to reduce file size
- 📤 **Extract Content** - Extract text or images from PDF, batch export supported
- 🔐 **Encrypt/Decrypt** - Add password protection or remove existing passwords
- 📄 **Metadata** - Edit PDF title, author, subject and other document info
- 🖼️ **Image to PDF** - Merge multiple images into PDF
- 🖼️ **PDF to Image** - Export each PDF page as image

### Productivity Tools
- 📦 **Batch Processing** - Process multiple PDFs at once (compress, encrypt, extract text)
- 🔍 **PDF Compare** - Compare two PDF files and highlight differences
- 📝 **OCR Recognition** - Recognize text from scanned PDFs (multi-language support)
- 🧹 **Remove Watermark** - Remove text watermarks from PDF
- ✍️ **PDF Signature** - Handwritten signature and add to specified position (color, thickness, multiple signatures)
- 📝 **Fill Form** - Fill PDF AcroForm fields (text boxes, checkboxes, radio buttons, dropdowns)
- 🔖 **Bookmark Management** - View, add, edit, delete PDF bookmarks/toc
- ✂️ **Page Cropping** - Adjust PDF page margins with real-time preview

### Format Conversion
- 📝 **PDF to Word** - Convert PDF to editable Word document (.docx), preserving layout option
- 📊 **PDF to Excel** - Extract table data from PDF to Excel (.xlsx), auto column detection
- 🖌️ **PDF Annotate** - Add highlights, text annotations and sticky notes (multiple colors, save to PDF)
- 📝 **Create Form** - Add AcroForm fields (text, checkbox, radio, dropdown) to existing PDF
- 🏷️ **Batch Rename** - Rename multiple PDF files at once with custom patterns ({index}, {name}, etc.)

### User Experience
- 🕘 **Recent Files** - Auto-save recently opened files, quick access from home page
- 🖱️ **Context Menu** - Right-click file entries for quick open/delete actions
- 🌐 **Multi-language** - Support Chinese (Simplified) and English with one-click switching
- 📁 **Collapsible Categories** - Home page tools organized in collapsible sections for space saving

### Highlights
- 🔒 **Local Processing** - All operations are done locally, files never uploaded to cloud, protecting privacy
- 👁️ **Real-time Preview** - True PDF page rendering based on pdfjs-dist
- 🖥️ **Cross-platform** - Windows, MacOS, Linux supported

## Tech Stack

- **Frontend**: React 18 + Vite 5
- **Desktop**: Electron 31
- **PDF Processing**: pdf-lib (edit) + pdfjs-dist (preview rendering) + qpdf-wasm (compression/encryption)
- **Routing**: React Router v6
- **Packaging**: electron-builder

## Development

```bash
# Install dependencies
npm install

# Run in development mode (hot reload)
npm run electron:dev

# Build frontend
npm run build

# Build desktop app installer
npm run electron:build

# Build for specific platform
npm run electron:build:linux   # Linux (deb + AppImage)
npm run electron:build:win      # Windows (nsis + portable)
npm run electron:build:mac      # MacOS (dmg + zip)
```

### Network Configuration for China

The project has built-in `.npmrc` with Chinese mirrors. If Electron binary download fails, manually set environment variable:

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

## Project Structure

```
pdf-master/
├── electron/
│   ├── main.js          # Electron main process (window management, IPC, file operations)
│   └── preload.js       # Preload script (secure contextBridge)
├── src/
│   ├── pages/           # Page components
│   │   ├── HomePage.jsx       # Home page
│   │   ├── MergePage.jsx      # Merge PDF
│   │   ├── SplitPage.jsx      # Split PDF
│   │   ├── EditPage.jsx       # Edit PDF (with preview)
│   │   ├── TextPage.jsx       # Add text
│   │   ├── WatermarkPage.jsx  # Add watermark
│   │   ├── PageNumberPage.jsx # Add page numbers
│   │   ├── PrintPage.jsx      # Print PDF
│   │   ├── CompressPage.jsx   # PDF compression
│   │   ├── ExtractPage.jsx    # Extract content (text/images)
│   │   ├── EncryptPage.jsx    # Encrypt/decrypt
│   │   ├── MetadataPage.jsx   # Metadata edit
│   │   ├── ImageToPdfPage.jsx # Image to PDF
│   │   ├── PdfToImagePage.jsx # PDF to image
│   │   ├── BatchPage.jsx      # Batch processing
│   │   ├── BatchRenamePage.jsx# Batch rename PDF files
│   │   ├── SignaturePage.jsx  # PDF signature
│   │   ├── FormPage.jsx       # Fill form
│   │   ├── BookmarkPage.jsx   # Bookmark management
│   │   └── CropPage.jsx       # Page cropping
│   ├── components/
│   │   └── ContextMenu.jsx    # Right-click context menu component
│   ├── hooks/
│   │   └── useFileSelector.js # File selection hook with history tracking
│   ├── styles/
│   │   └── global.css         # Global styles
│   ├── utils/
│   │   ├── pdfUtils.js        # PDF processing utility functions
│   │   └── history.js         # Recent files history management
│   ├── App.jsx                # Root component (sidebar layout)
│   ├── main.jsx               # Entry file
│   └── index.html             # HTML template
├── .npmrc                      # npm mirror configuration
├── package.json
├── vite.config.mjs
├── README.md
└── README-zh.md
```

## Notes on PDF Text Editing

PDF format is not designed for editing. Existing text is scattered in content streams and fonts may not be embedded. **Directly modifying existing text is extremely difficult** (even Adobe Acrobat relies on OCR + reflow).

This app's "Add Text" feature takes a pragmatic approach: **overlay new text** at specified positions, covering 95% of text processing needs like covering text, adding annotations, and filling forms. Operation: Click preview to select position → Enter text → Apply → Save.

## License

MIT License
