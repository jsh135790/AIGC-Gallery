import Dexie, { type EntityTable } from 'dexie'
import type { Artist, ArtistPage, AIGCImage, AIGCFolder, Tag } from '@/types'

const db = new Dexie('aigc-gallery') as Dexie & {
  artists: EntityTable<Artist, 'id'>
  artistPages: EntityTable<ArtistPage, 'id'>
  aigcImages: EntityTable<AIGCImage, 'id'>
  aigcFolders: EntityTable<AIGCFolder, 'id'>
  tags: EntityTable<Tag, 'id'>
}

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

export { db }
