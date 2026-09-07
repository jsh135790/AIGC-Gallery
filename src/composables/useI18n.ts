import { ref } from 'vue'

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
    'nav.toolbox': '工具箱',
    'nav.about': '关于',

    // About dialog
    'about.title': '关于 AIGC Gallery',
    'about.description': '本地 AI 生成图片管理工具',
    'about.feedbackGroup': '反馈/交流群',
    'about.tabSettings': '功能设置',
    'about.tabAuthor': '关于作者',
    'about.authorEyebrow': '作者',
    'about.homepage': '主页',
    'about.repository': '仓库',
    'about.version': '版本',

    // Settings
    'settings.global': '全局',
    'settings.artistGallery': '画师串画廊',
    'settings.aigcManager': 'AIGC 图库',
    'settings.blurEffect': '模糊效果',
    'settings.accentColor': '主题色',
    'settings.autoFillName': '上传图片自动填入文件名',
    'settings.autoFillPrefix': '自动补充画师串前缀',
    'settings.autoFillPrefixHint': '需先启用「上传图片自动填入文件名」',
    'settings.customPrefix': '自定义画师串前缀',
    'settings.autoParseTags': '上传时自动解析 Tag',

    // Common
    'common.searchPlaceholder': '搜索...',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.delete': '删除',
    'common.create': '创建',
    'common.copy': '复制',
    'common.close': '关闭',
    'common.confirm': '确认',
    'common.favorites': '收藏',
    'common.more': '更多',
    'common.sort': '排序',
    'common.select': '选择',
    'common.exit': '退出',
    'common.selectAll': '全选',
    'common.deselectAll': '取消全选',
    'common.rename': '重命名',
    'common.copied': '已复制',
    'common.toggleSidebar': '切换侧边栏',

    // Artist Gallery
    'artist.searchPlaceholder': '搜索画师名称、画师串或标签...',
    'artist.allCategories': '全部分类',
    'artist.exportFavorites': '导出当前分组',
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
    'artist.exportSuccess': '已导出',
    'artist.exportFailed': '导出失败',
    'artist.importSuccess': '数据导入成功',
    'artist.importFailed': '导入失败，请检查文件格式',
    'artist.copyPrompt': '复制画师串',
    'artist.belongTo': '所属分组',
    'artist.empty': '当前分组还没有画师',
    'artist.emptyHint': '点击下方按钮添加你的第一个画师吧',
    'artist.createFirst': '添加第一个画师',

    // Artist Pages
    'artistPage.title': '分组',
    'artistPage.newPage': '新建分组',
    'artistPage.editPage': '编辑分组',
    'artistPage.deletePage': '删除分组',
    'artistPage.dialogDescription': '为画师创建一个独立分组（例如 NAI / ComfyUI / SD）',
    'artistPage.nameLabel': '分组名称',
    'artistPage.colorLabel': '标识色',
    'artistPage.moveUp': '上移',
    'artistPage.moveDown': '下移',
    'artistPage.deleteConfirm': '删除分组「{name}」？其中的画师将合并到「{target}」。',
    'artistPage.cannotDeleteLast': '至少需要保留一个分组',
    'artistPage.created': '分组已创建',
    'artistPage.renamed': '分组已更新',
    'artistPage.deleted': '分组已删除',

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
    'aigc.uploadHint': '上传图片后将自动解析 SD / NovelAI 元数据 初步支持ComfyUI',
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
    'aigc.uploadPartial': '成功上传 {success} 张图片，{failed} 张处理失败',
    'aigc.uploadAllFailed': '{count} 张图片上传失败',
    'aigc.loadFailed': '图片库加载失败',
    'aigc.deleteSuccess': '已删除 {count} 张图片',
    'aigc.viewGrid': '网格视图',
    'aigc.viewMasonry': '瀑布流视图',

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
    'detail.filterByTag': '按此标签筛选图库',
    'detail.moveToFolder': '移动到分类',
    'detail.selectFolder': '选择分类...',
    'detail.deleteImage': '删除图片',
    'detail.favorited': '已收藏',
    'detail.unfavorited': '已取消收藏',
    'detail.imageDeleted': '图片已删除',
    'detail.movedToFolder': '已移动到分类',
    'lightbox.open': '放大查看图片',
    'lightbox.zoomIn': '放大图片',
    'lightbox.zoomOut': '缩小图片',
    'lightbox.download': '下载原图',
    'lightbox.close': '关闭图片预览',
    'lightbox.description': '全屏图片预览，可缩放或下载原图',

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
    'metadata.nodeTypes': '节点类型 (ComfyUI)',
    'metadata.fileInfo': '文件信息',
    'metadata.filename': '文件名',
    'metadata.addedTime': '添加时间',

    // Drop Zone
    'dropzone.label': '拖拽图片到此处上传',
    'dropzone.sublabel': '或点击选择文件 · 支持 PNG / JPEG / WebP',
    'dropzone.rejected': '拖进来的不是图片文件',

    // Theme
    'theme.toggle': '切换主题',
    'theme.light': '浅色',
    'theme.dark': '深色',
    'theme.system': '跟随系统',

    // Language
    'language.zh': '中文',
    'language.en': 'English',
    'language.label': '语言',

    // Toolbox
    'toolbox.title': '工具箱',
    'toolbox.metadataEditor': '元数据修改',
    'toolbox.metadataEditorDesc': '编辑图片的 AIGC 元数据',
    'toolbox.metadataInspector': '元数据查看器',
    'toolbox.metadataInspectorDesc': '看清图片里真实存在的所有元数据块',
    'toolbox.imgToPrompt': 'IMG to Prompt',
    'toolbox.imgToPromptDesc': '从图片反推生成提示词',
    'toolbox.wip': '功能开发中,敬请期待',

    // Metadata Editor
    'metadata.editor.export': '导出 PNG',
    'metadata.editor.exportFailed': '导出失败',
    'metadata.editor.parseFailed': '无法读取图片元数据',
    'metadata.editor.reset': '重置',
    'metadata.editor.unsupported': '不支持 ComfyUI 格式',
    'metadata.editor.uploadHint': '拖拽或点击上传 PNG 图片',
    'metadata.editor.uploadSublabel': '仅支持 PNG · SD WebUI / NovelAI 可写回',
    'metadata.editor.onlyPng': '仅支持 PNG 格式',
    'metadata.editor.intro': '读出图片里的提示词与生成参数,改完可导出成新 PNG 或回写图库。原始字段逐字保留,只替换你真的改过的那几个;ComfyUI 只能读不能写。',
    // 三栏工作台
    'metadata.editor.meter': '{tags} tags · {chars} 字',
    'metadata.editor.promptPlaceholder': '按逗号分隔的提示词…',
    'metadata.editor.emptyValue': '(空)',
    'metadata.editor.dimensions': '尺寸',
    'metadata.editor.fileSize': '体积',
    'metadata.editor.format': '格式',
    'metadata.editor.noMetadata': '无元数据',
    'metadata.editor.replaceImage': '换图',
    'metadata.editor.noParams': '无参数',
    'metadata.editor.extraFields': '其他字段',
    'metadata.editor.extraFieldsHint': '解析器兜住的字段,导出时逐字保留',
    'metadata.editor.lockedField': '来自独立元数据块,导出时原样保留;在此修改不会写入',
    'metadata.editor.lockedModelNai': 'NovelAI 把模型名放在下方只读的 SOURCE 里,导出时原样保留;此处不可改',
    'metadata.editor.jsonFieldHint': '这个字段的值是 JSON(数组 / 对象),必须填合法 JSON 才会生效,否则保留原值',
    'metadata.editor.diffTitle': '原图对照',
    'metadata.editor.diffClean': '与原始元数据一致',
    'metadata.editor.diffChanged': '已改',
    'metadata.editor.diffDelta': '{n} 字',
    'metadata.editor.revertField': '回退此项',
    'metadata.editor.dirtyCount': '{count} 处改动',
    'metadata.editor.clean': '未修改',
    'metadata.editor.resetDone': '已重置',
    'metadata.editor.writeBack': '回写图库',
    'metadata.editor.writeBackDone': '已回写图库',
    'metadata.editor.writeBackFailed': '回写图库失败',
    'metadata.editor.exportAction': '导出',
    'metadata.editor.exportPng': '导出 PNG · 保真 + 编辑痕迹',
    'metadata.editor.exportAsSd': '以 SD 格式写入并导出',
    'metadata.editor.exportAsNai': '以 NAI 格式写入并导出',
    'metadata.editor.exportNote': '原始字段逐字保留,另写一个 aigc-gallery 痕迹块记录编辑时间。',
    'metadata.editor.nothingToWrite': '没有可写入的元数据,先填提示词或参数',
    'metadata.editor.unsupportedHint': 'ComfyUI 格式不支持写回。提示词可读可复制,但导出与回写图库都不可用。',
    'metadata.editor.bareHint': '这张 PNG 没有元数据。导出前要在「导出」菜单里选目标格式,否则什么都写不进去。',
    'metadata.editor.stealthHint': '元数据藏在 alpha 通道(隐写)。导出只写标准元数据块,隐藏的那一份不会更新,两份会不一致。',
    'metadata.editor.baseCaptionHint': 'v4 全局提示词与顶层 prompt 不一致,导出不会改动 base_caption。',
    'metadata.editor.confirmResetTitle': '放弃 {count} 处改动?',
    'metadata.editor.confirmResetBody': '所有字段回到载入时的原始元数据,此操作不可撤销。',
    'metadata.editor.confirmReplaceTitle': '放弃 {count} 处改动并换图?',
    'metadata.editor.confirmReplaceBody': '当前编辑内容不会保留,换图后从新文件的原始元数据开始。',
    'metadata.editor.clear': '清空',
    'metadata.editor.confirmCloseTitle': '关闭并丢弃 {count} 处改动?',
    'metadata.editor.confirmCloseBody': '图片本身也会一起丢掉 —— 它只活在内存里,没有存进图库。关掉之后要重新拖一次文件。',
    'detail.editMetadata': '编辑元数据',
    'detail.viewRawMetadata': '查看原始元数据',

    // Metadata Inspector — 只读查看器,三层:原始条目 / 解析后字段 / 诊断
    'inspector.modeSingle': '单图检查',
    'inspector.modeLibrary': '全库扫描',
    'inspector.dropLabel': '拖拽或点击上传图片',
    'inspector.dropSublabel': 'PNG 读取全部文本块 · JPEG/WebP/AVIF 仅读 EXIF',
    'inspector.intro': '这里只读不写。它把容器里真实存在的元数据摊开,再告诉你当前解析器接住了哪些、漏掉了哪些 —— 上游改字段名时,先看这里。',
    'inspector.clear': '清空',
    'inspector.partialContainer': '此容器只读取了 EXIF UserComment,未做完整 EXIF / XMP 解析,所以下方条目表不代表文件里的全部元数据。',
    'inspector.parseFailed': '解析失败',
    'inspector.imageMissing': '这张图的原始文件已不在库里',
    // 层 1
    'inspector.rawEntries': '原始元数据块',
    'inspector.noEntries': '没有任何文本块',
    'inspector.emptyKeyword': '(空 keyword)',
    'inspector.emptyPayload': '(空内容)',
    'inspector.unconsumed': '未使用',
    'inspector.unconsumedHint': '这个块的内容没有被任何解析器消费,只保留在原始文本里',
    // 层 2
    'inspector.parsedFields': '解析结果',
    'inspector.noParams': '没有解析出任何参数',
    'inspector.rawText': '原始文本 (rawText)',
    // 层 3
    'inspector.diagnostics': '诊断',
    'inspector.matchedBy': '识别分支',
    'inspector.container': '容器',
    'inspector.entryCount': '元数据块数',
    'inspector.decodeIssues': '解码异常',
    'inspector.unconsumedKeys': '未被消费的键',
    'inspector.unconsumedExplain': '这些键读到了但没进入解析结果。上游改名或新增字段会先出现在这里 —— 需要接住的话,得在解析器里加映射,系统不会替你猜。',
    'inspector.stealthNote': '元数据藏在 alpha 通道(NovelAI 隐写)。标准元数据块里没有这份数据,写回也不会更新它。',
    'inspector.diagnosticsClean': '全部块解码正常,没有被丢弃的键。',
    // 块解码状态
    'inspector.status.ok': '正常',
    'inspector.status.encodingFallback': '编码回退',
    'inspector.status.decompressFailed': '解压失败',
    'inspector.status.malformed': '格式损坏',
    // 识别分支
    'inspector.matched.sdParameters': 'SD · parameters 块',
    'inspector.matched.sdHeuristic': 'SD · 单块推断',
    'inspector.matched.sdConcatenated': 'SD · 多块拼接兜底',
    'inspector.matched.sdExif': 'SD · EXIF UserComment',
    'inspector.matched.naiChunks': 'NovelAI · Description + Comment',
    'inspector.matched.naiStealth': 'NovelAI · alpha 通道隐写',
    'inspector.matched.comfyWorkflow': 'ComfyUI · 完整工作流',
    'inspector.matched.comfyApi': 'ComfyUI · API 格式',
    'inspector.matched.exifUnparsed': 'EXIF UserComment · 未能识别格式',
    'inspector.matched.exifNone': 'EXIF · 没有 UserComment',
    'inspector.matched.none': '未匹配任何已知格式',
    'inspector.matched.unknownContainer': '无法识别的容器格式',
    // 全库扫描
    'inspector.scanTitle': '全库扫描',
    'inspector.scanHint': '逐张重新解析原始文件,与库里存的字段对比。扫描只读,不写任何数据。',
    'inspector.runScan': '开始扫描',
    'inspector.libraryLoading': '正在读取图库…',
    'inspector.libraryEmpty': '图库里还没有图片',
    'inspector.runBackfill': '回补元数据',
    'inspector.backfillSafety': '回补只补不覆盖:只填当前为空的参数、修正原始文本与来源标记。提示词、标签、收藏、文件夹一律不动。',
    'inspector.scanned': '已扫描',
    'inspector.affected': '受影响',
    'inspector.allClean': '所有图片的元数据都与当前解析器一致。',
    'inspector.scanFailed': '扫描失败',
    'inspector.backfillDone': '已回补 {n} 张',
    'inspector.backfillPartial': '已回补 {n} 张,{failed} 张写入失败(详见控制台)',
    'inspector.backfillFailed': '回补失败',
    // 问题类型
    'inspector.issue.decodeFailed': '有块解不开',
    'inspector.issue.encodingFallback': '编码回退',
    'inspector.issue.rawMismatch': '原始文本不一致',
    'inspector.issue.missingParams': '参数缺失',
    'inspector.issue.stealthUnflagged': '隐写未标记',
    'inspector.issue.sourceMismatch': '来源可升级',
    'inspector.issue.missingV4': 'v4 数据缺失',
  },
  'en': {
    // Navigation
    'nav.artistGallery': 'Artist Gallery',
    'nav.aigcManager': 'AIGC Library',
    'nav.toolbox': 'Toolbox',
    'nav.about': 'About',

    // About dialog
    'about.title': 'About AIGC Gallery',
    'about.description': 'Local AI-generated image management tool',
    'about.feedbackGroup': 'Feedback Group',
    'about.tabSettings': 'Settings',
    'about.tabAuthor': 'About Author',
    'about.authorEyebrow': 'Author',
    'about.homepage': 'Homepage',
    'about.repository': 'Repository',
    'about.version': 'Version',

    // Settings
    'settings.global': 'Global',
    'settings.artistGallery': 'Artist Gallery',
    'settings.aigcManager': 'AIGC Library',
    'settings.blurEffect': 'Blur Effect',
    'settings.accentColor': 'Accent Color',
    'settings.autoFillName': 'Auto-fill filename on upload',
    'settings.autoFillPrefix': 'Auto-fill artist prompt prefix',
    'settings.autoFillPrefixHint': 'Requires "Auto-fill filename" to be enabled',
    'settings.customPrefix': 'Custom prompt prefix',
    'settings.autoParseTags': 'Auto-extract tags on upload',

    // Common
    'common.searchPlaceholder': 'Search...',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.create': 'Create',
    'common.copy': 'Copy',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.favorites': 'Favorites',
    'common.more': 'More',
    'common.sort': 'Sort',
    'common.select': 'Select',
    'common.exit': 'Exit',
    'common.selectAll': 'Select All',
    'common.deselectAll': 'Deselect All',
    'common.rename': 'Rename',
    'common.copied': 'Copied',
    'common.toggleSidebar': 'Toggle sidebar',

    // Artist Gallery
    'artist.searchPlaceholder': 'Search artist name, prompt or tags...',
    'artist.allCategories': 'All Categories',
    'artist.exportFavorites': 'Export Current Group',
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
    'artist.exportSuccess': 'Exported',
    'artist.exportFailed': 'Export failed',
    'artist.importSuccess': 'Data imported successfully',
    'artist.importFailed': 'Import failed, please check file format',
    'artist.copyPrompt': 'Copy prompt',
    'artist.belongTo': 'Group',
    'artist.empty': 'No artists in this group yet',
    'artist.emptyHint': 'Click the button below to add your first artist',
    'artist.createFirst': 'Add your first artist',

    // Artist Pages
    'artistPage.title': 'Group',
    'artistPage.newPage': 'New Group',
    'artistPage.editPage': 'Edit Group',
    'artistPage.deletePage': 'Delete Group',
    'artistPage.dialogDescription': 'Create a separate group for artists (e.g. NAI / ComfyUI / SD)',
    'artistPage.nameLabel': 'Group name',
    'artistPage.colorLabel': 'Color',
    'artistPage.moveUp': 'Move left',
    'artistPage.moveDown': 'Move right',
    'artistPage.deleteConfirm': 'Delete group "{name}"? Its artists will be merged into "{target}".',
    'artistPage.cannotDeleteLast': 'At least one group must remain',
    'artistPage.created': 'Group created',
    'artistPage.renamed': 'Group updated',
    'artistPage.deleted': 'Group deleted',

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
    'aigc.uploadHint': 'Metadata from SD / NovelAI will be auto-parsed, initially supports ComfyUI',
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
    'aigc.uploadPartial': 'Uploaded {success} images; {failed} failed',
    'aigc.uploadAllFailed': 'Failed to upload {count} images',
    'aigc.loadFailed': 'Failed to load the image library',
    'aigc.deleteSuccess': 'Deleted {count} images',
    'aigc.viewGrid': 'Grid view',
    'aigc.viewMasonry': 'Masonry view',

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
    'detail.filterByTag': 'Filter library by this tag',
    'detail.moveToFolder': 'Move to Category',
    'detail.selectFolder': 'Select category...',
    'detail.deleteImage': 'Delete Image',
    'detail.favorited': 'Added to favorites',
    'detail.unfavorited': 'Removed from favorites',
    'detail.imageDeleted': 'Image deleted',
    'detail.movedToFolder': 'Moved to category',
    'lightbox.open': 'Open image preview',
    'lightbox.zoomIn': 'Zoom in',
    'lightbox.zoomOut': 'Zoom out',
    'lightbox.download': 'Download original image',
    'lightbox.close': 'Close image preview',
    'lightbox.description': 'Full-screen image preview with zoom and download controls',

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
    'metadata.nodeTypes': 'Node Types (ComfyUI)',
    'metadata.fileInfo': 'File Info',
    'metadata.filename': 'Filename',
    'metadata.addedTime': 'Added',

    // Drop Zone
    'dropzone.label': 'Drop images here to upload',
    'dropzone.sublabel': 'Or click to select files · PNG / JPEG / WebP',
    'dropzone.rejected': 'Those are not image files',

    // Theme
    'theme.toggle': 'Toggle theme',
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',

    // Language
    'language.zh': '中文',
    'language.en': 'English',
    'language.label': 'Language',

    // Toolbox
    'toolbox.title': 'Toolbox',
    'toolbox.metadataEditor': 'Metadata Editor',
    'toolbox.metadataEditorDesc': 'Edit AIGC image metadata',
    'toolbox.metadataInspector': 'Metadata Inspector',
    'toolbox.metadataInspectorDesc': 'See every metadata chunk that actually exists in an image',
    'toolbox.imgToPrompt': 'IMG to Prompt',
    'toolbox.imgToPromptDesc': 'Generate prompts from images',
    'toolbox.wip': 'Under development, stay tuned',

    // Metadata Editor
    'metadata.editor.export': 'Export PNG',
    'metadata.editor.exportFailed': 'Export failed',
    'metadata.editor.parseFailed': 'Failed to read image metadata',
    'metadata.editor.reset': 'Reset',
    'metadata.editor.unsupported': 'ComfyUI format not supported',
    'metadata.editor.uploadHint': 'Drag or click to upload PNG image',
    'metadata.editor.uploadSublabel': 'PNG only · writable for SD WebUI / NovelAI',
    'metadata.editor.onlyPng': 'Only PNG format supported',
    'metadata.editor.intro': 'Reads the prompts and generation parameters out of an image so you can edit them, then export a new PNG or write back to the library. Original fields are kept verbatim — only the ones you actually changed get replaced. ComfyUI is read-only.',
    // Three-pane workbench
    'metadata.editor.meter': '{tags} tags · {chars} chars',
    'metadata.editor.promptPlaceholder': 'Comma-separated prompt…',
    'metadata.editor.emptyValue': '(empty)',
    'metadata.editor.dimensions': 'Dimensions',
    'metadata.editor.fileSize': 'File size',
    'metadata.editor.format': 'Format',
    'metadata.editor.noMetadata': 'No metadata',
    'metadata.editor.replaceImage': 'Replace',
    'metadata.editor.noParams': 'No parameters',
    'metadata.editor.extraFields': 'Other fields',
    'metadata.editor.extraFieldsHint': 'Fields the parser caught — preserved verbatim on export',
    'metadata.editor.lockedField': 'From a separate metadata chunk — preserved as-is; edits here are not written',
    'metadata.editor.lockedModelNai': 'NovelAI stores the model name in the read-only SOURCE field below; it is preserved as-is and cannot be edited here',
    'metadata.editor.jsonFieldHint': 'This value is JSON (an array or object). Only valid JSON is applied — anything else leaves the original value untouched',
    'metadata.editor.diffTitle': 'Compare with original',
    'metadata.editor.diffClean': 'Identical to the original metadata',
    'metadata.editor.diffChanged': 'changed',
    'metadata.editor.diffDelta': '{n} chars',
    'metadata.editor.revertField': 'Revert this field',
    'metadata.editor.dirtyCount': '{count} changes',
    'metadata.editor.clean': 'Unmodified',
    'metadata.editor.resetDone': 'Reset',
    'metadata.editor.writeBack': 'Save to library',
    'metadata.editor.writeBackDone': 'Saved to library',
    'metadata.editor.writeBackFailed': 'Failed to save to library',
    'metadata.editor.exportAction': 'Export',
    'metadata.editor.exportPng': 'Export PNG · faithful + edit trace',
    'metadata.editor.exportAsSd': 'Write as SD format and export',
    'metadata.editor.exportAsNai': 'Write as NAI format and export',
    'metadata.editor.exportNote': 'Original fields are kept verbatim; an extra aigc-gallery chunk records the edit time.',
    'metadata.editor.nothingToWrite': 'Nothing to write — add a prompt or parameters first',
    'metadata.editor.unsupportedHint': 'ComfyUI metadata cannot be written back. Prompts are readable and copyable, but export and save-to-library are unavailable.',
    'metadata.editor.bareHint': 'This PNG has no metadata. Pick a target format in the Export menu, otherwise nothing gets written.',
    'metadata.editor.stealthHint': 'Metadata is hidden in the alpha channel (stealth PNG). Export only writes standard chunks, so the hidden copy stays stale and the two will disagree.',
    'metadata.editor.baseCaptionHint': 'The v4 global prompt differs from the top-level prompt; export will leave base_caption untouched.',
    'metadata.editor.confirmResetTitle': 'Discard {count} changes?',
    'metadata.editor.confirmResetBody': 'Every field returns to the metadata as loaded. This cannot be undone.',
    'metadata.editor.confirmReplaceTitle': 'Discard {count} changes and replace the image?',
    'metadata.editor.confirmReplaceBody': 'The current edits are not kept — the new file starts from its own original metadata.',
    'metadata.editor.clear': 'Clear',
    'metadata.editor.confirmCloseTitle': 'Close and discard {count} changes?',
    'metadata.editor.confirmCloseBody': 'The image goes with them — it only lives in memory and was never saved to the library. You will have to drop the file in again.',
    'detail.editMetadata': 'Edit Metadata',
    'detail.viewRawMetadata': 'View Raw Metadata',

    // Metadata Inspector — read-only, three layers: raw entries / parsed fields / diagnostics
    'inspector.modeSingle': 'Single Image',
    'inspector.modeLibrary': 'Library Scan',
    'inspector.dropLabel': 'Drop or click to upload an image',
    'inspector.dropSublabel': 'PNG reads every text chunk · JPEG/WebP/AVIF read EXIF only',
    'inspector.intro': 'Read-only. It lays out the metadata that actually exists in the container, then tells you which of it the current parser picked up and which it dropped — check here first when an upstream tool renames a field.',
    'inspector.clear': 'Clear',
    'inspector.partialContainer': 'Only the EXIF UserComment tag was read for this container — no full EXIF / XMP parsing — so the entry table below is not everything in the file.',
    'inspector.parseFailed': 'Failed to parse',
    'inspector.imageMissing': 'The original file for this image is no longer in the library',
    // Layer 1
    'inspector.rawEntries': 'Raw Metadata Chunks',
    'inspector.noEntries': 'No text chunks found',
    'inspector.emptyKeyword': '(empty keyword)',
    'inspector.emptyPayload': '(empty payload)',
    'inspector.unconsumed': 'unused',
    'inspector.unconsumedHint': 'No parser consumed this chunk — it only survives in the raw text',
    // Layer 2
    'inspector.parsedFields': 'Parsed Result',
    'inspector.noParams': 'No parameters were parsed',
    'inspector.rawText': 'Raw text (rawText)',
    // Layer 3
    'inspector.diagnostics': 'Diagnostics',
    'inspector.matchedBy': 'Matched by',
    'inspector.container': 'Container',
    'inspector.entryCount': 'Chunk count',
    'inspector.decodeIssues': 'Decode issues',
    'inspector.unconsumedKeys': 'Unconsumed keys',
    'inspector.unconsumedExplain': 'These keys were read but never made it into the parsed result. Renamed or newly added upstream fields show up here first — picking them up means adding a mapping in the parser. Nothing is guessed for you.',
    'inspector.stealthNote': 'Metadata is hidden in the alpha channel (NovelAI stealth PNG). The standard chunks do not carry it, and writing back will not update it.',
    'inspector.diagnosticsClean': 'Every chunk decoded cleanly and no keys were dropped.',
    // Chunk decode status
    'inspector.status.ok': 'ok',
    'inspector.status.encodingFallback': 'encoding fallback',
    'inspector.status.decompressFailed': 'decompress failed',
    'inspector.status.malformed': 'malformed',
    // Matched branch
    'inspector.matched.sdParameters': 'SD · parameters chunk',
    'inspector.matched.sdHeuristic': 'SD · single-chunk heuristic',
    'inspector.matched.sdConcatenated': 'SD · concatenated fallback',
    'inspector.matched.sdExif': 'SD · EXIF UserComment',
    'inspector.matched.naiChunks': 'NovelAI · Description + Comment',
    'inspector.matched.naiStealth': 'NovelAI · alpha-channel stealth',
    'inspector.matched.comfyWorkflow': 'ComfyUI · full workflow',
    'inspector.matched.comfyApi': 'ComfyUI · API format',
    'inspector.matched.exifUnparsed': 'EXIF UserComment · format not recognized',
    'inspector.matched.exifNone': 'EXIF · no UserComment',
    'inspector.matched.none': 'No known format matched',
    'inspector.matched.unknownContainer': 'Unrecognized container format',
    // Library scan
    'inspector.scanTitle': 'Library Scan',
    'inspector.scanHint': 'Re-parses every original file and compares against what the library stored. The scan is read-only — it writes nothing.',
    'inspector.runScan': 'Run Scan',
    'inspector.libraryLoading': 'Loading the library…',
    'inspector.libraryEmpty': 'No images in the library yet',
    'inspector.runBackfill': 'Backfill Metadata',
    'inspector.backfillSafety': 'Backfill only fills gaps: empty parameters, plus corrected raw text and source flags. Prompts, tags, favorites and folders are never touched.',
    'inspector.scanned': 'Scanned',
    'inspector.affected': 'affected',
    'inspector.allClean': 'Every image matches what the current parser reads.',
    'inspector.scanFailed': 'Scan failed',
    'inspector.backfillDone': 'Backfilled {n} images',
    'inspector.backfillPartial': 'Backfilled {n}, {failed} failed to write (see console)',
    'inspector.backfillFailed': 'Backfill failed',
    // Issue kinds
    'inspector.issue.decodeFailed': 'chunk failed to decode',
    'inspector.issue.encodingFallback': 'encoding fallback',
    'inspector.issue.rawMismatch': 'raw text mismatch',
    'inspector.issue.missingParams': 'missing parameters',
    'inspector.issue.stealthUnflagged': 'stealth not flagged',
    'inspector.issue.sourceMismatch': 'source upgradable',
    'inspector.issue.missingV4': 'missing v4 data',
  },
}

// Dev-only bilingual key audit: warn when zh-CN / en key sets drift apart
if (import.meta.env.DEV) {
  const zhKeys = new Set(Object.keys(messages['zh-CN']))
  const enKeys = new Set(Object.keys(messages['en']))
  const missingInEn = [...zhKeys].filter(k => !enKeys.has(k))
  const missingInZh = [...enKeys].filter(k => !zhKeys.has(k))
  if (missingInEn.length) {
    console.warn('[i18n] keys missing in en:', missingInEn)
  }
  if (missingInZh.length) {
    console.warn('[i18n] keys missing in zh-CN:', missingInZh)
  }
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

  return {
    locale,
    t,
    setLocale,
    translateCategory,
  }
}

// Initialize document lang on load
if (typeof document !== 'undefined') {
  document.documentElement.lang = currentLocale.value === 'zh-CN' ? 'zh' : 'en'
}
