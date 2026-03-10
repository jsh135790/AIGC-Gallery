# AIGC Gallery
<div align="center">
**A powerful local AI-generated image management tool**
![Preview Image](https://files.catbox.moe/osg7r1.png)
[English](#english) | [中文](#中文)
</div>

---

## English

### Overview

AIGC Gallery is a feature-rich, privacy-focused desktop application for managing your AI-generated images. Built with modern web technologies, it runs entirely in your browser with no backend required - all your data stays on your device.

### Key Features

#### 🖼️ **Multi-Format Metadata Support**
- **Stable Diffusion WebUI** - Full parameter parsing and editing
- **NovelAI** - Including v4 character prompt support
- **ComfyUI** - Workflow and API format recognition

#### 📁 **Smart Organization**
- Create custom folders to organize your images
- Tag-based filtering and search
- Favorites and rating system
- Bulk operations support

#### 🎨 **Artist Prompt Library**
- Save and manage reusable prompt templates
- Attach sample images to prompts
- Category and rating organization
- Import/export prompt collections

#### 🛠️ **Powerful Toolbox**
- **Metadata Editor** - Edit prompts and parameters directly in PNG files
- **Prompt Converter** - Convert between SD and NAI formats
- **Batch Processing** - Handle multiple images at once

#### 🌐 **Bilingual Interface**
- Full support for English and Chinese
- Auto-detect system language
- Easy language switching

#### 🔒 **Privacy First**
- 100% client-side processing
- No data uploaded to servers
- All images stored locally in IndexedDB

### Technology Stack

- **Vue 3** + TypeScript + Vite
- **Pinia** for state management
- **Dexie.js** for IndexedDB operations
- **Tailwind CSS v4** + shadcn-vue components
- **ExifReader** for metadata parsing

### Installation

#### Option 1: Use Pre-built Release
1. Download the latest release from [Releases](../../releases)
2. Extract the archive
3. Open `index.html` in a modern browser (Chrome, Edge, Firefox)

#### Option 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/yourusername/AIGC-Gallery.git
cd AIGC-Gallery

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Usage

#### Import Images
1. Navigate to **AIGC Manager** page
2. Drag and drop images or click to select files
3. Metadata is automatically parsed and extracted
4. Organize images into folders and add tags

#### Manage Artist Prompts
1. Go to **Artist Gallery** page
2. Click "Add Artist" to create a new prompt template
3. Fill in prompts, parameters, and upload sample images
4. Use search and filters to find prompts quickly

#### Edit Metadata
1. Open **Toolbox** page
2. Select **Metadata Editor**
3. Upload an image (SD or NAI format)
4. Edit prompts and parameters
5. Export modified PNG with updated metadata

### Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

IndexedDB and modern JavaScript features required.

### Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### License

GPL-3.0 License - see [LICENSE](LICENSE) file for details.

### Acknowledgments

- [shadcn-vue](https://www.shadcn-vue.com/) for UI components
- [Dexie.js](https://dexie.org/) for IndexedDB wrapper
- [ExifReader](https://github.com/mattiasw/ExifReader) for metadata parsing

---

## 中文

### 项目简介

AIGC Gallery 是一款功能强大、注重隐私的本地 AI 图片管理工具。采用现代 Web 技术构建，完全在浏览器中运行，无需后端服务器 - 所有数据都保存在您的设备上。

### 核心功能

#### 🖼️ **多格式元数据支持**
- **Stable Diffusion WebUI** - 完整参数解析和编辑
- **NovelAI** - 包含 v4 角色提示词支持
- **ComfyUI** - 工作流和 API 格式识别

#### 📁 **智能分类管理**
- 创建自定义文件夹整理图片
- 基于标签的筛选和搜索
- 收藏和评分系统
- 批量操作支持

#### 🎨 **画师提示词库**
- 保存和管理可复用的提示词模板
- 为提示词附加示例图片
- 分类和评分整理
- 导入/导出提示词集合

#### 🛠️ **强大工具箱**
- **元数据编辑器** - 直接编辑 PNG 文件中的提示词和参数
- **提示词转换器** - 在 SD 和 NAI 格式间转换
- **批量处理** - 同时处理多张图片

#### 🌐 **双语界面**
- 完整支持中英文
- 自动检测系统语言
- 便捷的语言切换

#### 🔒 **隐私优先**
- 100% 客户端处理
- 不上传任何数据到服务器
- 所有图片本地存储在 IndexedDB

### 技术栈

- **Vue 3** + TypeScript + Vite
- **Pinia** 状态管理
- **Dexie.js** IndexedDB 操作
- **Tailwind CSS v4** + shadcn-vue 组件
- **ExifReader** 元数据解析

### 安装使用

#### 方式一：使用预构建版本
1. 从 [Releases](../../releases) 下载最新版本
2. 解压压缩包
3. 在现代浏览器中打开 `index.html`（推荐 Chrome、Edge、Firefox）

#### 方式二：从源码构建
```bash
# 克隆仓库
git clone https://github.com/yourusername/AIGC-Gallery.git
cd AIGC-Gallery

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 使用指南

#### 导入图片
1. 进入 **AIGC 管理** 页面
2. 拖拽图片或点击选择文件
3. 元数据自动解析和提取
4. 将图片整理到文件夹并添加标签

#### 管理画师提示词
1. 进入 **画师图库** 页面
2. 点击"添加画师"创建新的提示词模板
3. 填写提示词、参数并上传示例图片
4. 使用搜索和筛选快速查找提示词

#### 编辑元数据
1. 打开 **工具箱** 页面
2. 选择 **元数据编辑器**
3. 上传图片（SD 或 NAI 格式）
4. 编辑提示词和参数
5. 导出带有更新元数据的 PNG 文件

### 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

需要支持 IndexedDB 和现代 JavaScript 特性。

### 贡献

欢迎贡献代码！请随时提交 Issue 或 Pull Request。

### 开源协议

GPL-3.0 License - 详见 [LICENSE](LICENSE) 文件。

### 致谢

- [shadcn-vue](https://www.shadcn-vue.com/) 提供 UI 组件
- [Dexie.js](https://dexie.org/) 提供 IndexedDB 封装
- [ExifReader](https://github.com/mattiasw/ExifReader) 提供元数据解析
