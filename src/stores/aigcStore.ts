import { defineStore } from 'pinia'
import { ref, computed, toRaw, watch } from 'vue'
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
  let imageMutationQueue: Promise<void> = Promise.resolve()

  function enqueueImageMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = imageMutationQueue.then(operation)
    imageMutationQueue = result.then(
      () => undefined,
      () => undefined
    )
    return result
  }

  // ===== View mode (grid / masonry), persisted =====
  const VIEW_MODE_KEY = 'aigc.viewMode'
  const viewMode = ref<'grid' | 'masonry'>(
    localStorage.getItem(VIEW_MODE_KEY) === 'masonry' ? 'masonry' : 'grid'
  )
  watch(viewMode, (v) => {
    localStorage.setItem(VIEW_MODE_KEY, v)
  })

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
  async function reconcileTagsFromImages() {
    return db.transaction('rw', db.aigcImages, db.tags, async () => {
      const [storedImages, storedTags] = await Promise.all([
        db.aigcImages.toArray(),
        db.tags.toArray(),
      ])
      const actualCounts = new Map<string, number>()
      for (const image of storedImages) {
        for (const name of uniqueTagNames(image.tags ?? [])) {
          actualCounts.set(name, (actualCounts.get(name) ?? 0) + 1)
        }
      }

      const needsReconciliation =
        storedTags.length !== actualCounts.size ||
        storedTags.some(tag => actualCounts.get(tag.name) !== tag.count)

      if (needsReconciliation) {
        const existingByName = new Map(storedTags.map(tag => [tag.name, tag]))
        for (const tag of storedTags) {
          const actualCount = actualCounts.get(tag.name)
          if (actualCount === undefined) {
            await db.tags.delete(tag.id!)
          } else if (actualCount !== tag.count) {
            await db.tags.update(tag.id!, { count: actualCount })
          }
        }
        for (const [name, count] of actualCounts) {
          if (!existingByName.has(name)) {
            await db.tags.add({ name, type: 'auto', count } as Tag)
          }
        }
        return { storedImages, storedTags: await db.tags.toArray() }
      }

      return { storedImages, storedTags }
    })
  }

  function loadAll() {
    return enqueueImageMutation(async () => {
      isLoading.value = true
      try {
        const [reconciled, flds] = await Promise.all([
          reconcileTagsFromImages(),
          db.aigcFolders.toArray(),
        ])
        images.value = reconciled.storedImages
        folders.value = flds
        tags.value = reconciled.storedTags
      } finally {
        isLoading.value = false
      }
      // Fire-and-forget: backfill dimensions for rows imported before width/height existed
      void backfillImageDims()
    })
  }

  // ===== Dimension backfill (for masonry) =====
  let dimsBackfillStarted = false
  /**
   * 旧数据没有 width/height 字段(瀑布流需要)。对缺失行逐个用缩略图
   * createImageBitmap 量取比例并写回;只跑一次,单行失败跳过不阻塞。
   * 注:量的是缩略图像素(足够算 aspect-ratio),非原图分辨率。
   */
  async function backfillImageDims() {
    if (dimsBackfillStarted) return
    dimsBackfillStarted = true

    const missing = images.value.filter(i => !i.width || !i.height)
    for (const img of missing) {
      try {
        const bitmap = await createImageBitmap(img.thumbnail || img.imageData)
        const width = bitmap.width
        const height = bitmap.height
        bitmap.close()
        if (!width || !height) continue

        // Patch memory + database (non-indexed fields, no schema bump needed)
        img.width = width
        img.height = height
        await db.aigcImages.update(img.id!, { width, height })
      } catch {
        // Skip failed rows silently; they fall back to square in masonry
      }
    }
  }

  function uniqueTagNames(tagNames: string[]) {
    return [...new Set(tagNames)]
  }

  function addTagDelta(deltas: Map<string, number>, tagNames: string[], amount: number) {
    for (const name of uniqueTagNames(tagNames)) {
      deltas.set(name, (deltas.get(name) ?? 0) + amount)
    }
  }

  function tagDeltasForChange(previousTags: string[], nextTags: string[]) {
    const deltas = new Map<string, number>()
    const previous = new Set(previousTags)
    const next = new Set(nextTags)

    for (const name of previous) {
      if (!next.has(name)) deltas.set(name, -1)
    }
    for (const name of next) {
      if (!previous.has(name)) deltas.set(name, 1)
    }
    return deltas
  }

  /** Must run inside an aigcImages/tags read-write transaction. */
  async function applyTagDeltas(deltas: Map<string, number>, defaultType: Tag['type']) {
    for (const [name, delta] of deltas) {
      if (!delta) continue

      const existing = await db.tags.where('name').equals(name).first()
      if (existing) {
        const count = existing.count + delta
        if (count <= 0) {
          await db.tags.delete(existing.id!)
        } else {
          await db.tags.update(existing.id!, { count })
        }
      } else if (delta > 0) {
        await db.tags.add({ name, type: defaultType, count: delta } as Tag)
      }
    }
  }

  // ===== Image CRUD =====
  function addImages(imageDrafts: Array<Omit<AIGCImage, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number[]> {
    return enqueueImageMutation(async () => {
      if (imageDrafts.length === 0) return []

      const now = new Date()
      const records = imageDrafts.map(image => {
        const clean = stripProxy(image as Record<string, unknown>)
        return {
          ...clean,
          tags: uniqueTagNames(image.tags),
          createdAt: now,
          updatedAt: now,
        } as AIGCImage
      })
      const tagDeltas = new Map<string, number>()
      for (const record of records) addTagDelta(tagDeltas, record.tags, 1)

      let ids: number[] = []
      let updatedTags: Tag[] = []
      await db.transaction('rw', db.aigcImages, db.tags, async () => {
        const addedKeys = await db.aigcImages.bulkAdd(records, { allKeys: true })
        ids = addedKeys.map(id => {
          if (id === undefined) throw new Error('Dexie did not return an image ID')
          return id
        })
        await applyTagDeltas(tagDeltas, 'auto')
        updatedTags = await db.tags.toArray()
      })

      images.value = [...images.value, ...records.map((record, index) => ({ ...record, id: ids[index] }))]
      tags.value = updatedTags
      return ids
    })
  }

  async function addImage(image: Omit<AIGCImage, 'id' | 'createdAt' | 'updatedAt'>) {
    const [id] = await addImages([image])
    return id
  }

  async function deleteImage(id: number) {
    await deleteImages([id])
  }

  function deleteImages(ids: number[]) {
    return enqueueImageMutation(async () => {
      const uniqueIds = [...new Set(ids)]
      if (uniqueIds.length === 0) return

      const imageSnapshot = images.value.slice()
      const tagSnapshot = tags.value.map(tag => ({ ...tag }))
      images.value = images.value.filter(image => !uniqueIds.includes(image.id!))

      try {
        let updatedTags: Tag[] = []
        await db.transaction('rw', db.aigcImages, db.tags, async () => {
          const deletedImages = await db.aigcImages.bulkGet(uniqueIds)
          const existingIds = deletedImages.flatMap(image => image?.id ?? [])
          const tagDeltas = new Map<string, number>()
          for (const image of deletedImages) {
            if (image) addTagDelta(tagDeltas, image.tags, -1)
          }

          if (existingIds.length > 0) await db.aigcImages.bulkDelete(existingIds)
          await applyTagDeltas(tagDeltas, 'auto')
          updatedTags = await db.tags.toArray()
        })
        tags.value = updatedTags
      } catch (error) {
        images.value = imageSnapshot
        tags.value = tagSnapshot
        throw error
      }
    })
  }

  function updateImage(id: number, data: Partial<AIGCImage>) {
    return enqueueImageMutation(async () => {
      const clean = stripProxy(data as Record<string, unknown>)
      const now = new Date()
      const hasTags = Object.prototype.hasOwnProperty.call(clean, 'tags')
      if (hasTags) clean.tags = uniqueTagNames(clean.tags as string[])

      const image = images.value.find(item => item.id === id)
      const imageSnapshot = image ? { ...image } : undefined
      const tagSnapshot = tags.value.map(tag => ({ ...tag }))
      if (image) Object.assign(image, clean, { updatedAt: now })

      try {
        let updatedTags: Tag[] | undefined
        await db.transaction('rw', db.aigcImages, db.tags, async () => {
          const storedImage = await db.aigcImages.get(id)
          const updated = await db.aigcImages.update(id, { ...clean, updatedAt: now })
          if (updated && hasTags && storedImage) {
            await applyTagDeltas(tagDeltasForChange(storedImage.tags, clean.tags as string[]), 'manual')
            updatedTags = await db.tags.toArray()
          }
        })
        if (updatedTags) tags.value = updatedTags
      } catch (error) {
        if (image && imageSnapshot) Object.assign(image, imageSnapshot)
        tags.value = tagSnapshot
        throw error
      }
    })
  }

  function toggleImageFavorite(id: number) {
    return enqueueImageMutation(async () => {
      const image = images.value.find(item => item.id === id)
      if (!image) return

      const snapshot = { isFavorite: image.isFavorite, updatedAt: image.updatedAt }
      const newFavoriteState = !image.isFavorite
      const now = new Date()
      image.isFavorite = newFavoriteState
      image.updatedAt = now

      try {
        await db.aigcImages.update(id, { isFavorite: newFavoriteState, updatedAt: now })
      } catch (error) {
        image.isFavorite = snapshot.isFavorite
        image.updatedAt = snapshot.updatedAt
        throw error
      }
    })
  }

  function moveImagesToFolder(imageIds: number[], folderId: number | null) {
    return enqueueImageMutation(async () => {
      const uniqueIds = [...new Set(imageIds)]
      if (uniqueIds.length === 0) return

      const now = new Date()
      const snapshots = new Map<number, Pick<AIGCImage, 'folderId' | 'updatedAt'>>()
      for (const id of uniqueIds) {
        const image = images.value.find(item => item.id === id)
        if (image) {
          snapshots.set(id, { folderId: image.folderId, updatedAt: image.updatedAt })
          image.folderId = folderId
          image.updatedAt = now
        }
      }

      try {
        await db.transaction('rw', db.aigcImages, async () => {
          await Promise.all(
            uniqueIds.map(id => db.aigcImages.update(id, { folderId, updatedAt: now }))
          )
        })
      } catch (error) {
        for (const [id, snapshot] of snapshots) {
          const image = images.value.find(item => item.id === id)
          if (image) Object.assign(image, snapshot)
        }
        throw error
      }
    })
  }

  function batchAddTags(imageIds: number[], newTags: string[]) {
    return enqueueImageMutation(async () => {
      const uniqueIds = [...new Set(imageIds)]
      const uniqueNewTags = uniqueTagNames(newTags)
      if (uniqueIds.length === 0 || uniqueNewTags.length === 0) return

      const now = new Date()
      const imageSnapshots = new Map<number, AIGCImage>()
      const tagSnapshot = tags.value.map(tag => ({ ...tag }))
      for (const id of uniqueIds) {
        const image = images.value.find(item => item.id === id)
        if (image) {
          imageSnapshots.set(id, { ...image })
          const mergedTags = uniqueTagNames([...image.tags, ...uniqueNewTags])
          if (mergedTags.length !== image.tags.length) {
            image.tags = mergedTags
            image.updatedAt = now
          }
        }
      }

      try {
        let updatedTags: Tag[] = []
        await db.transaction('rw', db.aigcImages, db.tags, async () => {
          const storedImages = await db.aigcImages.bulkGet(uniqueIds)
          const tagDeltas = new Map<string, number>()

          for (const image of storedImages) {
            if (!image?.id) continue
            const mergedTags = uniqueTagNames([...image.tags, ...uniqueNewTags])
            const addedTags = mergedTags.filter(name => !image.tags.includes(name))
            if (addedTags.length === 0) continue

            await db.aigcImages.update(image.id, { tags: mergedTags, updatedAt: now })
            addTagDelta(tagDeltas, addedTags, 1)
          }

          await applyTagDeltas(tagDeltas, 'manual')
          updatedTags = await db.tags.toArray()
        })
        tags.value = updatedTags
      } catch (error) {
        for (const [id, snapshot] of imageSnapshots) {
          const image = images.value.find(item => item.id === id)
          if (image) Object.assign(image, snapshot)
        }
        tags.value = tagSnapshot
        throw error
      }
    })
  }

  // ===== Folder CRUD =====
  function addFolder(folder: Omit<AIGCFolder, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) {
    return enqueueImageMutation(async () => {
      const maxOrder = folders.value.reduce((max, item) => Math.max(max, item.sortOrder), 0)
      const now = new Date()
      const clean = stripProxy(folder as Record<string, unknown>)
      const record = {
        ...clean,
        sortOrder: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
      } as AIGCFolder
      const id = await db.aigcFolders.add(record)
      if (id === undefined) throw new Error('Dexie did not return a folder ID')
      folders.value = [...folders.value, { ...record, id }]
      return id
    })
  }

  function updateFolder(id: number, data: Partial<AIGCFolder>) {
    return enqueueImageMutation(async () => {
      const clean = stripProxy(data as Record<string, unknown>)
      const now = new Date()
      const folder = folders.value.find(item => item.id === id)
      const snapshot = folder ? { ...folder } : undefined
      if (folder) Object.assign(folder, clean, { updatedAt: now })

      try {
        await db.aigcFolders.update(id, { ...clean, updatedAt: now })
      } catch (error) {
        if (folder && snapshot) Object.assign(folder, snapshot)
        throw error
      }
    })
  }

  function deleteFolder(id: number) {
    return enqueueImageMutation(async () => {
      const folderSnapshot = folders.value.slice()
      const imageSnapshots = new Map<number, Pick<AIGCImage, 'folderId'>>()
      for (const image of images.value) {
        if (image.folderId === id && image.id !== undefined) {
          imageSnapshots.set(image.id, { folderId: image.folderId })
          image.folderId = null
        }
      }
      folders.value = folders.value.filter(folder => folder.id !== id)

      try {
        await db.transaction('rw', db.aigcImages, db.aigcFolders, async () => {
          await db.aigcImages.where('folderId').equals(id).modify({ folderId: null })
          await db.aigcFolders.delete(id)
        })
      } catch (error) {
        for (const [imageId, snapshot] of imageSnapshots) {
          const image = images.value.find(item => item.id === imageId)
          if (image) Object.assign(image, snapshot)
        }
        folders.value = folderSnapshot
        throw error
      }
    })
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
    viewMode,
    folderNavItems,
    filteredImages,
    loadAll,
    addImages,
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
