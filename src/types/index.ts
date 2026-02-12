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
  [key: string]: unknown
}

export interface AIGCImage {
  id?: number
  folderId: number | null
  filename: string
  imageData: Blob
  thumbnail: Blob
  source: ImageSource
  prompt: string
  negativePrompt: string
  parameters: ImageParameters
  rawMetadata: string
  v4Data?: NAIv4Data
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
}

export interface PngChunk {
  name: string
  data: Uint8Array
}

export interface PngTextChunk {
  keyword: string
  text: string
}

// ===== UI Types =====

export type ViewMode = 'grid' | 'list'

export type SortField = 'createdAt' | 'name' | 'rating' | 'filename'
export type SortOrder = 'asc' | 'desc'

export interface SortOption {
  field: SortField
  order: SortOrder
  label: string
}

export interface FolderNavItem {
  id: number | 'all' | 'uncategorized' | 'favorites'
  name: string
  icon: string
  color?: string
  count: number
  isSystem: boolean
}
