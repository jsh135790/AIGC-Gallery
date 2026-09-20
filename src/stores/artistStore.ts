import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { db, stripProxy } from '@/lib/db'
import { DEFAULT_SWATCH } from '@/lib/colors'
import { coordinatedWrite } from '@/lib/storage/coordination'
import { ARTIST_CATEGORIES } from '@/types'
import type { Artist, ArtistPage, SortOrder } from '@/types'

const DEFAULT_PAGE_COLOR = DEFAULT_SWATCH
const SELECTED_PAGE_KEY = 'artistGallery.selectedPageId'

export const useArtistStore = defineStore('artist', () => {
  const artists = ref<Artist[]>([])
  const pages = ref<ArtistPage[]>([])
  const selectedPageId = ref<number | null>(null)
  const searchQuery = ref('')
  const selectedCategory = ref<string>('all')
  const sortField = ref<'createdAt' | 'name' | 'rating'>('createdAt')
  const sortOrder = ref<SortOrder>('desc')
  const showFavoritesOnly = ref(false)
  const isLoading = ref(false)

  // Persist selected page across sessions
  watch(selectedPageId, (id) => {
    if (id != null) {
      try { localStorage.setItem(SELECTED_PAGE_KEY, String(id)) } catch { /* ignore */ }
    }
  })

  const sortedPages = computed(() =>
    [...pages.value].sort((a, b) => a.sortOrder - b.sortOrder)
  )

  /** Artist count per page id, derived for sidebar/tab badge. */
  const pageCounts = computed<Record<number, number>>(() => {
    const counts: Record<number, number> = {}
    for (const p of pages.value) {
      if (p.id != null) counts[p.id] = 0
    }
    for (const a of artists.value) {
      if (a.pageId != null && counts[a.pageId] != null) counts[a.pageId]++
    }
    return counts
  })

  const filteredArtists = computed(() => {
    // 1) restrict to selected page
    let result = selectedPageId.value == null
      ? [...artists.value]
      : artists.value.filter(a => a.pageId === selectedPageId.value)

    if (showFavoritesOnly.value) {
      result = result.filter(a => a.isFavorite)
    }

    if (selectedCategory.value !== 'all') {
      result = result.filter(a => a.category === selectedCategory.value)
    }

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.prompt.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortField.value === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortField.value === 'rating') {
        cmp = (a.rating || 0) - (b.rating || 0)
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      return sortOrder.value === 'desc' ? -cmp : cmp
    })

    return result
  })

  const BUILTIN_CATEGORIES = new Set<string>(ARTIST_CATEGORIES)

  /** 内置分类按固定顺序在前、自定义分类按本地化排序在后;永远在新数组上排,不动 ARTIST_CATEGORIES */
  function orderCategories(present: Set<string>) {
    const custom = [...present].filter(c => !BUILTIN_CATEGORIES.has(c)).sort((a, b) => a.localeCompare(b))
    return [...ARTIST_CATEGORIES.filter(c => present.has(c)), ...custom]
  }

  /** Categories within the current page only(筛选器用)。 */
  const categories = computed(() => {
    const source = selectedPageId.value == null
      ? artists.value
      : artists.value.filter(a => a.pageId === selectedPageId.value)
    const present = new Set(source.map(a => a.category).filter(Boolean))
    return ['all', ...orderCategories(present)]
  })

  /**
   * 表单选项:九个内置全部保留(零画师也在),再加全库出现过的自定义值 —— 跨分组复用同一个自定义分类。
   * 分类即数据:没有独立的分类表,自定义分类只活在画师行上,最后一个画师改走它就消失(同标签)。
   */
  const categoryOptions = computed(() => {
    const present = new Set<string>(ARTIST_CATEGORIES)
    for (const a of artists.value) if (a.category) present.add(a.category)
    return orderCategories(present)
  })

  // 切分组 / 删掉某分类最后一个画师之后,选中的分类不在列表里了 → 回「全部」,否则列表会无声清空
  watch(categories, list => {
    if (selectedCategory.value !== 'all' && !list.includes(selectedCategory.value)) selectedCategory.value = 'all'
  })

  // ===== Pages =====

  async function loadPages() {
    // 两个空库页面同时启动时也只能创建一个默认分组，否则会误判成非空库。
    const loaded = await db.transaction('rw', db.artistPages, async () => {
      let stored = await db.artistPages.toArray()
      let createdId: number | null = null
      if (stored.length === 0) {
        const now = new Date()
        createdId = (await db.artistPages.add({
          name: '默认分组',
          isBootstrap: true,
          color: DEFAULT_PAGE_COLOR,
          icon: 'Folder',
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        })) as number
        stored = await db.artistPages.toArray()
      }
      return { stored, createdId: createdId ?? null }
    })
    pages.value = loaded.stored
    return loaded.createdId
  }

  async function addPage(data: { name: string; color?: string; icon?: string }) {
    const now = new Date()
    const maxOrder = pages.value.reduce((m, p) => Math.max(m, p.sortOrder), -1)
    const id = await db.artistPages.add({
      name: data.name,
      color: data.color || DEFAULT_PAGE_COLOR,
      icon: data.icon || 'Folder',
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    } as ArtistPage)
    pages.value = await db.artistPages.toArray()
    return id as number
  }

  /*
   * 以下写操作全部是「先改内存、再写库」的乐观更新,与 aigcStore 同形:
   * 每一处都先留快照,DB 抛错(配额、结构化克隆失败)时把内存恢复原样再往上抛。
   * 少了这一步的表现是:界面显示改动成功,刷新后无声复原 —— 删除画师尤其致命。
   */
  async function updatePage(id: number, data: Partial<ArtistPage>) {
    data = { ...data, isBootstrap: false }
    const now = new Date()
    const page = pages.value.find(p => p.id === id)
    const snapshot = page ? { ...page } : undefined
    if (page) Object.assign(page, data, { updatedAt: now })

    try {
      await db.artistPages.update(id, { ...stripProxy(data), updatedAt: now })
    } catch (error) {
      if (page && snapshot) Object.assign(page, snapshot)
      throw error
    }
  }

  /**
   * Delete a page. Refuses to delete the very last page.
   * Surviving artists are moved to the first remaining page (by sortOrder).
   */
  async function deletePage(id: number): Promise<{ ok: boolean; reason?: 'last' }> {
    if (pages.value.length <= 1) return { ok: false, reason: 'last' }

    const remaining = sortedPages.value.filter(p => p.id !== id)
    const fallbackId = remaining[0]?.id
    if (fallbackId == null) return { ok: false, reason: 'last' }

    // Memory: reassign artists, drop page
    const now = new Date()
    const orphans = artists.value.filter(a => a.pageId === id)
    const orphanSnapshots = orphans.map(a => ({ artist: a, pageId: a.pageId, updatedAt: a.updatedAt }))
    const pageSnapshot = pages.value.slice()
    const selectedSnapshot = selectedPageId.value
    for (const a of orphans) {
      a.pageId = fallbackId
      a.updatedAt = now
    }
    pages.value = pages.value.filter(p => p.id !== id)

    if (selectedPageId.value === id) {
      selectedPageId.value = fallbackId
    }

    try {
      // DB: 一个事务里批量改派再删分组,不再 N 次 update(每次都是整行读写,画师行含原图 Blob)
      await db.transaction('rw', db.artists, db.artistPages, async () => {
        if (orphans.length) {
          await db.artists.bulkUpdate(orphans.map(a => ({ key: a.id!, changes: { pageId: fallbackId, updatedAt: now } })))
        }
        await db.artistPages.delete(id)
      })
    } catch (error) {
      for (const snap of orphanSnapshots) {
        snap.artist.pageId = snap.pageId
        snap.artist.updatedAt = snap.updatedAt
      }
      pages.value = pageSnapshot
      selectedPageId.value = selectedSnapshot
      throw error
    }
    return { ok: true }
  }

  async function reorderPages(orderedIds: number[]) {
    const now = new Date()
    const snapshots = pages.value.map(p => ({ page: p, sortOrder: p.sortOrder, updatedAt: p.updatedAt }))
    orderedIds.forEach((id, idx) => {
      const p = pages.value.find(pg => pg.id === id)
      if (p) {
        p.sortOrder = idx
        p.updatedAt = now
      }
    })

    try {
      await db.artistPages.bulkUpdate(orderedIds.map((id, idx) => ({ key: id, changes: { sortOrder: idx, updatedAt: now } })))
    } catch (error) {
      for (const snap of snapshots) {
        snap.page.sortOrder = snap.sortOrder
        snap.page.updatedAt = snap.updatedAt
      }
      throw error
    }
  }

  async function movePageUp(id: number) {
    const arr = sortedPages.value
    const idx = arr.findIndex(p => p.id === id)
    if (idx <= 0) return
    const newOrder = arr.map(p => p.id!).filter((x): x is number => typeof x === 'number')
    ;[newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]]
    await reorderPages(newOrder)
  }

  async function movePageDown(id: number) {
    const arr = sortedPages.value
    const idx = arr.findIndex(p => p.id === id)
    if (idx < 0 || idx >= arr.length - 1) return
    const newOrder = arr.map(p => p.id!).filter((x): x is number => typeof x === 'number')
    ;[newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]]
    await reorderPages(newOrder)
  }

  // ===== Artists =====

  async function loadArtists() {
    artists.value = await db.artists.toArray()
  }

  /** Boot sequence: pages first (so we know the default), then artists. */
  async function loadAll() {
    isLoading.value = true
    try {
      await loadPages()
      await loadArtists()

      // Restore last-selected page if still valid, otherwise pick the first.
      const stored = (() => {
        try { return localStorage.getItem(SELECTED_PAGE_KEY) } catch { return null }
      })()
      const storedId = stored ? Number(stored) : NaN
      const exists = !Number.isNaN(storedId) && pages.value.some(p => p.id === storedId)
      if (exists) {
        selectedPageId.value = storedId
      } else {
        selectedPageId.value = sortedPages.value[0]?.id ?? null
      }

      // Heal any orphan artists left over from a partial migration: assign to default page.
      const validIds = new Set(pages.value.map(p => p.id))
      const fallbackId = sortedPages.value[0]?.id
      if (fallbackId != null) {
        const orphans = artists.value.filter(a => a.pageId == null || !validIds.has(a.pageId))
        if (orphans.length > 0) {
          const now = new Date()
          for (const a of orphans) {
            a.pageId = fallbackId
            a.updatedAt = now
          }
          await db.artists.bulkUpdate(orphans.map(a => ({ key: a.id!, changes: { pageId: fallbackId, updatedAt: now } })))
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  async function addArtist(
    artist: Omit<Artist, 'id' | 'createdAt' | 'updatedAt' | 'pageId'> & { pageId?: number | null }
  ) {
    const now = new Date()
    const clean = stripProxy(artist as Record<string, unknown>)
    const targetPageId = (artist.pageId ?? selectedPageId.value) ?? sortedPages.value[0]?.id ?? null
    const row = { ...clean, pageId: targetPageId, createdAt: now, updatedAt: now } as Artist
    const id = await db.artists.add(row)
    // 直接把写入的行推进内存,不再整表重读(重读会把所有画师连原图 Blob 一起再拉一遍)
    artists.value.push({ ...row, id })
    return id
  }

  async function updateArtist(id: number, data: Partial<Artist>) {
    const clean = stripProxy(data)
    const now = new Date()

    const artist = artists.value.find(a => a.id === id)
    // 浅拷贝够用:images 是整体替换而不是原地改,恢复引用即可回到原样
    const snapshot = artist ? { ...artist } : undefined
    if (artist) {
      if (clean.images) {
        artist.images = Array.from(clean.images)
      }
      Object.assign(artist, { ...clean, updatedAt: now })
    }

    try {
      await db.artists.update(id, { ...clean, updatedAt: now })
    } catch (error) {
      if (artist && snapshot) Object.assign(artist, snapshot)
      throw error
    }
  }

  async function deleteArtist(id: number) {
    const snapshot = artists.value.slice()
    artists.value = artists.value.filter(a => a.id !== id)
    try {
      await db.artists.delete(id)
    } catch (error) {
      artists.value = snapshot
      throw error
    }
  }

  async function toggleFavorite(id: number) {
    const artist = artists.value.find(a => a.id === id)
    if (!artist) return

    const snapshot = { isFavorite: artist.isFavorite, updatedAt: artist.updatedAt }
    const newFavoriteState = !artist.isFavorite
    const now = new Date()
    artist.isFavorite = newFavoriteState
    artist.updatedAt = now

    try {
      await db.artists.update(id, { isFavorite: newFavoriteState, updatedAt: now })
    } catch (error) {
      artist.isFavorite = snapshot.isFavorite
      artist.updatedAt = snapshot.updatedAt
      throw error
    }
  }

  // ===== Import / Export =====

  /**
   * Export shape (back-compat readable by older importers since `data` is still the artist list):
   * { version, type, pageName, data: [{...artist}] }
   * Exports every artist in the currently selected page (regardless of favorite state).
   * When no page is selected, exports all artists.
   */
  async function exportCurrentPage(): Promise<string> {
    const pageById = new Map(pages.value.map(p => [p.id, p]))
    const items = selectedPageId.value == null
      ? artists.value
      : artists.value.filter(a => a.pageId === selectedPageId.value)
    const exportData = items.map(({ id, images, thumbnails, pageId, ...rest }) => ({ ...rest }))
    const currentPageName = selectedPageId.value != null
      ? pageById.get(selectedPageId.value)?.name ?? null
      : null
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      version: '3.0',
      type: 'artist-page',
      pageName: currentPageName,
      data: exportData,
    }, null, 2)
  }

  /**
   * Import handling: parse the artist list and add every item to the currently
   * selected page (falling back to the first page when none is selected).
   * Any page metadata in the file is ignored on purpose.
   */
  async function importArtists(json: string) {
    const parsed = JSON.parse(json)
    const items = parsed.data || parsed.favorites || []
    const now = new Date()

    const targetPageId = selectedPageId.value ?? sortedPages.value[0]?.id ?? null

    type ImportedArtist = Partial<Pick<Artist, 'name' | 'prompt' | 'category' | 'rating' | 'tags' | 'isFavorite'>>
    const rows: Artist[] = (items as ImportedArtist[]).map(item => ({
      name: item.name || '',
      prompt: item.prompt || '',
      category: item.category || '其他',
      rating: item.rating || 0,
      tags: item.tags || [],
      images: [],
      thumbnails: [],
      isFavorite: item.isFavorite ?? false,
      pageId: targetPageId,
      createdAt: now,
      updatedAt: now,
    }))
    if (!rows.length) return
    // 包在事务里:bulkAdd 遇单行失败会继续并在最后抛 BulkError,不包事务就留下「前半已入库、
    // 内存没更新」的分叉;事务内整体回滚,内存不动。成功后按返回的 id 推进内存,不整表重读。
    const ids = await db.transaction('rw', db.artists, () => db.artists.bulkAdd(rows, { allKeys: true }))
    artists.value.push(...rows.map((row, index) => ({ ...row, id: ids[index] })))
  }

  return {
    // state
    artists,
    pages,
    selectedPageId,
    searchQuery,
    selectedCategory,
    sortField,
    sortOrder,
    showFavoritesOnly,
    isLoading,
    // computed
    sortedPages,
    pageCounts,
    filteredArtists,
    categories,
    categoryOptions,
    // pages
    loadAll: coordinatedWrite(loadAll),
    addPage: coordinatedWrite(addPage),
    updatePage: coordinatedWrite(updatePage),
    deletePage: coordinatedWrite(deletePage),
    movePageUp: coordinatedWrite(movePageUp),
    movePageDown: coordinatedWrite(movePageDown),
    // artists
    addArtist: coordinatedWrite(addArtist),
    updateArtist: coordinatedWrite(updateArtist),
    deleteArtist: coordinatedWrite(deleteArtist),
    toggleFavorite: coordinatedWrite(toggleFavorite),
    // import/export
    exportCurrentPage,
    importArtists: coordinatedWrite(importArtists),
  }
})
