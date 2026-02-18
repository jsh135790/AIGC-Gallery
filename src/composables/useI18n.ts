import { ref, computed, watch } from 'vue'

export type Locale = 'zh-CN' | 'en'

// Detect system language
function detectSystemLocale(): Locale {
  try {
    const lang = navigator.language || (navigator as any).userLanguage || 'zh-CN'
    // Check if starts with 'zh' for Chinese
    if (lang.startsWith('zh')) {
      return 'zh-CN'
    }
    return 'en'
  } catch {
    return 'zh-CN'
  }
}

// Get stored locale or detect from system
function getInitialLocale(): Locale {
  const stored = localStorage.getItem('locale') as Locale | null
  if (stored && (stored === 'zh-CN' || stored === 'en')) {
    return stored
  }
  return detectSystemLocale()
}

// Global reactive locale state
const currentLocale = ref<Locale>(getInitialLocale())

// Translation messages
const messages: Record<Locale, Record<string, string>> = {
  'zh-CN': {
    // Navigation
    'nav.artistGallery': '画师串画廊',
    'nav.aigcManager': 'AIGC 图库',
    'nav.about': '关于',

    // About dialog
    'about.title': '关于 AIGC Gallery',
    'about.description': '本地 AI 生成图片管理工具',
    'about.feedbackGroup': '反馈/交流群：',

    // Common
    'common.search': '搜索',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.delete': '删除',
    'common.create': '创建',
    'common.edit': '编辑',
    'common.close': '关闭',
    'common.confirm': '确认',
    'common.all': '全部',
    'common.favorites': '收藏',
    'common.more': '更多',
    'common.sort': '排序',
    'common.select': '选择',
    'common.exit': '退出',
    'common.selectAll': '全选',
    'common.deselectAll': '取消全选',
    'common.rename': '重命名',

    // Artist Gallery
    'artist.searchPlaceholder': '搜索画师名称、画师串或标签...',
    'artist.allCategories': '全部分类',
    'artist.exportFavorites': '导出收藏',
    'artist.importData': '导入数据',
    'artist.sortByName': '按名称排序',
    'artist.sortByRating': '按评分排序',
    'artist.sortByTime': '按时间排序',
    'artist.addArtist': '添加画师',
    'artist.editArtist': '编辑画师',
    'artist.deleteArtist': '删除画师',
    'artist.totalCount': '共 {count} 位画师',
    'artist.searchResult': '（搜索: "{query}"）',
    'artist.name': '画师名称',
    'artist.prompt': '画师串',
    'artist.category': '风格分类',
    'artist.rating': '评分',
    'artist.tags': '标签',
    'artist.sampleImage': '示例图片',
    'artist.addSampleImage': '添加示例图',
    'artist.sampleImageHint': '1 张示例图片',
    'artist.tagInputPlaceholder': '输入标签，回车添加',
    'artist.formDescription': '填写画师串信息并上传示例图片',
    'artist.editDescription': '修改画师信息',
    'artist.saveChanges': '保存修改',
    'artist.promptCopied': '画师串已复制',
    'artist.updated': '画师信息已更新',
    'artist.added': '画师已添加',
    'artist.deleted': '画师已删除',
    'artist.exportSuccess': '收藏已导出',
    'artist.importSuccess': '数据导入成功',
    'artist.importFailed': '导入失败，请检查文件格式',

    // Artist categories
    'category.realistic': '写实',
    'category.anime': '二次元',
    'category.semiRealistic': '半写实',
    'category.conceptArt': '概念艺术',
    'category.watercolor': '水彩风',
    'category.oilPainting': '油画风',
    'category.illustration': '插画',
    'category.pixelArt': '像素风',
    'category.other': '其他',

    // AIGC Manager
    'aigc.searchPlaceholder': '搜索文件名、提示词或标签...',
    'aigc.allImages': '全部图片',
    'aigc.uncategorized': '未分类',
    'aigc.imageCount': '{count} 张图片',
    'aigc.uploadHint': '上传图片后将自动解析 SD / NovelAI 元数据',
    'aigc.noResults': '没有找到匹配的图片',
    'aigc.clearSearch': '清除搜索',
    'aigc.continueUpload': '继续上传图片',
    'aigc.continueUploadHint': '拖拽或点击添加更多图片',
    'aigc.filterTags': '筛选标签:',
    'aigc.sortNewest': '最新上传',
    'aigc.sortOldest': '最早上传',
    'aigc.sortFilename': '文件名 A-Z',
    'aigc.deleteSelected': '删除 ({count})',
    'aigc.uploadSuccess': '成功上传 {count} 张图片',
    'aigc.uploadFailed': '处理 {filename} 失败',
    'aigc.deleteSuccess': '已删除 {count} 张图片',

    // Folder Panel
    'folder.categories': '分类目录',
    'folder.newFolder': '新建分类',
    'folder.editFolder': '编辑分类',
    'folder.folderName': '分类名称',
    'folder.folderColor': '标识色',
    'folder.createDescription': '为图片创建一个分类文件夹',

    // Image Detail Panel
    'detail.tags': '标签',
    'detail.noTags': '暂无标签',
    'detail.addTag': '添加标签',
    'detail.moveToFolder': '移动到分类',
    'detail.selectFolder': '选择分类...',
    'detail.deleteImage': '删除图片',
    'detail.favorited': '已收藏',
    'detail.unfavorited': '已取消收藏',
    'detail.imageDeleted': '图片已删除',
    'detail.movedToFolder': '已移动到分类',

    // Metadata Viewer
    'metadata.source': '来源',
    'metadata.prompt': '正向提示词',
    'metadata.negativePrompt': '负向提示词',
    'metadata.characterPrompts': '角色提示词(NAI)',
    'metadata.characterCount': '{count} 个角色',
    'metadata.globalPrompt': '全局正向提示词',
    'metadata.character': '角色 {idx}',
    'metadata.autoPosition': 'AI 自动选择',
    'metadata.parameters': '生成参数',
    'metadata.fileInfo': '文件信息',
    'metadata.filename': '文件名',
    'metadata.addedTime': '添加时间',

    // Drop Zone
    'dropzone.label': '拖拽图片到此处上传',
    'dropzone.sublabel': '或点击选择文件 · 支持 PNG / JPEG / WebP',

    // Theme
    'theme.toggle': '切换主题',
    'theme.light': '浅色',
    'theme.dark': '深色',
    'theme.system': '跟随系统',

    // Language
    'language.zh': '中文',
    'language.en': 'English',
    'language.label': '语言',
  },
  'en': {
    // Navigation
    'nav.artistGallery': 'Artist Gallery',
    'nav.aigcManager': 'AIGC Library',
    'nav.about': 'About',

    // About dialog
    'about.title': 'About AIGC Gallery',
    'about.description': 'Local AI-generated image management tool',
    'about.feedbackGroup': 'Feedback/Discussion:',

    // Common
    'common.search': 'Search',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.create': 'Create',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.all': 'All',
    'common.favorites': 'Favorites',
    'common.more': 'More',
    'common.sort': 'Sort',
    'common.select': 'Select',
    'common.exit': 'Exit',
    'common.selectAll': 'Select All',
    'common.deselectAll': 'Deselect All',
    'common.rename': 'Rename',

    // Artist Gallery
    'artist.searchPlaceholder': 'Search artist name, prompt or tags...',
    'artist.allCategories': 'All Categories',
    'artist.exportFavorites': 'Export Favorites',
    'artist.importData': 'Import Data',
    'artist.sortByName': 'Sort by Name',
    'artist.sortByRating': 'Sort by Rating',
    'artist.sortByTime': 'Sort by Time',
    'artist.addArtist': 'Add Artist',
    'artist.editArtist': 'Edit Artist',
    'artist.deleteArtist': 'Delete Artist',
    'artist.totalCount': '{count} artists',
    'artist.searchResult': ' (Search: "{query}")',
    'artist.name': 'Artist Name',
    'artist.prompt': 'Artist Prompt',
    'artist.category': 'Style Category',
    'artist.rating': 'Rating',
    'artist.tags': 'Tags',
    'artist.sampleImage': 'Sample Image',
    'artist.addSampleImage': 'Add Sample',
    'artist.sampleImageHint': '1 sample image',
    'artist.tagInputPlaceholder': 'Enter tag, press Enter to add',
    'artist.formDescription': 'Fill in artist info and upload sample image',
    'artist.editDescription': 'Edit artist information',
    'artist.saveChanges': 'Save Changes',
    'artist.promptCopied': 'Prompt copied',
    'artist.updated': 'Artist updated',
    'artist.added': 'Artist added',
    'artist.deleted': 'Artist deleted',
    'artist.exportSuccess': 'Favorites exported',
    'artist.importSuccess': 'Data imported successfully',
    'artist.importFailed': 'Import failed, please check file format',

    // Artist categories
    'category.realistic': 'Realistic',
    'category.anime': 'Anime',
    'category.semiRealistic': 'Semi-realistic',
    'category.conceptArt': 'Concept Art',
    'category.watercolor': 'Watercolor',
    'category.oilPainting': 'Oil Painting',
    'category.illustration': 'Illustration',
    'category.pixelArt': 'Pixel Art',
    'category.other': 'Other',

    // AIGC Manager
    'aigc.searchPlaceholder': 'Search filename, prompt or tags...',
    'aigc.allImages': 'All Images',
    'aigc.uncategorized': 'Uncategorized',
    'aigc.imageCount': '{count} images',
    'aigc.uploadHint': 'Metadata from SD / NovelAI will be auto-parsed',
    'aigc.noResults': 'No matching images found',
    'aigc.clearSearch': 'Clear Search',
    'aigc.continueUpload': 'Continue Upload',
    'aigc.continueUploadHint': 'Drag or click to add more images',
    'aigc.filterTags': 'Filter tags:',
    'aigc.sortNewest': 'Newest First',
    'aigc.sortOldest': 'Oldest First',
    'aigc.sortFilename': 'Filename A-Z',
    'aigc.deleteSelected': 'Delete ({count})',
    'aigc.uploadSuccess': 'Successfully uploaded {count} images',
    'aigc.uploadFailed': 'Failed to process {filename}',
    'aigc.deleteSuccess': 'Deleted {count} images',

    // Folder Panel
    'folder.categories': 'Categories',
    'folder.newFolder': 'New Category',
    'folder.editFolder': 'Edit Category',
    'folder.folderName': 'Category Name',
    'folder.folderColor': 'Color',
    'folder.createDescription': 'Create a category folder for images',

    // Image Detail Panel
    'detail.tags': 'Tags',
    'detail.noTags': 'No tags',
    'detail.addTag': 'Add tag',
    'detail.moveToFolder': 'Move to Category',
    'detail.selectFolder': 'Select category...',
    'detail.deleteImage': 'Delete Image',
    'detail.favorited': 'Added to favorites',
    'detail.unfavorited': 'Removed from favorites',
    'detail.imageDeleted': 'Image deleted',
    'detail.movedToFolder': 'Moved to category',

    // Metadata Viewer
    'metadata.source': 'Source',
    'metadata.prompt': 'Prompt',
    'metadata.negativePrompt': 'Negative Prompt',
    'metadata.characterPrompts': 'Character Prompts (NAI)',
    'metadata.characterCount': '{count} characters',
    'metadata.globalPrompt': 'Global Prompt',
    'metadata.character': 'Character {idx}',
    'metadata.autoPosition': 'Auto Position',
    'metadata.parameters': 'Parameters',
    'metadata.fileInfo': 'File Info',
    'metadata.filename': 'Filename',
    'metadata.addedTime': 'Added',

    // Drop Zone
    'dropzone.label': 'Drop images here to upload',
    'dropzone.sublabel': 'Or click to select files · PNG / JPEG / WebP',

    // Theme
    'theme.toggle': 'Toggle theme',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',

    // Language
    'language.zh': '中文',
    'language.en': 'English',
    'language.label': 'Language',
  },
}

