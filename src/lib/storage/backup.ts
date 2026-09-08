import type { LibraryDatabase } from '@/lib/db'
import { DEFAULT_SWATCH } from '@/lib/colors'
import type { ArtistPage, Tag } from '@/types'
import { sniffContainer } from '@/lib/parser/png-parser'
import { LibraryCoordinator, type KeyValueStorage } from './coordination'
import { BackupError, validateManifest, type BackupManifestV1, type BackupFile } from './manifest'
import { resolveFile, writeFile, type BackupDirectory } from './directory'
import { LAST_BACKUP_KEY, readSettings, restoreSettings, type BackupSettings } from './settings'

export interface BackupProgress {
  phase: 'snapshot' | 'writing' | 'checking' | 'restoring'
  done: number
  total: number
  bytesDone: number
  bytesTotal: number
  path?: string
}
export interface BackupOptions {
  signal?: AbortSignal
  onProgress?: (progress: BackupProgress) => void
}
export interface InspectedBackup {
  directory: BackupDirectory
  manifest: BackupManifestV1
  manifestHash: string
}

export async function sha256(blob: Blob) {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function isInitialArtistPage(page: ArtistPage) {
  // 旧版本没有标记，只接受 id=1 且完全符合初始模板的未编辑分组。
  // 新版本修改分组会明确写 false，不能因为改回原名就被当作空库。
  return page.isBootstrap !== false && (page.isBootstrap === true || page.id === 1)
    && page.name === '默认分组' && page.icon === 'Folder' && page.sortOrder === 0
    && [DEFAULT_SWATCH, '#6366f1'].includes(page.color ?? '')
    && new Date(page.createdAt).getTime() === new Date(page.updatedAt).getTime()
}

export async function assertEmptyLibrary(db: LibraryDatabase) {
  const [artists, images, folders, tags, pages] = await Promise.all([
    db.artists.count(), db.aigcImages.count(), db.aigcFolders.count(), db.tags.count(), db.artistPages.toArray(),
  ])
  if (artists || images || folders || tags || pages.length > 1 || (pages.length === 1 && !isInitialArtistPage(pages[0]))) {
    throw new BackupError('not-empty')
  }
}

async function fileExtension(blob: Blob) {
  const head = new Uint8Array(await blob.slice(0, 32).arrayBuffer())
  const kind = sniffContainer(head)
  if (kind !== 'unknown') return kind === 'jpeg' ? 'jpg' : kind
  if (String.fromCharCode(...head.slice(0, 3)) === 'GIF') return 'gif'
  return ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif' } as Record<string, string>)[blob.type] ?? 'bin'
}

function reviveDates<T extends { createdAt: string; updatedAt: string }>(row: T) {
  return { ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }
}

export class BackupService {
  constructor(private db: LibraryDatabase, private storage: KeyValueStorage, private coordinator: LibraryCoordinator) {}

  private tables() {
    return [this.db.artists, this.db.artistPages, this.db.aigcImages, this.db.aigcFolders, this.db.tags]
  }

  async create(parent: BackupDirectory, options: BackupOptions = {}) {
    const { signal, onProgress } = options
    let createdAt = ''
    const snapshot = await this.coordinator.maintain(async () => {
      createdAt = new Date().toISOString()
      onProgress?.({ phase: 'snapshot', done: 0, total: 0, bytesDone: 0, bytesTotal: 0 })
      const settings = readSettings(this.storage)
      const records = await this.db.transaction('r', this.tables(), async () => {
        const [artists, artistPages, aigcImages, aigcFolders, tags] = await Promise.all([
          this.db.artists.toArray(), this.db.artistPages.toArray(), this.db.aigcImages.toArray(), this.db.aigcFolders.toArray(), this.db.tags.toArray(),
        ])
        return { artists, artistPages, aigcImages, aigcFolders, tags }
      })
      return { records, settings }
    }, signal)

    // Blob 是不可变快照；释放维护锁后可以继续浏览和编辑，不必锁住整段磁盘写入。
    // 清单和 Blob 引用来自同一次只读事务，图片字节只在逐文件校验时读取。
    const pending: { blob: Blob; file: BackupFile }[] = []
    const register = async (blob: Blob, base: string) => {
      signal?.throwIfAborted()
      if (!(blob instanceof Blob)) throw new BackupError('invalid-backup', [base])
      const path = `${base}.${await fileExtension(blob)}`
      const file: BackupFile = { path, type: blob.type, size: blob.size, sha256: '0'.repeat(64) }
      if (blob instanceof File) { file.name = blob.name; file.lastModified = blob.lastModified }
      pending.push({ blob, file })
      return path
    }
    const artists = []
    for (const row of snapshot.records.artists) {
      const images: string[] = []
      for (let i = 0; i < row.images.length; i++) images.push(await register(row.images[i], `artists/${row.id}-${i + 1}`))
      artists.push({ ...row, images })
    }
    const aigcImages = []
    for (const row of snapshot.records.aigcImages) {
      aigcImages.push({
        ...row,
        imageData: await register(row.imageData, `aigc/${row.id}`),
        thumbnail: await register(row.thumbnail, `thumbnails/${row.id}`),
      })
    }
    const manifest: BackupManifestV1 = JSON.parse(JSON.stringify({
      format: 'aigc-gallery-backup', version: 1, complete: true, appVersion: __APP_VERSION__, createdAt,
      tables: { ...snapshot.records, artists, aigcImages }, settings: snapshot.settings,
      files: pending.map(item => item.file),
    }))
    validateManifest(manifest)
    signal?.throwIfAborted()
    const name = `backup-${createdAt.replace(/[:.]/g, '-')}-${crypto.randomUUID().slice(0, 8)}`
    try {
      await parent.getDirectoryHandle(name)
      throw new BackupError('directory-exists', [name])
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'NotFoundError')) throw error
    }
    const directory = await parent.getDirectoryHandle(name, { create: true })
    const bytesTotal = pending.reduce((sum, item) => sum + item.blob.size, 0)
    let bytesDone = 0
    for (let i = 0; i < pending.length; i++) {
      const { blob, file } = pending[i]
      signal?.throwIfAborted()
      onProgress?.({ phase: 'writing', done: i, total: pending.length, bytesDone, bytesTotal, path: file.path })
      const hash = await sha256(blob)
      const handle = await resolveFile(directory, file.path, true)
      await writeFile(handle, blob, signal)
      const saved = await handle.getFile()
      if (saved.size !== blob.size || await sha256(saved) !== hash) throw new BackupError('checksum-mismatch', [file.path])
      manifest.files[i].sha256 = hash
      bytesDone += blob.size
      onProgress?.({ phase: 'writing', done: i + 1, total: pending.length, bytesDone, bytesTotal, path: file.path })
    }
    signal?.throwIfAborted()
    const index = await directory.getFileHandle('index.json', { create: true })
    const json = JSON.stringify(manifest, null, 2)
    await writeFile(index, json, signal)
    if (await (await index.getFile()).text() !== json) throw new BackupError('checksum-mismatch', ['index.json'])
    // 清单关闭并核验后就是完成点，之后的取消不能把完整备份误报为失败。
    let historySaved = true
    try { this.storage.setItem(LAST_BACKUP_KEY, JSON.stringify({ createdAt, name })) } catch { historySaved = false }
    return { directory, manifest, historySaved }
  }

  private async readAndVerify(directory: BackupDirectory, options: BackupOptions) {
    const { signal, onProgress } = options
    signal?.throwIfAborted()
    let raw: string
    try { raw = await (await (await directory.getFileHandle('index.json')).getFile()).text() }
    catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') throw new BackupError('missing-file', ['index.json'])
      throw error
    }
    let manifest: unknown
    try { manifest = JSON.parse(raw) } catch { throw new BackupError('invalid-backup', ['index.json']) }
    validateManifest(manifest)
    const blobs = new Map<string, Blob>()
    const failures: string[] = []
    const bytesTotal = manifest.files.reduce((sum, file) => sum + file.size, 0)
    let bytesDone = 0
    for (let i = 0; i < manifest.files.length; i++) {
      const file = manifest.files[i]
      signal?.throwIfAborted()
      onProgress?.({ phase: 'checking', done: i, total: manifest.files.length, bytesDone, bytesTotal, path: file.path })
      try {
        const blob = await (await resolveFile(directory, file.path)).getFile()
        if (blob.size !== file.size || await sha256(blob) !== file.sha256) failures.push(file.path)
        else {
          // 文件系统按扩展名猜的 MIME 可能与原 Blob 不同，恢复时以清单为准。
          blobs.set(file.path, file.name === undefined
            ? blob.slice(0, blob.size, file.type)
            : new File([blob], file.name, { type: file.type, lastModified: file.lastModified }))
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotFoundError') failures.push(`${file.path} (NotFoundError)`)
        else throw error
      }
      bytesDone += file.size
      onProgress?.({ phase: 'checking', done: i + 1, total: manifest.files.length, bytesDone, bytesTotal, path: file.path })
    }
    signal?.throwIfAborted()
    if (failures.length) throw new BackupError('checksum-mismatch', failures)
    return { manifest, blobs, manifestHash: await sha256(new Blob([raw])) }
  }

  async inspect(directory: BackupDirectory, options: BackupOptions = {}): Promise<InspectedBackup> {
    const { manifest, manifestHash } = await this.readAndVerify(directory, options)
    return { directory, manifest, manifestHash }
  }

  async checkEmpty() {
    return this.db.transaction('r', this.tables(), () => assertEmptyLibrary(this.db))
  }

  async restore(inspected: InspectedBackup, options: BackupOptions = {}) {
    const { signal, onProgress } = options
    return this.coordinator.maintain(async () => {
      await this.checkEmpty()
      // 用户看摘要时可能改动了备份文件；提交前重新核对，确保恢复的是刚才那份。
      const verified = await this.readAndVerify(inspected.directory, options)
      if (verified.manifestHash !== inspected.manifestHash) throw new BackupError('backup-changed')
      const { tables, settings } = verified.manifest
      const artists = tables.artists.map(row => ({ ...reviveDates(row), images: row.images.map(path => verified.blobs.get(path)!) }))
      const images = tables.aigcImages.map(row => ({ ...reviveDates(row), imageData: verified.blobs.get(row.imageData)!, thumbnail: verified.blobs.get(row.thumbnail)! }))
      const counts = new Map<string, number>()
      for (const image of images) for (const tag of new Set(image.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1)
      // 清单里的零计数标签也属于用户数据，不能因为当前图片没有引用就静默丢掉；
      // 图片关系是事实来源，计数按恢复后的图片重算。
      const tags: Tag[] = tables.tags.map(tag => ({ ...tag, count: counts.get(tag.name) ?? 0 }))
      const knownNames = new Set(tags.map(tag => tag.name))
      // 避免让新增标签抢到后续显式 ID；先确定备份中最大的标签 ID。
      let nextTagId = tables.tags.reduce((max, tag) => Math.max(max, tag.id), 0) + 1
      for (const [name, count] of counts) if (!knownNames.has(name)) tags.push({ id: nextTagId++, name, type: 'auto', count })
      signal?.throwIfAborted()
      const total = artists.length + images.length + tables.artistPages.length + tables.aigcFolders.length + tags.length
      let done = 0
      this.coordinator.invalidateBeforeRestore()
      let detachAbort: (() => void) | undefined
      try {
        await this.db.transaction('rw', this.tables(), async tx => {
          const abort = () => { try { tx.abort() } catch { /* 已经完成的事务无需再中止。 */ } }
          signal?.addEventListener('abort', abort, { once: true })
          detachAbort = () => signal?.removeEventListener('abort', abort)
          signal?.throwIfAborted()
          await assertEmptyLibrary(this.db)
          await this.db.artistPages.clear()
          const batches = [
            [this.db.artistPages, tables.artistPages.map(reviveDates)],
            [this.db.aigcFolders, tables.aigcFolders.map(reviveDates)],
            [this.db.artists, artists], [this.db.aigcImages, images], [this.db.tags, tags],
          ] as const
          for (const [table, rows] of batches) {
            for (const row of rows) {
              signal?.throwIfAborted()
              // 不在事务里读取文件、计算哈希或等待定时器；否则 IndexedDB 会提前提交。
              await table.add(row as never)
              onProgress?.({ phase: 'restoring', done: ++done, total, bytesDone: 0, bytesTotal: 0 })
            }
          }
          signal?.throwIfAborted()
        })
      } catch (error) {
        this.coordinator.acknowledgeFailedRestore()
        if (signal?.aborted) signal.throwIfAborted()
        throw error
      } finally { detachAbort?.() }
      return { settings, failedSettings: restoreSettings(this.storage, settings) }
    }, signal)
  }

  retrySettings(settings: BackupSettings) { return restoreSettings(this.storage, settings) }
}
