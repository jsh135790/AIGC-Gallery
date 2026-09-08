import Dexie, { type EntityTable } from 'dexie'
import { toRaw } from 'vue'
import type { Artist, ArtistPage, AIGCImage, AIGCFolder, Tag } from '@/types'

export type LibraryDatabase = Dexie & {
  artists: EntityTable<Artist, 'id'>
  artistPages: EntityTable<ArtistPage, 'id'>
  aigcImages: EntityTable<AIGCImage, 'id'>
  aigcFolders: EntityTable<AIGCFolder, 'id'>
  tags: EntityTable<Tag, 'id'>
}

export function createLibraryDatabase(name: string): LibraryDatabase {
  const db = new Dexie(name) as LibraryDatabase

  db.version(1).stores({
    artists: '++id, name, prompt, category, rating, isFavorite, createdAt',
    aigcImages: '++id, folderId, filename, source, isFavorite, createdAt, *tags',
    aigcFolders: '++id, name, sortOrder, createdAt',
    tags: '++id, &name, type, count',
  })

  // v2: introduce per-page grouping for artists
  // - new table `artistPages` (one row per user-defined tab)
  // - new index `pageId` on artists
  // Migration creates a default page and assigns every existing artist to it,
  // so users that already added artists keep all their data on the "默认分组" tab.
  db.version(2)
    .stores({
      artists: '++id, name, prompt, category, rating, isFavorite, createdAt, pageId',
      artistPages: '++id, sortOrder, createdAt',
      aigcImages: '++id, folderId, filename, source, isFavorite, createdAt, *tags',
      aigcFolders: '++id, name, sortOrder, createdAt',
      tags: '++id, &name, type, count',
    })
    .upgrade(async (tx) => {
      const now = new Date()
      const defaultPageId = await tx.table('artistPages').add({
        name: '默认分组',
        isBootstrap: true,
        color: '#6366f1',
        icon: 'Folder',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      })
      await tx
        .table('artists')
        .toCollection()
        .modify({ pageId: defaultPageId })
    })

  return db
}

const db = createLibraryDatabase('aigc-gallery')

export { db }

/*
 * IndexedDB 用结构化克隆存值,而结构化克隆克隆不了 Vue 的 reactive proxy
 * (抛 DataCloneError)。这个函数存在的唯一理由就是让对象能被写进去,所以放在 db 模块。
 *
 * **必须是深度的**。旧实现只对顶层 `toRaw`:
 *   `{ ...(img.parameters ?? {}) }` 逐值读出来的嵌套数组仍然是 proxy,
 *   新建的 plain object 让顶层 `toRaw` 成了空操作 —— `update()` 抛 DataCloneError,
 *   而调用处一个 `catch {}` 把它咽下去,于是内存里改了、库里没改,报告还说"回补 0 条"。
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** 递归解包 reactive proxy。Blob / File / Date 等结构化克隆原生支持的类型原样返回 */
export function stripProxy<T>(value: T): T {
  const raw = toRaw(value)

  if (Array.isArray(raw)) {
    return raw.map(item => stripProxy(item)) as unknown as T
  }

  /*
   * 只有 plain object 才往下走。Blob / File / Date / 类型化数组本来就可克隆,
   * 拆成键值对反而会把它们变成空对象 —— 原图会静默变成 `{}`。
   */
  if (!isPlainObject(raw)) return raw as T

  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(raw)) {
    out[key] = stripProxy(item)
  }
  return out as T
}
