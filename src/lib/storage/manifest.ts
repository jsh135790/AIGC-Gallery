import type { AIGCFolder, AIGCImage, Artist, ArtistPage, Tag } from '@/types'
import { SETTING_KEYS, validSetting, type BackupSettings } from './settings'

type Dated<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id: number; createdAt: string; updatedAt: string }
export interface BackupFile {
  path: string
  type: string
  size: number
  sha256: string
  name?: string
  lastModified?: number
}
export interface BackupManifestV1 {
  format: 'aigc-gallery-backup'
  version: 1
  appVersion: string
  createdAt: string
  complete: true
  files: BackupFile[]
  tables: {
    artists: (Dated<Omit<Artist, 'images'>> & { images: string[] })[]
    artistPages: Dated<ArtistPage>[]
    aigcImages: (Dated<Omit<AIGCImage, 'imageData' | 'thumbnail'>> & { imageData: string; thumbnail: string })[]
    aigcFolders: Dated<AIGCFolder>[]
    tags: (Tag & { id: number })[]
  }
  settings: BackupSettings
}

export type BackupErrorCode = 'invalid-backup' | 'unsupported-version' | 'missing-file' | 'checksum-mismatch' | 'not-empty' | 'backup-changed' | 'directory-exists'
export class BackupError extends Error {
  constructor(public code: BackupErrorCode, public details: string[] = []) {
    super([code, ...details].join(': '))
    this.name = 'BackupError'
  }
}

export function safePath(path: unknown): path is string {
  return typeof path === 'string'
    && /^(aigc|artists|thumbnails)\/[a-zA-Z0-9_.-]+$/.test(path)
    && !path.split('/').some(part => part === '.' || part === '..')
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}
function id(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}
function number(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
function date(value: unknown) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value
}

