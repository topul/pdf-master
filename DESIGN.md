# PDF Master - 布局重构设计规范

> 本文档为 code 智能体提供完整的 UI 重构实施方案，基于 PDF Master v1.9.0 现有代码结构进行增量改造。

---

## 一、重构目标

| 问题 | 现状 | 目标 |
|------|------|------|
| 工具查找困难 | 27 个工具平铺在侧边栏 4 个分组中 | 全局搜索 + 收藏夹 + 意图驱动分类 |
| 侧边栏拥挤 | 收起后仅靠图标无法区分 | 搜索框置顶 + 手风琴分组 + 收藏/最近使用 |
| 首页信息过载 | 全部工具列表铺满页面 | 任务驱动首页：搜索 + 快捷入口 + 分类浏览 |
| 缺乏个性化 | 无收藏、无频率排序 | 收藏夹 + 最近使用（基于 localStorage） |
| 阅读与编辑割裂 | 阅读、编辑分属不同分组 | 阅读与编辑一体化（前两组视觉相邻），类似 Adobe 模式 |

---

## 二、侧边栏重构

### 2.1 整体结构

```
┌──────────────────────────┐
│  Logo + 应用名称          │  高度: 56px
├──────────────────────────┤
│  全局搜索框               │  高度: 40px, 带边框
├──────────────────────────┤
│  分隔线                  │
├──────────────────────────┤
│  ⭐ 收藏夹 (可折叠)      │  显示收藏的工具列表
│  🕐 最近使用 (可折叠)     │  显示最近 5 个工具
├──────────────────────────┤
│  分隔线                  │
├──────────────────────────┤
│  📖 阅读与批注 (4项)     │  手风琴展开（默认展开）
│  ✏️ 编辑与提取 (6项)     │  与上方视觉相邻，体现阅读+编辑一体化
│  🔄 格式转换 (5项)       │
│  📑 合并与批量 (4项)     │  多文件操作
│  🔒 安全与整理 (8项)     │
├──────────────────────────┤
│  分隔线                  │
├──────────────────────────┤
│  ⚙️ 设置    ◀ 收起按钮   │  底部固定
└──────────────────────────┘
```

### 2.2 分组设计思路

采用 **"阅读与编辑一体化"** 原则，参考 Adobe Acrobat 的工作流：

- **前两组视觉相邻**：「阅读与批注」+「编辑与提取」共同构成"打开文件后可做的单文件操作"
- **中间组**：「格式转换」也是针对单文件的产出操作
- **后两组**：「合并与批量」是多文件操作，「安全与整理」是独立/整理类操作

这样用户在阅读 PDF 时，能在侧边栏上方快速找到批注、编辑、提取、转换等关联功能。

### 2.3 尺寸规范

| 状态 | 宽度 | 内容 |
|------|------|------|
| 展开 | 240px | Logo + 搜索框 + 全部导航 |
| 收起 | 64px | Logo图标 + 搜索图标 + 分组图标 |

### 2.4 分组重构对照表

从原来的技术维度分组，改为 **用户意图维度**：

| 新分组 | 工具数 | 包含功能 | 对应原分组 |
|--------|--------|----------|------------|
| **阅读与批注** | 4 | 阅读 PDF、批注、签名、书签 | 核心(阅读) + 效率(批注、签名、书签) |
| **编辑与提取** | 6 | 编辑页面、裁剪、提取页面、提取文本、添加页码、水印 | 核心(编辑) + 工具集(提取、页码、水印) + 工具集(文本) + 效率(裁剪) |
| **格式转换** | 5 | 图片转PDF、PDF转图片、PDF转Word、PDF转Excel、OCR | 格式转换(全部) + 效率(OCR) |
| **合并与批量** | 4 | 合并、分割、批量处理、批量重命名 | 核心(合并、分割) + 效率(批量处理、批量重命名) |
| **安全与整理** | 8 | 加密、压缩、去除水印、元数据、打印、创建表单、填写表单、比较 | 工具集(压缩、元数据、加密、打印) + 效率(水印去除、表单创建、表单填写、比较) |