// Category mapping for translation
export const CATEGORY_KEYS: Record<string, string> = {
  '写实': 'category.realistic',
  '二次元': 'category.anime',
  '半写实': 'category.semiRealistic',
  '概念艺术': 'category.conceptArt',
  '水彩风': 'category.watercolor',
  '油画风': 'category.oilPainting',
  '插画': 'category.illustration',
  '像素风': 'category.pixelArt',
  '其他': 'category.other',
}

// Reverse mapping for saving
export const CATEGORY_VALUES: Record<string, string> = {
  'category.realistic': '写实',
  'category.anime': '二次元',
  'category.semiRealistic': '半写实',
  'category.conceptArt': '概念艺术',
  'category.watercolor': '水彩风',
  'category.oilPainting': '油画风',
  'category.illustration': '插画',
  'category.pixelArt': '像素风',
  'category.other': '其他',
}

export function useI18n() {
  const locale = currentLocale

  // Translate function with interpolation support
  function t(key: string, params?: Record<string, string | number>): string {
    const msg = messages[locale.value]?.[key] || messages['zh-CN']?.[key] || key
    if (!params) return msg

    return msg.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
  }

  // Set locale and persist
  function setLocale(newLocale: Locale) {
    currentLocale.value = newLocale
    localStorage.setItem('locale', newLocale)
    // Update document lang attribute
    document.documentElement.lang = newLocale === 'zh-CN' ? 'zh' : 'en'
  }

  // Toggle between locales
  function toggleLocale() {
    setLocale(locale.value === 'zh-CN' ? 'en' : 'zh-CN')
  }

  // Translate category (handles both directions)
  function translateCategory(category: string): string {
    // If it's a Chinese category, translate to current locale
    if (CATEGORY_KEYS[category]) {
      return t(CATEGORY_KEYS[category])
    }
    // If it's already a key, translate it
    if (category.startsWith('category.')) {
      return t(category)
    }
    return category
  }

  // Get category value for storage (always Chinese)
  function getCategoryValue(displayOrKey: string): string {
    // If it's a translation key, get the Chinese value
    if (CATEGORY_VALUES[displayOrKey]) {
      return CATEGORY_VALUES[displayOrKey]
    }
    // If it's already Chinese, return as-is
    if (CATEGORY_KEYS[displayOrKey]) {
      return displayOrKey
    }
    // Try to find by translated value
    for (const [zhValue, key] of Object.entries(CATEGORY_KEYS)) {
      if (t(key) === displayOrKey) {
        return zhValue
      }
    }
    return displayOrKey
  }

  const isZh = computed(() => locale.value === 'zh-CN')
  const isEn = computed(() => locale.value === 'en')

  return {
    locale,
    t,
    setLocale,
    toggleLocale,
    translateCategory,
    getCategoryValue,
    isZh,
    isEn,
  }
}

// Initialize document lang on load
if (typeof document !== 'undefined') {
  document.documentElement.lang = currentLocale.value === 'zh-CN' ? 'zh' : 'en'
}
