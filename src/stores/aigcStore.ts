import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import { db } from '@/lib/db'
import type { AIGCImage, AIGCFolder, Tag, SortOrder, FolderNavItem } from '@/types'

/** Strip Vue reactive proxies for IndexedDB structured-clone compatibility. */
function stripProxy<T extends Record<string, unknown>>(obj: T): T {
  const raw = toRaw(obj) as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) {
      out[k] = Array.from(v).map(item => toRaw(item))
    } else if (v && typeof v === 'object' && !(v instanceof Blob) && !(v instanceof Date)) {
      out[k] = toRaw(v)
    } else {
      out[k] = v
    }
  }
  return out as T
}

export const useAigcStore = defineStore('aigc', () => {
  const images = ref<AIGCImage[]>([])
  const folders = ref<AIGCFolder[]>([])
  const tags = ref<Tag[]>([])

  const selectedFolderId = ref<number | 'all' | 'uncategorized' | 'favorites'>('all')
  const searchQuery = ref('')
  const selectedTags = ref<string[]>([])
  const sortField = ref<'createdAt' | 'filename'>('createdAt')
  const sortOrder = ref<SortOrder>('desc')
  const isLoading = ref(false)

  // Navigation items for sidebar
  const folderNavItems = computed<FolderNavItem[]>(() => {
    const allCount = images.value.length
    const uncatCount = images.value.filter(i => i.folderId === null).length
    const favCount = images.value.filter(i => i.isFavorite).length

    const systemItems: FolderNavItem[] = [
      { id: 'all', name: '全部图片', icon: 'Images', count: allCount, isSystem: true },
      { id: 'uncategorized', name: '未分类', icon: 'Inbox', count: uncatCount, isSystem: true },
      { id: 'favorites', name: '收藏夹', icon: 'Heart', count: favCount, isSystem: true },
    ]

    const userFolders: FolderNavItem[] = folders.value
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(f => ({
        id: f.id!,
        name: f.name,
        icon: f.icon || 'Folder',
        color: f.color,
        count: images.value.filter(i => i.folderId === f.id).length,
        isSystem: false,
      }))

    return [...systemItems, ...userFolders]
  })

  const filteredImages = computed(() => {
    let result = [...images.value]

    // Filter by folder
    if (selectedFolderId.value === 'favorites') {
      result = result.filter(i => i.isFavorite)
    } else if (selectedFolderId.value === 'uncategorized') {
      result = result.filter(i => i.folderId === null)
    } else if (typeof selectedFolderId.value === 'number') {
      result = result.filter(i => i.folderId === selectedFolderId.value)
    }

    // Filter by search
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      result = result.filter(i =>
        i.filename.toLowerCase().includes(q) ||
        i.prompt.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    // Filter by selected tags
    if (selectedTags.value.length > 0) {
      result = result.filter(i =>
        selectedTags.value.every(t => i.tags.includes(t))
      )
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      if (sortField.value === 'filename') {
        cmp = a.filename.localeCompare(b.filename)
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return sortOrder.value === 'desc' ? -cmp : cmp
    })

    return result
  })

  // ===== Data Loading =====
  async function loadAll() {
    isLoading.value = true
    try {
      const [imgs, flds, tgs] = await Promise.all([
        db.aigcImages.toArray(),
        db.aigcFolders.toArray(),
        db.tags.toArray(),
      ])
      images.value = imgs
      folders.value = flds
      tags.value = tgs
    } finally {
      isLoading.value = false
    }
  }

  // ===== Image CRUD =====
  async function addImage(image: Omit<AIGCImage, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date()
    const clean = stripProxy(image as Record<string, unknown>)
    const id = await db.aigcImages.add({
      ...clean,
      createdAt: now,
      updatedAt: now,
    } as AIGCImage)
    // Update tag counts
    for (const tagName of image.tags) {
      await upsertTag(tagName, 'auto')
    }
    await loadAll()
    return id
  }

  async function deleteImage(id: number) {
    // Remove from memory immediately
    images.value = images.value.filter(i => i.id !== id)

    // Delete from database in background
    await db.aigcImages.delete(id)
  }

  async function deleteImages(ids: number[]) {
    // Remove from memory immediately
    images.value = images.value.filter(i => !ids.includes(i.id!))

    // Delete from database in background
    await db.aigcImages.bulkDelete(ids)
  }

  async function updateImage(id: number, data: Partial<AIGCImage>) {
    const clean = stripProxy(data as Record<string, unknown>)
    const now = new Date()

    // Update in memory immediately
    const img = images.value.find(i => i.id === id)
    if (img) {
      Object.assign(img, clean, { updatedAt: now })
    }

    // Update in database in background
    await db.aigcImages.update(id, { ...clean, updatedAt: now })
  }

  async function toggleImageFavorite(id: number) {
    const img = images.value.find(i => i.id === id)
    if (img) {
      const newFavoriteState = !img.isFavorite
      const now = new Date()

      // Update in memory immediately for instant UI feedback
      img.isFavorite = newFavoriteState
      img.updatedAt = now

      // Update in database in background
      await db.aigcImages.update(id, { isFavorite: newFavoriteState, updatedAt: now })
    }
  }

  async function moveImagesToFolder(imageIds: number[], folderId: number | null) {
    const now = new Date()

    // Update in memory immediately for instant UI feedback
    for (const id of imageIds) {
      const img = images.value.find(i => i.id === id)
      if (img) {
        img.folderId = folderId
        img.updatedAt = now
      }
    }

    // Update in database in background
    await Promise.all(
      imageIds.map(id => db.aigcImages.update(id, { folderId, updatedAt: now }))
    )
  }

  async function batchAddTags(imageIds: number[], newTags: string[]) {
    const now = new Date()

    // Update in memory immediately
    for (const id of imageIds) {
      const img = images.value.find(i => i.id === id)
      if (img) {
        const merged = [...new Set([...img.tags, ...newTags])]
        img.tags = merged
        img.updatedAt = now
        // Update in database
        await db.aigcImages.update(id, { tags: merged, updatedAt: now })
      }
    }

    // Update tag counts
    for (const t of newTags) {
      await upsertTag(t, 'manual')
    }

    // Reload tags to get updated counts
    tags.value = await db.tags.toArray()
  }

  // ===== Folder CRUD =====
  async function addFolder(folder: Omit<AIGCFolder, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) {
    const maxOrder = folders.value.reduce((max, f) => Math.max(max, f.sortOrder), 0)
    const now = new Date()
    const id = await db.aigcFolders.add({
      ...folder,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    } as AIGCFolder)
    await loadAll()
    return id
  }

  async function updateFolder(id: number, data: Partial<AIGCFolder>) {
    const now = new Date()

    // Update in memory immediately
    const folder = folders.value.find(f => f.id === id)
    if (folder) {
      Object.assign(folder, data, { updatedAt: now })
    }

    // Update in database in background
    await db.aigcFolders.update(id, { ...data, updatedAt: now })
  }

  async function deleteFolder(id: number) {
    // Update images in memory immediately
    const imagesInFolder = images.value.filter(i => i.folderId === id)
    for (const img of imagesInFolder) {
      img.folderId = null
    }

    // Remove folder from memory
    folders.value = folders.value.filter(f => f.id !== id)

    // Update database in background
    await Promise.all(
      imagesInFolder.map(i => db.aigcImages.update(i.id!, { folderId: null }))
    )
    await db.aigcFolders.delete(id)
  }

  // ===== Tag CRUD =====
  async function upsertTag(name: string, type: 'auto' | 'manual') {
    const existing = await db.tags.where('name').equals(name).first()
    if (existing) {
      await db.tags.update(existing.id!, { count: existing.count + 1 })
    } else {
      await db.tags.add({ name, type, count: 1 } as Tag)
    }
  }

  return {
    images,
    folders,
    tags,
    selectedFolderId,
    searchQuery,
    selectedTags,
    sortField,
    sortOrder,
    isLoading,
    folderNavItems,
    filteredImages,
    loadAll,
    addImage,
    deleteImage,
    deleteImages,
    updateImage,
    toggleImageFavorite,
    moveImagesToFolder,
    batchAddTags,
    addFolder,
    updateFolder,
    deleteFolder,
  }
})
