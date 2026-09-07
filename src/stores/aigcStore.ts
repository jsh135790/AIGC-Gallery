import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { db, stripProxy } from '@/lib/db'
import { parseImageMetadata } from '@/lib/parser'
import { DERIVED_FIELDS } from '@/lib/parser/fields'
import type { AIGCImage, AIGCFolder, Tag, SortOrder, FolderNavItem, ImageSource, ParsedMetadata } from '@/types'

/** 扫描能发现的问题种类。每一种都对应一条已知的丢数据路径 */
export type MetadataIssueKind =
  /** 有 chunk 解压失败或结构损坏,正文取不到 */
  | 'decode-failed'
  /** 有 chunk 走了 Latin-1 回退 —— 存量里多半是历史乱码 */
  | 'encoding-fallback'
  /** 库里存的 rawMetadata 与当前解析读出的不一致(旧版把追踪 chunk 拼了进去) */
  | 'raw-mismatch'
  /** 当前解析器能读到库里没有的参数键 */
  | 'missing-params'
  /** 是隐写图但库里没标 */
  | 'stealth-unflagged'
  /** 重新解析识别出了不同的格式 */
  | 'source-mismatch'
  /** 解析出了 v4 角色数据但库里没有 */
  | 'missing-v4'

export interface MetadataScanFinding {
  imageId: number
  filename: string
  storedSource: ImageSource
  parsedSource: ImageSource
  issues: MetadataIssueKind[]
  /** 可以补上的参数键 */
  missingKeys: string[]
}

export interface MetadataScanResult {
  scanned: number
  findings: MetadataScanFinding[]
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

    /*
     * 拷一份再排。`folders.value.sort()` 是就地排序 —— computed 改自己依赖的 reactive
     * 数组,于是「移动到文件夹」下拉的顺序取决于侧栏有没有先渲染过一次。
     */
    const userFolders: FolderNavItem[] = [...folders.value]
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

  /**
   * 点一个标签就筛它,再点一次取消。
   *
   * 在这之前 `selectedTags` 全仓库只有读和删,没有任何地方写入 —— 工具栏那行「筛选标签」
   * 永远不出现,`filteredImages` 的 tag 分支永远不执行。多标签是 AND(沿用上面的 every),
   * 与工具栏已有的移除芯片自然闭合。
   */
  function toggleTagFilter(tag: string) {
    selectedTags.value = selectedTags.value.includes(tag)
      ? selectedTags.value.filter(item => item !== tag)
      : [...selectedTags.value, tag]
  }

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

  // ===== 元数据完整性扫描与回补 =====

  function isEmptyValue(value: unknown): boolean {
    if (value === undefined || value === null || value === '') return true
    if (Array.isArray(value)) return value.length === 0
    return false
  }