> 合计 27 个工具，覆盖现有全部功能（含原遗漏的「提取文本」`/text`）。

### 2.5 搜索框规范

- **位置**：侧边栏顶部，Logo 下方
- **占位文本**：`"搜索功能，如：合并、压缩、转Word..."`
- **快捷键**：`Ctrl+K` 全局唤起，focus 搜索框
- **匹配规则**：
  - 模糊匹配功能名称（中英文）
  - 匹配功能描述关键词
  - 匹配分类名称
- **展示**：下拉列表，最多 8 条结果，每条显示图标 + 名称 + 所属分类

**收起态搜索方案**：

侧边栏收起时（64px），搜索框仅显示搜索图标。点击图标后弹出 **浮动搜索面板**（类似 macOS Spotlight）：
- 面板定位：紧贴侧边栏右侧，垂直居中
- 面板尺寸：宽度 360px，最大高度 400px
- 面板内容：搜索输入框（自动聚焦）+ 结果列表
- 关闭方式：点击外部、Esc 键、选择结果后自动关闭
- 样式：`bg-card border border-border rounded-lg shadow-lg`

### 2.6 收藏夹规范

- **数据存储**：`localStorage`，key 为 `pdf-master-favorites`
- **数据结构**：
  ```ts
  type Favorite = {
    id: string;       // 功能唯一标识，如 "merge"
    name: string;     // 功能名称
    icon: string;     // Lucide 图标名（见图标注册表）
    path: string;     // 路由路径，如 "/merge"
    addedAt: number;  // 收藏时间戳
  };
  ```
- **操作**：右键任意侧边栏工具项 → 「添加到收藏夹」；收藏夹中右键 → 「取消收藏」
- **排序**：按 `addedAt` 倒序（最新收藏在前）
- **上限**：最多 12 个
- **空状态**：显示提示文本「点击工具右键可添加收藏」
- **默认收藏**（首次使用预置）：
  ```ts
  const DEFAULT_FAVORITES: Favorite[] = [
    { id: "merge", name: "合并 PDF", icon: "FilePlus2", path: "/merge", addedAt: 0 },
    { id: "split", name: "分割 PDF", icon: "Scissors", path: "/split", addedAt: 0 },
    { id: "compress", name: "压缩 PDF", icon: "FileDown", path: "/compress", addedAt: 0 },
    { id: "pdf-to-word", name: "PDF 转 Word", icon: "FileType", path: "/pdf-to-word", addedAt: 0 },
  ];
  ```

### 2.7 最近使用规范

- **数据存储**：`localStorage`，key 为 `pdf-master-recent-tools`
- **数据结构**：
  ```ts
  type RecentTool = {
    id: string;
    name: string;
    icon: string;
    path: string;
    lastUsedAt: number; // 最后使用时间戳
  };
  ```
- **触发**：每次进入工具页面时记录/更新
- **显示**：最多 5 个，按 `lastUsedAt` 倒序
- **去重**：同一工具只保留最新一条记录

### 2.8 侧边栏导航数据结构

```ts
interface NavGroup {
  id: string;            // 分组唯一标识
  name: string;          // 显示名称（i18n key）
  icon: string;          // Lucide 图标名（见图标注册表）
  defaultExpanded: boolean; // 是否默认展开
  tools: NavTool[];
}

interface NavTool {
  id: string;
  name: string;          // i18n key
  icon: string;          // Lucide 图标名（见图标注册表）
  path: string;
  description?: string;  // 用于搜索匹配（i18n key）
}
```

**完整导航配置**（见 `src/config/navigation.jsx`）：