/** 清单是外部输入；先完整校验，再构造数据库行，不能边解析边写库。 */
export function validateManifest(value: unknown): asserts value is BackupManifestV1 {
  if (!record(value) || value.format !== 'aigc-gallery-backup') throw new BackupError('invalid-backup', ['format'])
  if (value.version !== 1) throw new BackupError('unsupported-version', [String(value.version)])
  const errors: string[] = []
  const check = (valid: unknown, path: string) => { if (!valid) errors.push(path) }
  check(value.complete === true, 'complete')
  check(typeof value.appVersion === 'string', 'appVersion')
  check(date(value.createdAt), 'createdAt')
  if (!Array.isArray(value.files) || !record(value.tables) || !record(value.settings)) {
    throw new BackupError('invalid-backup', ['files / tables / settings'])
  }

  const files = new Set<string>()
  for (const file of value.files) {
    if (!record(file)) { errors.push('files'); continue }
    check(safePath(file.path) && !files.has(String(file.path)), `files.path: ${String(file.path)}`)
    if (safePath(file.path)) files.add(file.path)
    check(typeof file.type === 'string', `${file.path}.type`)
    check(number(file.size) && Number.isSafeInteger(file.size) && file.size >= 0, `${file.path}.size`)
    check(typeof file.sha256 === 'string' && /^[a-f0-9]{64}$/.test(file.sha256), `${file.path}.sha256`)
    check(file.name === undefined || typeof file.name === 'string', `${file.path}.name`)
    check(file.lastModified === undefined || number(file.lastModified), `${file.path}.lastModified`)
  }

  const ids = new Map<string, Set<number>>()
  for (const name of ['artists', 'artistPages', 'aigcImages', 'aigcFolders', 'tags']) {
    const rows = value.tables[name]
    const seen = new Set<number>()
    ids.set(name, seen)
    if (!Array.isArray(rows)) { errors.push(`tables.${name}`); continue }
    for (const row of rows) {
      if (!record(row)) { errors.push(`tables.${name}.row`); continue }
      check(id(row.id) && !seen.has(row.id), `${name}.id: ${String(row.id)}`)
      if (id(row.id)) seen.add(row.id)
      if (name !== 'tags') {
        check(date(row.createdAt) && date(row.updatedAt), `${name}.${row.id}.dates`)
      }
    }
  }
  // 先阻断外壳错误，后面才能安全地验证字段与跨表引用。
  if (errors.length) throw new BackupError('invalid-backup', errors)

  const tables = value.tables as unknown as BackupManifestV1['tables']
  const usedFiles = new Set<string>()
  const reference = (path: unknown, location: string) => {
    check(safePath(path) && files.has(path), location)
    if (typeof path === 'string') usedFiles.add(path)
  }
  for (const row of tables.artists) {
    const at = `artists.${row.id}`
    for (const key of ['name', 'prompt', 'category'] as const) check(typeof row[key] === 'string', `${at}.${key}`)
    check(number(row.rating) && row.rating >= 0 && row.rating <= 5, `${at}.rating`)
    check(strings(row.tags) && strings(row.thumbnails) && strings(row.images), `${at}.arrays`)
    check(typeof row.isFavorite === 'boolean', `${at}.isFavorite`)
    check(row.pageId === null || ids.get('artistPages')!.has(row.pageId), `${at}.pageId`)
    if (strings(row.images)) row.images.forEach(path => reference(path, `${at}.images`))
  }
  for (const row of tables.artistPages) {
    const at = `artistPages.${row.id}`
    check(typeof row.name === 'string' && number(row.sortOrder), at)
    check(row.color === undefined || typeof row.color === 'string', `${at}.color`)
    check(row.icon === undefined || typeof row.icon === 'string', `${at}.icon`)
    check(row.isBootstrap === undefined || typeof row.isBootstrap === 'boolean', `${at}.isBootstrap`)
  }
  for (const row of tables.aigcFolders) {
    const at = `aigcFolders.${row.id}`
    for (const key of ['name', 'description', 'color', 'icon'] as const) check(typeof row[key] === 'string', `${at}.${key}`)
    check(number(row.sortOrder), `${at}.sortOrder`)
  }
  for (const row of tables.aigcImages) {
    const at = `aigcImages.${row.id}`
    for (const key of ['filename', 'prompt', 'negativePrompt', 'rawMetadata'] as const) check(typeof row[key] === 'string', `${at}.${key}`)
    check(['sd', 'nai', 'comfyui', 'unknown'].includes(row.source), `${at}.source`)
    check(record(row.parameters), `${at}.parameters`)
    check(strings(row.tags) && typeof row.isFavorite === 'boolean', `${at}.tags / isFavorite`)
    check(row.folderId === null || ids.get('aigcFolders')!.has(row.folderId), `${at}.folderId`)
    for (const key of ['width', 'height'] as const) check(row[key] === undefined || (number(row[key]) && row[key]! > 0), `${at}.${key}`)
    check(row.stealth === undefined || typeof row.stealth === 'boolean', `${at}.stealth`)
    reference(row.imageData, `${at}.imageData`)
    reference(row.thumbnail, `${at}.thumbnail`)
    if (row.v4Data !== undefined) {
      const v4 = row.v4Data
      check(record(v4), `${at}.v4Data`)
      if (record(v4)) {
        check(typeof v4.basePrompt === 'string' && typeof v4.baseNegative === 'string', `${at}.v4Data.prompts`)
        check(['useOrder', 'useCoords', 'legacyUc'].every(key => typeof v4[key] === 'boolean'), `${at}.v4Data.flags`)
        check(Array.isArray(v4.characters), `${at}.v4Data.characters`)
        if (Array.isArray(v4.characters)) for (const char of v4.characters) {
          check(record(char) && Number.isInteger(char.idx) && char.idx >= 0 && typeof char.prompt === 'string'
            && typeof char.negative === 'string' && Array.isArray(char.centers)
            && char.centers.every((center: unknown) => record(center) && number(center.x) && number(center.y)), `${at}.v4Data.character`)
        }
      }
    }
  }
  const tagNames = new Set<string>()
  for (const row of tables.tags) {
    check(typeof row.name === 'string' && !tagNames.has(row.name), `tags.${row.id}.name`)
    check(row.type === 'auto' || row.type === 'manual', `tags.${row.id}.type`)
    check(Number.isSafeInteger(row.count) && row.count >= 0, `tags.${row.id}.count`)
    tagNames.add(row.name)
  }
  check(usedFiles.size === files.size, 'unreferenced files')
  for (const key of SETTING_KEYS) check(validSetting(key, value.settings[key]), `settings.${key}`)
  check(Object.keys(value.settings).every(key => (SETTING_KEYS as readonly string[]).includes(key)), 'unknown settings')
  if (errors.length) throw new BackupError('invalid-backup', errors)
}