  /**
   * 从 blob 重新解析。隐写检测要走 canvas 逐像素读 alpha,几千张图跑不起,
   * 所以只在第一遍认不出任何已知格式时才补一次带 URL 的解析。
   */
  async function reparse(blob: Blob): Promise<ParsedMetadata> {
    const first = await parseImageMetadata(blob)
    if (first.source !== 'unknown') return first

    const url = URL.createObjectURL(blob)
    try {
      return await parseImageMetadata(blob, url)
    } catch {
      return first
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  /** 一行需要回补的内容,扫描与回补共用,避免两处各算一遍 */
  function diffRow(img: AIGCImage, parsed: ParsedMetadata): MetadataScanFinding | null {
    const issues = new Set<MetadataIssueKind>()
    const missingKeys: string[] = []

    for (const entry of parsed.diagnostics?.entries ?? []) {
      if (entry.status === 'decompress-failed' || entry.status === 'malformed') issues.add('decode-failed')
      else if (entry.status === 'encoding-fallback') issues.add('encoding-fallback')
    }

    /*
     * 派生字段(DERIVED_FIELDS)由解析器独占,用户永远碰不到,所以刷新它们一定安全 ——
     * ComfyUI 的 nodeTypes 从"只有核心节点"变成"含自定义节点"就靠这条生效。
     */
    for (const [key, value] of Object.entries(parsed.parameters)) {
      if (isEmptyValue(value)) continue
      const stored = img.parameters?.[key]
      if (isEmptyValue(stored) || DERIVED_FIELDS.has(key)) {
        if (DERIVED_FIELDS.has(key) && String(stored ?? '') === String(value)) continue
        missingKeys.push(key)
      }
    }
    if (missingKeys.length) issues.add('missing-params')

    if (parsed.rawText && parsed.rawText !== img.rawMetadata) issues.add('raw-mismatch')
    if (parsed.stealth && !img.stealth) issues.add('stealth-unflagged')
    if (parsed.source !== img.source) issues.add('source-mismatch')
    if (parsed.v4Data && !img.v4Data) issues.add('missing-v4')

    if (!issues.size) return null
    return {
      imageId: img.id!,
      filename: img.filename,
      storedSource: img.source,
      parsedSource: parsed.source,
      issues: [...issues],
      missingKeys,
    }
  }

  /**
   * 只读扫描。逐张从 imageData 重新解析并与库里的行对比,**不写任何东西**。
   * 先给数字再动手,是这次改动的前提:值不值得回补由这个数字决定。
   */
  async function scanMetadataIntegrity(
    onProgress?: (done: number, total: number) => void
  ): Promise<MetadataScanResult> {
    const rows = images.value.filter(img => img.id !== undefined && img.imageData)
    const findings: MetadataScanFinding[] = []

    for (let i = 0; i < rows.length; i++) {
      const img = rows[i]
      try {
        const finding = diffRow(img, await reparse(img.imageData))
        if (finding) findings.push(finding)
      } catch {
        // 单行解析失败不该中断整次扫描
      }
      onProgress?.(i + 1, rows.length)
    }

    return { scanned: rows.length, findings }
  }

  /**
   * 回补。**只补不覆盖**:
   *  - 参数只填当前为空的键(派生字段例外,它们由解析器独占,刷新总是安全的)
   *  - rawMetadata / stealth / v4Data 修正到当前解析器的读数
   *  - `source` 只从 unknown 升级到已识别格式,已识别的之间绝不互改
   *  - prompt / negativePrompt 只在整行"从未被成功解析过"时补(source 为 unknown
   *    且 prompt 与 parameters 皆空 —— 此时不可能存在用户编辑过的内容)
   *  - tags / isFavorite / folderId / createdAt 一律不动
   *
   * 无脑重解析会清掉用户手动加的 tag 和改过的 prompt,那是不可逆的。
   */
  async function backfillMetadata(
    imageIds?: number[],
    onProgress?: (done: number, total: number) => void
  ): Promise<{ updated: number; failed: number }> {
    const wanted = imageIds ? new Set(imageIds) : null
    const rows = images.value.filter(
      img => img.id !== undefined && img.imageData && (!wanted || wanted.has(img.id))
    )
    let updated = 0
    let failed = 0

    for (let i = 0; i < rows.length; i++) {
      const img = rows[i]
      try {
        const parsed = await reparse(img.imageData)
        const patch: Partial<AIGCImage> = {}

        const nextParams = { ...(img.parameters ?? {}) }
        let paramsTouched = false
        for (const [key, value] of Object.entries(parsed.parameters)) {
          if (isEmptyValue(value)) continue
          const stored = nextParams[key]
          if (!isEmptyValue(stored) && !DERIVED_FIELDS.has(key)) continue
          if (String(stored ?? '') === String(value)) continue
          nextParams[key] = value
          paramsTouched = true
        }
        if (paramsTouched) patch.parameters = nextParams

        if (parsed.rawText && parsed.rawText !== img.rawMetadata) patch.rawMetadata = parsed.rawText
        if (parsed.stealth && !img.stealth) patch.stealth = true
        if (parsed.v4Data && !img.v4Data) patch.v4Data = parsed.v4Data
        if (img.source === 'unknown' && parsed.source !== 'unknown') patch.source = parsed.source

        const neverParsed =
          img.source === 'unknown' && !img.prompt && Object.keys(img.parameters ?? {}).length === 0
        if (neverParsed) {
          if (parsed.prompt) patch.prompt = parsed.prompt
          if (parsed.negativePrompt) patch.negativePrompt = parsed.negativePrompt
        }

        if (Object.keys(patch).length) {
          /*
           * 先写库再改内存。反过来的话(旧实现)DB 抛 DataCloneError 时内存已经改了,
           * 界面报「回补 0 条」而那一行看着像补上了,刷新才复原,重扫永远报同一行。
           *
           * `nextParams` 是新建的 plain object,但逐值读出来的嵌套数组仍是 reactive
           * proxy —— stripProxy 必须是深度的(见 lib/db.ts),否则这里必抛。
           *
           * 刻意不动 updatedAt:回补是修正一次**读取错误**,不是对图片内容的编辑。
           * 走 enqueueImageMutation 是为了不与用户正在做的改标签/移动文件夹抢写。
           */
          const clean = stripProxy(patch)
          await enqueueImageMutation(() => db.aigcImages.update(img.id!, clean))
          Object.assign(img, clean)
          updated++
        }
      } catch (error) {
        // 单行失败跳过,不阻塞其余行 —— 但不许静默:数字要对得上
        failed++
        console.error(`Failed to backfill metadata for image ${img.id}:`, error)
      }
      onProgress?.(i + 1, rows.length)
    }

    return { updated, failed }
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
    deleteImage,
    deleteImages,
    updateImage,
    toggleImageFavorite,
    moveImagesToFolder,
    toggleTagFilter,
    addFolder,
    updateFolder,
    deleteFolder,
    scanMetadataIntegrity,
    backfillMetadata,
  }
})