```jsx
const NAV_GROUPS = [
  {
    id: "view-annotate",
    name: "nav.viewAnnotate",       // 阅读与批注
    icon: "BookOpen",
    defaultExpanded: true,
    tools: [
      { id: "viewer", name: "common.viewer", icon: "BookOpen", path: "/viewer", description: "nav.viewerDesc" },
      { id: "annotate", name: "common.annotate", icon: "Highlighter", path: "/annotate", description: "nav.annotateDesc" },
      { id: "signature", name: "common.signature", icon: "PenTool", path: "/signature", description: "nav.signatureDesc" },
      { id: "bookmark", name: "common.bookmark", icon: "Bookmark", path: "/bookmark", description: "nav.bookmarkDesc" },
    ],
  },
  {
    id: "edit-extract",
    name: "nav.editExtract",        // 编辑与提取
    icon: "PencilLine",
    defaultExpanded: false,
    tools: [
      { id: "edit", name: "common.edit", icon: "PencilLine", path: "/edit", description: "nav.editDesc" },
      { id: "crop", name: "common.crop", icon: "Crop", path: "/crop", description: "nav.cropDesc" },
      { id: "extract", name: "common.extract", icon: "FileImage", path: "/extract", description: "nav.extractDesc" },
      { id: "text", name: "common.text", icon: "Type", path: "/text", description: "nav.textDesc" },
      { id: "pagenum", name: "common.pagenum", icon: "Hash", path: "/pagenum", description: "nav.pagenumDesc" },
      { id: "watermark", name: "common.watermark", icon: "Droplet", path: "/watermark", description: "nav.watermarkDesc" },
    ],
  },
  {
    id: "convert",
    name: "nav.convert",            // 格式转换
    icon: "RefreshCw",
    defaultExpanded: false,
    tools: [
      { id: "image-to-pdf", name: "common.imageToPdf", icon: "ImagePlus", path: "/image-to-pdf", description: "nav.imageToPdfDesc" },
      { id: "pdf-to-image", name: "common.pdfToImage", icon: "Image", path: "/pdf-to-image", description: "nav.pdfToImageDesc" },
      { id: "pdf-to-word", name: "common.pdfToWord", icon: "FileType", path: "/pdf-to-word", description: "nav.pdfToWordDesc" },
      { id: "pdf-to-excel", name: "common.pdfToExcel", icon: "FileSpreadsheet", path: "/pdf-to-excel", description: "nav.pdfToExcelDesc" },
      { id: "ocr", name: "common.ocr", icon: "Scan", path: "/ocr", description: "nav.ocrDesc" },
    ],
  },
  {
    id: "merge-batch",
    name: "nav.mergeBatch",         // 合并与批量
    icon: "Layers",
    defaultExpanded: false,
    tools: [
      { id: "merge", name: "common.merge", icon: "FilePlus2", path: "/merge", description: "nav.mergeDesc" },
      { id: "split", name: "common.split", icon: "Scissors", path: "/split", description: "nav.splitDesc" },
      { id: "batch", name: "common.batch", icon: "Layers", path: "/batch", description: "nav.batchDesc" },
      { id: "batch-rename", name: "common.batchRename", icon: "FileEdit", path: "/batch-rename", description: "nav.batchRenameDesc" },
    ],
  },
  {
    id: "security-organize",
    name: "nav.securityOrganize",   // 安全与整理
    icon: "ShieldCheck",
    defaultExpanded: false,
    tools: [
      { id: "encrypt", name: "common.encrypt", icon: "Lock", path: "/encrypt", description: "nav.encryptDesc" },
      { id: "compress", name: "common.compress", icon: "FileDown", path: "/compress", description: "nav.compressDesc" },
      { id: "watermark-remove", name: "common.watermarkRemove", icon: "Eraser", path: "/watermark-remove", description: "nav.watermarkRemoveDesc" },
      { id: "metadata", name: "common.metadata", icon: "FileCog", path: "/metadata", description: "nav.metadataDesc" },
      { id: "print", name: "common.print", icon: "Printer", path: "/print", description: "nav.printDesc" },
      { id: "form-create", name: "common.formCreate", icon: "ListChecks", path: "/form-create", description: "nav.formCreateDesc" },
      { id: "form", name: "common.form", icon: "FileEdit", path: "/form", description: "nav.formDesc" },
      { id: "compare", name: "common.compare", icon: "GitCompare", path: "/compare", description: "nav.compareDesc" },
    ],
  },
];
```

