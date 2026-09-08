import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLibraryDatabase, type LibraryDatabase } from '@/lib/db'
import { BackupService } from '../backup'
import { LibraryCoordinator } from '../coordination'
import { LAST_BACKUP_KEY, readSettings } from '../settings'
import { validateManifest } from '../manifest'
import { MemoryDirectory, MemoryStorage, memoryLocks, deferred } from './helpers'
import { DEFAULT_SWATCH } from '@/lib/colors'

let source: LibraryDatabase
let target: LibraryDatabase
let storage: MemoryStorage
let coordinator: LibraryCoordinator
let service: BackupService
let destination: BackupService
let root: MemoryDirectory
let locks: LockManager
const stamp = new Date('2025-01-02T03:04:05.000Z')
const bytes = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), '原始隐写和工作流字节'], { type: '' })

beforeEach(async () => {
  source = createLibraryDatabase(`test-source-${crypto.randomUUID()}`)
  target = createLibraryDatabase(`test-target-${crypto.randomUUID()}`)
  storage = new MemoryStorage()
  locks = memoryLocks()
  coordinator = new LibraryCoordinator(locks, storage)
  service = new BackupService(source, storage, coordinator)
  destination = new BackupService(target, storage, coordinator)
  root = new MemoryDirectory()
  await source.artistPages.bulkAdd([
    { id: 2, name: '画师/中文', sortOrder: 0, color: '#123456', icon: 'Folder', createdAt: stamp, updatedAt: stamp },
    { id: 3, name: '空分组', sortOrder: 1, createdAt: stamp, updatedAt: stamp },
  ])
  await source.aigcFolders.add({ id: 7, name: '作品', description: '保留空格 /', color: '#abcdef', icon: 'Folder', sortOrder: 1, createdAt: stamp, updatedAt: stamp })
  await source.artists.add({
    id: 4, name: '画师', prompt: '用户编辑的提示词', category: '水彩风', rating: 4,
    tags: ['手工'], images: [bytes, new Blob(['第二张'], { type: 'image/webp' })],
    thumbnails: ['data:image/webp;base64,AAAA'], isFavorite: true, pageId: 2, createdAt: stamp, updatedAt: stamp,
  })
  for (const id of [8, 9]) await source.aigcImages.add({
    id, filename: '同名图片.png', folderId: id === 8 ? 7 : null,
    imageData: bytes, thumbnail: new Blob(['thumb'], { type: 'image/webp' }),
    source: 'nai', prompt: '库里单独编辑过，不能重解析覆盖', negativePrompt: '负面',
    rawMetadata: 'unknown Comment 字段', parameters: { seed: '1234567890123456789', custom: { nested: [1, '中文'] } },
    v4Data: { basePrompt: 'base', baseNegative: 'negative', useOrder: true, useCoords: false, legacyUc: false, characters: [{ idx: 0, prompt: '角色', negative: '负面', centers: [{ x: 0.5, y: 0.5 }] }] },
    stealth: true, width: 10, height: 20, tags: ['手工', '自动'], isFavorite: true, createdAt: stamp, updatedAt: stamp,
  })
  await source.tags.bulkAdd([{ id: 1, name: '手工', type: 'manual', count: 999 }, { id: 2, name: '自动', type: 'auto', count: 2 }, { id: 3, name: '未使用但已保存', type: 'manual', count: 0 }])
  storage.setItem('theme', 'light')
  storage.setItem('locale', 'zh-CN')
  storage.setItem('artistGallery.selectedPageId', '3')
  storage.setItem('foreign-secret', 'do not export')
})

afterEach(async () => { await source.delete(); await target.delete() })

async function backup() {
  const result = await service.create(root)
  return { ...result, inspected: await destination.inspect(result.directory) }
}

