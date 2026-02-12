import Dexie, { type EntityTable } from 'dexie'
import type { Artist, AIGCImage, AIGCFolder, Tag } from '@/types'

const db = new Dexie('aigc-gallery') as Dexie & {
  artists: EntityTable<Artist, 'id'>
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

export { db }