### 2.9 图标注册表

由于现有代码直接导入 Lucide 组件，而导航配置用字符串表示图标，需新增 **图标注册表** 统一映射：

**文件路径**：`src/config/iconRegistry.jsx`

```jsx
import {
  BookOpen, Highlighter, PenTool, Bookmark,
  PencilLine, Crop, FileImage, Type, Hash, Droplet,
  ImagePlus, Image, FileType, FileSpreadsheet, Scan,
  FilePlus2, Scissors, Layers, FileEdit,
  Lock, FileDown, Eraser, FileCog, Printer, ListChecks, GitCompare,
  RefreshCw, ShieldCheck, Search, Star, Clock, Settings,
  Home, ChevronDown, ArrowRight, X,
} from 'lucide-react';

const iconRegistry = {
  BookOpen, Highlighter, PenTool, Bookmark,
  PencilLine, Crop, FileImage, Type, Hash, Droplet,
  ImagePlus, Image, FileType, FileSpreadsheet, Scan,
  FilePlus2, Scissors, Layers, FileEdit,
  Lock, FileDown, Eraser, FileCog, Printer, ListChecks, GitCompare,
  RefreshCw, ShieldCheck, Search, Star, Clock, Settings,
  Home, ChevronDown, ArrowRight, X,
};

export function getIcon(name) {
  return iconRegistry[name] || BookOpen; // 默认回退
}

export default iconRegistry;
```

**使用方式**：
```jsx
import { getIcon } from '@/config/iconRegistry';
const Icon = getIcon(item.icon);
<Icon className="h-[18px] w-[18px]" />
```

> 注意：图标名必须与 Lucide React 实际导出一致（PascalCase），如 `FilePlus2`、`FileImage`、`FileCog`、`FileEdit`、`FileSpreadsheet`。

---

## 三、首页重构

### 3.1 页面结构

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌──────────────────────────────────────┐ │
│  │          │  │  搜索区域（醒目）                     │ │
│  │          │  │  [🔍 搜索功能，如：合并、压缩...]    │ │
│  │          │  ├──────────────────────────────────────┤ │
│  │  侧边栏  │  │  快捷操作（6 个场景卡片，横向排列）  │ │
│  │  (240px) │  ├──────────────────────────────────────┤ │
│  │          │  │  工具分类（5 个分类卡片，网格布局）   │ │
│  │          │  ├──────────────────────────────────────┤ │
│  │          │  │  最近文件（列表，最多 5 个）          │ │
│  └──────────┘  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 3.2 搜索区域

- **组件**：大尺寸搜索输入框，居中或撑满内容区宽度（max-width: 640px）
- **高度**：48px，圆角 8px
- **占位文本**：`"搜索功能，如：合并、压缩、转Word..."`
- **右侧**：显示 `Ctrl+K` 快捷键标签（Badge 样式）
- **背景**：`bg-card`，`border border-border`
- **图标**：左侧搜索图标（`Search`，16px，`text-muted-foreground`）
- **行为**：
  - 输入时实时过滤（debounce 200ms），下拉显示匹配结果
  - 结果格式：图标 + 功能名 + 所属分类标签
  - 点击结果项跳转对应路由
  - `Esc` 关闭下拉
  - 无结果时显示「未找到匹配功能」

### 3.3 快捷操作区域

**布局**：6 个卡片，横向排列，`grid grid-cols-3 gap-4`（桌面端）

**卡片结构**：