describe('complete library snapshots', () => {
  it('round trips both libraries, original bytes, ordering, dates, relationships, edits and settings', async () => {
    const { manifest, inspected, directory } = await backup()
    expect(manifest.files).toHaveLength(6)
    expect(manifest.tables.artists[0].images).toEqual(['artists/4-1.png', 'artists/4-2.webp'])
    expect(manifest.settings).not.toHaveProperty('foreign-secret')
    storage.setItem('theme', 'dark')
    const result = await destination.restore(inspected)
    expect(result.failedSettings).toEqual([])
    expect(storage.getItem('theme')).toBe('light')
    expect(storage.getItem('foreign-secret')).toBe('do not export')
    const [artist] = await target.artists.toArray()
    expect({ ...artist, images: [] }).toEqual({ ...await source.artists.get(4), images: [] })
    expect(await artist.images[0].arrayBuffer()).toEqual(await bytes.arrayBuffer())
    expect(await artist.images[1].text()).toBe('第二张')
    expect(artist.images[0].type).toBe('')
    for (const id of [8, 9]) {
      const original = (await source.aigcImages.get(id))!
      const restored = (await target.aigcImages.get(id))!
      expect({ ...restored, imageData: null, thumbnail: null }).toEqual({ ...original, imageData: null, thumbnail: null })
      expect(await restored.imageData.arrayBuffer()).toEqual(await original.imageData.arrayBuffer())
      expect(await restored.thumbnail.arrayBuffer()).toEqual(await original.thumbnail.arrayBuffer())
    }
    expect(await target.artistPages.toArray()).toEqual(await source.artistPages.toArray())
    expect(await target.aigcFolders.toArray()).toEqual(await source.aigcFolders.toArray())
    expect(await target.tags.get(1)).toMatchObject({ type: 'manual', count: 2 })
    expect(await target.tags.get(2)).toMatchObject({ type: 'auto', count: 2 })
    expect(await target.tags.get(3)).toMatchObject({ name: '未使用但已保存', type: 'manual', count: 0 })
    expect(JSON.parse(storage.getItem(LAST_BACKUP_KEY)!)).toMatchObject({ name: directory.name })
  })

  it('makes separate snapshots and waits for an in-flight write', async () => {
    const started = deferred(), finish = deferred()
    const saving = coordinator.write(async () => { started.resolve(); await finish.promise; await source.artists.update(4, { prompt: '保存结束' }) })
    await started.promise
    const creating = service.create(root)
    finish.resolve()
    await saving
    const first = await creating
    expect(first.manifest.tables.artists[0].prompt).toBe('保存结束')
    const second = await service.create(root)
    expect(first.directory.name).not.toBe(second.directory.name)
    expect(root.directories.size).toBe(2)
  })

  it('accepts an untouched bootstrap page and replaces it in the restore transaction', async () => {
    await target.artistPages.add({ id: 1, name: '默认分组', color: DEFAULT_SWATCH, icon: 'Folder', sortOrder: 0, createdAt: stamp, updatedAt: stamp, isBootstrap: true })
    const { inspected } = await backup()
    await destination.restore(inspected)
    expect((await target.artistPages.toArray()).map(page => page.id)).toEqual([2, 3])
  })

  it('recognizes the unchanged default page created before bootstrap markers existed', async () => {
    await target.artistPages.add({ id: 1, name: '默认分组', color: '#6366f1', icon: 'Folder', sortOrder: 0, createdAt: stamp, updatedAt: stamp })
    await expect(destination.checkEmpty()).resolves.toBeUndefined()
    await target.artistPages.update(1, { updatedAt: new Date(stamp.getTime() + 1) })
    await expect(destination.checkEmpty()).rejects.toMatchObject({ code: 'not-empty' })
  })

  it.each(['artist', 'folder', 'tag', 'page', 'edited-default'])('rejects a nonempty target (%s)', async kind => {
    const { inspected } = await backup()
    if (kind === 'artist') await target.artists.add((await source.artists.get(4))!)
    if (kind === 'folder') await target.aigcFolders.add((await source.aigcFolders.get(7))!)
    if (kind === 'tag') await target.tags.add({ name: 'unused', type: 'manual', count: 0 })
    if (kind === 'page') await target.artistPages.add({ name: '自建空分组', sortOrder: 0, createdAt: stamp, updatedAt: stamp })
    if (kind === 'edited-default') await target.artistPages.add({ id: 1, name: '默认分组', color: DEFAULT_SWATCH, icon: 'Folder', sortOrder: 0, createdAt: stamp, updatedAt: stamp, isBootstrap: false })
    await expect(destination.restore(inspected)).rejects.toMatchObject({ code: 'not-empty' })
    expect(await target.aigcImages.count()).toBe(0)
  })

  it.each(['QuotaExceededError', 'NotAllowedError'])('does not mark a failed disk write as complete (%s)', async name => {
    const first = await service.create(root)
    const history = storage.getItem(LAST_BACKUP_KEY)
    root.failure = new DOMException('failure', name)
    await expect(service.create(root)).rejects.toHaveProperty('name', name)
    expect(storage.getItem(LAST_BACKUP_KEY)).toBe(history)
    for (const dir of root.directories.values()) {
      if (dir.name !== first.directory.name) expect(dir.files.has('index.json')).toBe(false)
    }
  })

  it('checks disk contents after writing and rejects corrupt output', async () => {
    root.corrupt = true
    await expect(service.create(root)).rejects.toMatchObject({ code: 'checksum-mismatch' })
    expect(storage.getItem(LAST_BACKUP_KEY)).toBeNull()
  })

  it('cancels backup between files without a complete manifest', async () => {
    const abort = new AbortController()
    await expect(service.create(root, { signal: abort.signal, onProgress: p => { if (p.done === 1) abort.abort() } })).rejects.toHaveProperty('name', 'AbortError')
    const dir = [...root.directories.values()][0]
    expect(dir.files.has('index.json')).toBe(false)
    await expect(destination.inspect(dir)).rejects.toMatchObject({ code: 'missing-file' })
  })

  it('rejects missing or changed images before writing any records', async () => {
    const { directory, inspected } = await backup()
    const dir = await directory.getDirectoryHandle('aigc') as MemoryDirectory
    dir.files.delete('8.png')
    await expect(destination.restore(inspected)).rejects.toMatchObject({ code: 'checksum-mismatch' })
    expect(await target.artists.count()).toBe(0)
  })

  it('detects manifest changes between inspection and confirmation', async () => {
    const { directory, inspected } = await backup()
    const file = await directory.getFileHandle('index.json') as import('./helpers').MemoryFile
    const manifest = JSON.parse(await file.data.text())
    manifest.tables.artists[0].prompt = 'changed after inspection'
    file.data = new Blob([JSON.stringify(manifest)])
    await expect(destination.restore(inspected)).rejects.toMatchObject({ code: 'backup-changed' })
    expect(await target.artists.count()).toBe(0)
  })

  it('checks emptiness again inside the transaction if a non-cooperating writer changes the target', async () => {
    const { inspected } = await backup()
    const beforeInvalidation = coordinator.invalidateBeforeRestore.bind(coordinator)
    coordinator.invalidateBeforeRestore = () => {
      // 模拟旧版本页面，不遵循新增的 Web Lock 协议。
      void target.tags.add({ name: 'late write', type: 'manual', count: 0 })
      beforeInvalidation()
    }
    await expect(destination.restore(inspected)).rejects.toMatchObject({ code: 'not-empty' })
    expect(await target.aigcImages.count()).toBe(0)
    expect(await target.tags.count()).toBe(1)
  })

  it.each([
    ['jpeg', [255, 216, 255, 224]],
    ['webp', [82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]],
    ['avif', [0, 0, 0, 20, 102, 116, 121, 112, 97, 118, 105, 102, 0, 0, 0, 0, 97, 118, 105, 102]],
  ] as const)('preserves %s bytes and ComfyUI metadata without invoking the PNG writer', async (format, magic) => {
    const original = new Blob([new Uint8Array(magic), '未知节点与原始参数'], { type: 'image/png' })
    await source.aigcImages.update(8, { imageData: original, source: 'comfyui', rawMetadata: 'unmapped workflow', parameters: { nodeTypes: ['CustomNode'], workflow: { arbitrary: true } } })
    const { inspected } = await backup()
    const extension = format === 'jpeg' ? 'jpg' : format
    expect(inspected.manifest.files.some(file => file.path === `aigc/8.${extension}`)).toBe(true)
    await destination.restore(inspected)
    const restored = (await target.aigcImages.get(8))!
    expect(await restored.imageData.arrayBuffer()).toEqual(await original.arrayBuffer())
    expect(restored.imageData.type).toBe('image/png')
    expect(restored.source).toBe('comfyui')
    expect(restored.parameters).toEqual({ nodeTypes: ['CustomNode'], workflow: { arbitrary: true } })
  })

  it('rolls back all tables when a database write fails after earlier rows succeeded', async () => {
    const { inspected } = await backup()
    target.aigcImages.hook('creating', () => { throw new DOMException('full', 'QuotaExceededError') })
    await expect(destination.restore(inspected)).rejects.toHaveProperty('name', 'QuotaExceededError')
    for (const table of target.tables) expect(await table.count()).toBe(0)
    await expect(coordinator.write(async () => 'still usable')).resolves.toBe('still usable')
  })

  it('cancels the restore transaction and leaves no partial rows', async () => {
    const { inspected } = await backup()
    const abort = new AbortController()
    await expect(destination.restore(inspected, { signal: abort.signal, onProgress: p => { if (p.phase === 'restoring' && p.done === 3) abort.abort() } })).rejects.toHaveProperty('name', 'AbortError')
    for (const table of target.tables) expect(await table.count()).toBe(0)
  })

  it('retries failed settings without importing library rows twice', async () => {
    const { inspected } = await backup()
    storage.failKey = 'theme'
    const result = await destination.restore(inspected)
    expect(result.failedSettings).toEqual(['theme'])
    expect(await target.aigcImages.count()).toBe(2)
    storage.failKey = ''
    expect(destination.retrySettings(result.settings)).toEqual([])
    expect(readSettings(storage)).toEqual(inspected.manifest.settings)
    expect(await target.aigcImages.count()).toBe(2)
  })

  it('blocks and invalidates writes from another tab queued behind restore', async () => {
    const { inspected } = await backup()
    const otherTab = new LibraryCoordinator(locks, storage)
    const started = deferred()
    const restoring = destination.restore(inspected, { onProgress: p => { if (p.phase === 'checking') started.resolve() } })
    await started.promise
    let didWrite = false
    const lateWrite = otherTab.write(async () => { didWrite = true }).catch(error => error)
    await restoring
    expect(await lateWrite).toMatchObject({ code: 'stale-library' })
    expect(didWrite).toBe(false)
  })

  it.each([
    ['version', (m: any) => { m.version = 999 }],
    ['path', (m: any) => { m.files[0].path = 'artists/../../private.txt' }],
    ['duplicate id', (m: any) => { m.tables.artists.push(m.tables.artists[0]) }],
    ['dangling folder', (m: any) => { m.tables.aigcImages[0].folderId = 999 }],
    ['date', (m: any) => { m.tables.artists[0].createdAt = 'invalid' }],
    ['nested v4', (m: any) => { m.tables.aigcImages[0].v4Data.characters = [{}] }],
    ['unexpected setting', (m: any) => { m.settings.secret = 'bad' }],
    ['incomplete', (m: any) => { m.complete = false }],
  ])('validates %s before restore', async (_name, mutate) => {
    const { manifest } = await service.create(root)
    mutate(manifest)
    expect(() => validateManifest(manifest)).toThrow()
  })
})
