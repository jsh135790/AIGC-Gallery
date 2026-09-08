// ===== Artist Gallery Types =====

export interface Artist {
  id?: number
  name: string
  prompt: string
  category: string
  rating: number
  tags: string[]
  images: Blob[]
  thumbnails: string[]
  isFavorite: boolean
  /** Owning page id. Nullable only during migration window; new artists always have a page. */
  pageId: number | null
  createdAt: Date
  updatedAt: Date
}

export interface ArtistPage {
  id?: number
  /** 仅标记程序创建且未修改的初始空分组，供空库恢复识别；非索引字段。 */
  isBootstrap?: boolean
  name: string
  color?: string
  icon?: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export type ArtistCategory =
  | '写实'
  | '二次元'
  | '半写实'
  | '概念艺术'
  | '水彩风'
  | '油画风'
  | '插画'
  | '像素风'
  | '其他'

export const ARTIST_CATEGORIES: ArtistCategory[] = [
  '写实', '二次元', '半写实', '概念艺术',
  '水彩风', '油画风', '插画', '像素风', '其他',
]

// ===== AIGC Image Types =====

export type ImageSource = 'sd' | 'nai' | 'comfyui' | 'unknown'

export interface ImageParameters {
  steps?: number
  sampler?: string
  cfgScale?: number
  seed?: number | string
  size?: string
  model?: string
  clipSkip?: number
  denoisingStrength?: number
  scheduler?: string
  loras?: string
  vae?: string
  // ComfyUI specific
  nodeCount?: number
  nodeTypes?: string[]
  [key: string]: unknown
}

export interface AIGCImage {
  id?: number
  folderId: number | null
  filename: string
  imageData: Blob
  thumbnail: Blob
  /** 原图像素宽高(非索引字段,旧数据缺省,由 backfillImageDims 回填;无需升 Dexie schema 版本) */
  width?: number
  height?: number
  source: ImageSource
  prompt: string
  negativePrompt: string
  parameters: ImageParameters
  rawMetadata: string
  v4Data?: NAIv4Data
  /**
   * 元数据藏在 alpha 通道(NovelAI Stealth PNG)。非索引字段,旧数据缺省,
   * 由 backfillMetadata 回填;无需升 Dexie schema 版本。
   * 编辑器据此警告"写回不会同步隐藏的那一份"。
   */
  stealth?: boolean
  tags: string[]
  isFavorite: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AIGCFolder {
  id?: number
  name: string
  description: string
  color: string
  icon: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Tag {
  id?: number
  name: string
  type: 'auto' | 'manual'
  count: number
}

// ===== NovelAI v4 Character Prompt Types =====

export interface NAICharacterCenter {
  x: number
  y: number
}

export interface NAICharacterPrompt {
  idx: number
  prompt: string
  negative: string
  centers: NAICharacterCenter[]
}

export interface NAIv4Data {
  basePrompt: string
  baseNegative: string
  characters: NAICharacterPrompt[]
  useOrder: boolean
  useCoords: boolean
  legacyUc: boolean
}

// ===== Parser Types =====

export interface ParsedMetadata {
  source: ImageSource
  prompt: string
  negativePrompt: string
  parameters: ImageParameters
  rawText: string
  v4Data?: NAIv4Data
  /**
   * 元数据来自 alpha 通道隐写(NovelAI Stealth PNG)而非标准 tEXt。
   * 写回只会写标准 chunk,隐藏的那一份不会同步 —— 编辑器据此给警告。
   */
  stealth?: boolean
  /**
   * 原始条目表 + 识别过程,供元数据查看器使用。
   * 刻意**不入库**:它含嵌套数组,而 stripProxy 只做一层深;而且原图 Blob 一直留着,
   * 随时可以重新解析,没必要为诊断信息付存储代价。
   */
  diagnostics?: MetadataDiagnostics
}

export interface PngTextChunk {
  keyword: string
  text: string
}

/** 元数据容器类型。PNG 之外目前只走 EXIF UserComment 一条窄路 */
export type MetadataContainerKind = 'png' | 'jpeg' | 'webp' | 'avif' | 'unknown'

/**
 * 单个原始条目的解码结果。
 * - `ok` 正常
 * - `encoding-fallback` 严格 UTF-8 解码失败,按 Latin-1 回退(老工具的 tEXt 常见)
 * - `decompress-failed` zTXt / 压缩 iTXt 解压失败,正文不可用
 * - `malformed` 条目结构本身坏了,已跳过正文
 */
export type EntryDecodeStatus = 'ok' | 'encoding-fallback' | 'decompress-failed' | 'malformed'

/**
 * 容器里的一条原始元数据。刻意做成容器无关的形状(而非 PNG 专用),
 * 二期接 eXIf / XMP / 完整 EXIF 时不需要改结构。
 */
export interface RawMetadataEntry extends PngTextChunk {
  /** PNG 为 chunk 类型(tEXt / zTXt / iTXt);其他容器为容器专属标识 */
  entryType: string
  /** 原始载荷字节数(PNG 不含长度/类型/CRC) */
  byteLength: number
  status: EntryDecodeStatus
  /** iTXt 专有 */
  languageTag?: string
  translatedKeyword?: string
}

export interface MetadataContainer {
  kind: MetadataContainerKind
  entries: RawMetadataEntry[]
}

export interface MetadataDiagnostics {
  container: MetadataContainerKind
  /** 命中了哪条识别分支,查看器直接显示这个字符串 */
  matchedBy: string
  entries: RawMetadataEntry[]
  /** 读到了但没有映射进 prompt / parameters 的键 */
  unconsumedKeys: string[]
}

/**
 * 解析器往里报"我读到了但没消费的键"。
 * 做成收集器而不是返回值的一部分:只有解析器自己知道它消费了什么,
 * 在外面靠 diff 重算需要复制一份格式映射逻辑,那份副本一定会腐化。
 */
export interface ParseReport {
  unconsumedKeys: string[]
}


// ===== UI Types =====

export type SortOrder = 'asc' | 'desc'

export interface FolderNavItem {
  id: number | 'all' | 'uncategorized' | 'favorites'
  name: string
  icon: string
  color?: string
  count: number
  isSystem: boolean
}