```jsx
const QUICK_ACTIONS = [
  { id: "merge", title: "home.quickMerge", desc: "home.quickMergeDesc", icon: "FilePlus2", path: "/merge" },
  { id: "split", title: "home.quickSplit", desc: "home.quickSplitDesc", icon: "Scissors", path: "/split" },
  { id: "convert", title: "home.quickConvert", desc: "home.quickConvertDesc", icon: "RefreshCw", path: "/image-to-pdf" },
  { id: "compress", title: "home.quickCompress", desc: "home.quickCompressDesc", icon: "FileDown", path: "/compress" },
  { id: "watermark", title: "home.quickWatermark", desc: "home.quickWatermarkDesc", icon: "Droplet", path: "/watermark" },
  { id: "encrypt", title: "home.quickEncrypt", desc: "home.quickEncryptDesc", icon: "Lock", path: "/encrypt" },
];
```

**卡片样式**：
- `bg-card border border-border rounded-lg p-4`
- 图标区域：`w-10 h-10 rounded-md bg-primary/10 text-primary` 居中
- 标题：`text-sm font-medium text-foreground`
- 描述：`text-xs text-muted-foreground mt-1`
- hover：`border-primary/30` 边框高亮 + `translateY(-1px)` 轻微上移
- cursor: pointer，整个卡片可点击

### 3.4 工具分类区域

**布局**：5 个分类卡片，`grid grid-cols-2 lg:grid-cols-3 gap-4`

**卡片样式**：
- `bg-card border border-border rounded-lg p-5`
- 图标：`w-12 h-12 rounded-lg bg-primary/8 text-primary`
- 分类名：`text-base font-medium text-foreground mt-3`
- 工具数量：`text-xs text-muted-foreground`，如「6 个工具」
- 工具标签列表：`flex flex-wrap gap-2 mt-3`，每个标签 `text-xs px-2 py-1 rounded bg-muted text-muted-foreground`
- 底部：「查看全部 →」链接，`text-xs text-primary`
- hover：同快捷操作卡片

**数据来源**：直接复用 `NAV_GROUPS`，过滤掉工具列表，只取分组信息。点击分类卡片可展开该分组对应工具，或滚动到侧边栏对应分组。

### 3.5 最近文件区域

**布局**：单列列表，带标题「最近文件」

**列表行结构**：
- 文件图标（`FileText`，`text-muted-foreground`）
- 文件名（`text-sm font-medium text-foreground`）
- 文件大小（`text-xs text-muted-foreground`）
- 打开时间（`text-xs text-muted-foreground`）
- 行高：56px，`hover:bg-muted/50`
- 点击：打开文件（进入 viewer 页面）

**数据**：复用现有的最近文件逻辑（`HomePage.jsx` 中已有 `getHistory`），最多显示 5 个

---

## 四、组件改造清单

### 4.1 需要新建的组件

| 组件 | 路径 | 说明 |
|------|------|------|
| `SearchBar` | `@/components/SearchBar.jsx` | 全局搜索输入框 + 下拉结果列表 |
| `SearchResults` | `@/components/SearchResults.jsx` | 搜索结果下拉面板 |
| `QuickActions` | `@/components/QuickActions.jsx` | 首页快捷操作卡片网格 |
| `CategoryCards` | `@/components/CategoryCards.jsx` | 首页工具分类卡片网格 |
| `CollapsibleGroup` | `@/components/CollapsibleGroup.jsx` | 侧边栏可折叠分组 |
| `FavoritesList` | `@/components/FavoritesList.jsx` | 收藏夹工具列表 |
| `RecentTools` | `@/components/RecentTools.jsx` | 最近使用工具列表 |

> 所有新组件统一使用 `.jsx` 后缀，与现有项目保持一致。

### 4.2 需要新建的 Hooks

| Hook | 路径 | 说明 |
|------|------|------|
| `useFavorites` | `@/hooks/useFavorites.jsx` | 收藏夹 CRUD（localStorage） |
| `useRecentTools` | `@/hooks/useRecentTools.jsx` | 最近使用工具记录（localStorage） |
| `useSearch` | `@/hooks/useSearch.jsx` | 搜索过滤逻辑 |
| `useKeyboardShortcut` | `@/hooks/useKeyboardShortcut.jsx` | 全局快捷键（Ctrl+K 等） |

> 所有新 Hook 统一使用 `.jsx` 后缀。

### 4.3 需要新建的配置文件

| 文件 | 路径 | 说明 |
|------|------|------|
| `navigation` | `@/config/navigation.jsx` | `NAV_GROUPS` 导航配置 |
| `iconRegistry` | `@/config/iconRegistry.jsx` | 图标字符串→Lucide 组件映射 |

### 4.4 需要修改的文件

| 文件 | 改动 |
|------|------|
| `App.jsx` | 重写侧边栏：从硬编码分组改为 `NAV_GROUPS` 配置驱动；添加搜索框、收藏夹、最近使用区域；注册 `Ctrl+K` 快捷键 |
| `HomePage.jsx` | 重写页面结构：移除全工具列表，改为搜索 + 快捷操作 + 分类卡片 + 最近文件 |
| `useShortcuts.jsx` | 添加 `Ctrl+K` 快捷键绑定（唤起搜索） |
| `ContextMenu.jsx` | 添加「添加到收藏夹」/「取消收藏」右键菜单项 |
| `main.jsx` | 添加数据迁移逻辑（预置默认收藏） |

### 4.5 不需要改动的文件

- 所有 27 个工具页面（`ViewerPage`、`MergePage` 等）——路由路径和页面内容不变
- `PageHeader.jsx` 组件
- `DragDropProvider.jsx` 拖拽组件
- `SettingsPage.jsx` 设置页面
- `useTheme.js`、`useLocale.jsx`、`useFileSelector.jsx`、`useDragDrop.js` hooks

---

## 五、交互规范补充

### 5.1 全局搜索交互

```
用户按 Ctrl+K
  → 搜索框 focus（展开态）或弹出浮动面板（收起态）
  → 输入文字
  → 实时过滤（debounce 200ms）
  → 显示下拉结果
  → 上下键选择 / Enter 确认 / Esc 关闭
  → 点击结果跳转路由
```

### 5.2 侧边栏分组展开/收起

- 点击分组标题 → 切换展开/收起状态
- 展开状态记录到 `localStorage`（key: `pdf-master-sidebar-expanded`）
- 格式：`{ "view-annotate": true, "edit-extract": false, ... }`
- 收起模式下侧边栏不显示分组内容，只显示分组图标
- **「阅读与批注」和「编辑与提取」默认视觉相邻**，中间不加分隔线，强化"阅读+编辑一体化"认知

### 5.3 右键菜单扩展

在现有 `ContextMenu` 中添加：

```jsx
// 工具项右键菜单
const toolContextMenuItems = [
  { label: t.common.open || '打开', action: () => navigate(tool.path) },
  { type: "separator" },
  { label: isFavorited ? (t.common.removeFavorite || '取消收藏') : (t.common.addFavorite || '添加到收藏夹'), action: toggleFavorite },
];
```

---

## 六、数据迁移

首次加载时检查 localStorage 中是否存在旧版数据 key，执行一次性迁移：

```jsx
// 迁移逻辑（在 main.jsx 初始化时执行）
function migrateData() {
  const favorites = localStorage.getItem('pdf-master-favorites');
  if (!favorites) {
    // 首次使用，写入默认收藏
    localStorage.setItem('pdf-master-favorites', JSON.stringify(DEFAULT_FAVORITES));
  }
  // 最近使用无需预置
}
```

---

## 七、样式规范

沿用现有 shadcn + Tailwind 设计系统，关键约束：

- **主色**：`hsl(221, 83%, 53%)`（现有 `--primary`）
- **卡片**：`bg-card border border-border rounded-lg`，不使用 `shadow`
- **圆角**：统一 `rounded-lg`（0.5rem / 8px）
- **间距**：分组间距 `gap-4`（16px），区块间距 `gap-6`（24px）
- **图标**：Lucide React，尺寸 16px（行内）/ 20px（卡片内）/ 24px（区域标题）
- **文字层级**：
  - 区域标题：`text-lg font-semibold`
  - 卡片标题：`text-sm font-medium`
  - 辅助文字：`text-xs text-muted-foreground`
- **交互反馈**：hover 边框高亮 `border-primary/30`，过渡 `transition-colors duration-150`

---

## 八、多语言规划

所有新增文案需接入现有 `useTranslations` hook，在 `nav` 命名空间下新增翻译 key。

### 8.1 新增分组名翻译 key

| key | zh-CN | en-US |
|-----|-------|-------|
| `nav.viewAnnotate` | 阅读与批注 | View & Annotate |
| `nav.editExtract` | 编辑与提取 | Edit & Extract |
| `nav.convert` | 格式转换 | Convert |
| `nav.mergeBatch` | 合并与批量 | Merge & Batch |
| `nav.securityOrganize` | 安全与整理 | Security & Organize |

### 8.2 新增搜索/收藏/最近使用翻译 key

| key | zh-CN | en-US |
|-----|-------|-------|
| `common.search` | 搜索功能，如：合并、压缩、转Word... | Search tools, e.g. merge, compress... |
| `common.favorites` | 收藏夹 | Favorites |
| `common.recentTools` | 最近使用 | Recent |
| `common.addFavorite` | 添加到收藏夹 | Add to Favorites |
| `common.removeFavorite` | 取消收藏 | Remove from Favorites |
| `common.noFavorites` | 点击工具右键可添加收藏 | Right-click a tool to add it here |
| `common.noResults` | 未找到匹配功能 | No matching tools found |
| `common.toolCount` | 个工具 | tools |

### 8.3 首页快捷操作翻译 key

| key | zh-CN | en-US |
|-----|-------|-------|
| `home.quickMerge` | 合并 PDF | Merge PDF |
| `home.quickMergeDesc` | 将多个文件合并为一个 | Combine multiple files into one |
| `home.quickSplit` | 分割 PDF | Split PDF |
| `home.quickSplitDesc` | 按页码范围拆分文件 | Split by page ranges |
| `home.quickConvert` | 转换格式 | Convert Format |
| `home.quickConvertDesc` | PDF 与 Word/Excel/图片互转 | Convert between PDF and other formats |
| `home.quickCompress` | 压缩 PDF | Compress PDF |
| `home.quickCompressDesc` | 减小文件体积 | Reduce file size |
| `home.quickWatermark` | 添加水印 | Add Watermark |
| `home.quickWatermarkDesc` | 批量添加文字或图片水印 | Add text or image watermarks |
| `home.quickEncrypt` | 加密保护 | Encrypt |
| `home.quickEncryptDesc` | 为文件添加密码保护 | Add password protection |

### 8.4 翻译降级策略

沿用现有模式 `t.xxx || '中文回退'`，确保即使翻译缺失也能正常显示。

---

## 九、实施优先级

### Phase 1（核心体验，建议优先实现）

1. **全局搜索** `Ctrl+K` — 立刻解决工具查找痛点
2. **侧边栏分组重构** — 按 `NAV_GROUPS` 配置重写导航数据，采用新的意图分组
3. **首页精简** — 移除全工具列表，改为搜索 + 快捷操作 + 分类卡片

### Phase 2（个性化体验）

4. **收藏夹** — `useFavorites` hook + 侧边栏收藏区域
5. **最近使用** — `useRecentTools` hook + 侧边栏最近区域
6. **右键菜单扩展** — 添加/取消收藏

### Phase 3（体验打磨）

7. **搜索框首次引导动画** — 搜索框微妙 pulse 提示
8. **分组展开状态持久化**
9. **空状态设计** — 收藏夹空、搜索无结果
10. **阅读器集成编辑入口**（未来）— 在 ViewerPage 工具栏集成批注、转换、压缩等快捷入口，真正实现 Adobe 式阅读+编辑一体化

---

## 十、文件结构参考

```
src/
├── config/
│   ├── navigation.jsx          # 新增：NAV_GROUPS 配置
│   └── iconRegistry.jsx        # 新增：图标字符串→组件映射
├── components/
│   ├── ui/                     # 现有 shadcn 组件（不变）
│   ├── SearchBar.jsx           # 新增
│   ├── SearchResults.jsx       # 新增
│   ├── QuickActions.jsx        # 新增
│   ├── CategoryCards.jsx       # 新增
│   ├── CollapsibleGroup.jsx    # 新增
│   ├── FavoritesList.jsx       # 新增
│   ├── RecentTools.jsx         # 新增
│   ├── PageHeader.jsx          # 不变
│   ├── ContextMenu.jsx         # 修改（添加收藏菜单项）
│   └── DragDropProvider.jsx    # 不变
├── hooks/
│   ├── useLocale.jsx           # 不变
│   ├── useTheme.js             # 不变
│   ├── useShortcuts.jsx        # 修改（添加 Ctrl+K）
│   ├── useFileSelector.js      # 不变
│   ├── useDragDrop.js          # 不变
│   ├── useFavorites.jsx        # 新增
│   ├── useRecentTools.jsx      # 新增
│   ├── useSearch.jsx           # 新增
│   └── useKeyboardShortcut.jsx # 新增
├── pages/
│   ├── HomePage.jsx            # 重写
│   ├── ViewerPage.jsx          # 不变
│   ├── MergePage.jsx           # 不变
│   ├── ... (其余 25 个页面不变)
│   └── SettingsPage.jsx        # 不变
├── i18n/locales/
│   ├── zh-CN.js                # 修改（新增 nav 分组名、搜索、收藏等 key）
│   └── en-US.js                # 修改（同上）
├── App.jsx                     # 修改（重写侧边栏 + 注册 Ctrl+K）
└── main.jsx                    # 修改（添加数据迁移）
```

---

## 十一、分组对照速查（原始→新）

| 原分组 | 原功能 | 新分组 |
|--------|--------|--------|
| 核心 | 阅读 PDF | 阅读与批注 |
| 核心 | 合并 | 合并与批量 |
| 核心 | 分割 | 合并与批量 |
| 核心 | 编辑 | 编辑与提取 |
| 格式转换 | 图片转PDF | 格式转换 |
| 格式转换 | PDF转图片 | 格式转换 |
| 格式转换 | PDF转Word | 格式转换 |
| 格式转换 | PDF转Excel | 格式转换 |
| 工具集 | 压缩 | 安全与整理 |
| 工具集 | 提取 | 编辑与提取 |
| 工具集 | 文本 | 编辑与提取 |
| 工具集 | 水印 | 编辑与提取 |
| 工具集 | 页码 | 编辑与提取 |
| 工具集 | 元数据 | 安全与整理 |
| 工具集 | 加密 | 安全与整理 |
| 工具集 | 打印 | 安全与整理 |
| 效率 | 批量处理 | 合并与批量 |
| 效率 | 比较 | 安全与整理 |
| 效率 | OCR | 格式转换 |
| 效率 | 水印去除 | 安全与整理 |
| 效率 | 批注 | 阅读与批注 |
| 效率 | 签名 | 阅读与批注 |
| 效率 | 表单创建 | 安全与整理 |
| 效率 | 批量重命名 | 合并与批量 |
| 效率 | 表单 | 安全与整理 |
| 效率 | 书签 | 阅读与批注 |
| 效率 | 裁剪 | 编辑与提取 |

合计：27 个工具，全部覆盖。

---

*文档版本：v2.0（重构方案）*
