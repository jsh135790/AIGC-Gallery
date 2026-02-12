import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import { db } from '@/lib/db'
import type { Artist, SortOrder } from '@/types'

/** Strip all Vue reactive proxies so IndexedDB can structured-clone the data. */
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

export const useArtistStore = defineStore('artist', () => {
  const artists = ref<Artist[]>([])
  const searchQuery = ref('')
  const selectedCategory = ref<string>('all')
  const sortField = ref<'createdAt' | 'name' | 'rating'>('createdAt')
  const sortOrder = ref<SortOrder>('desc')
  const showFavoritesOnly = ref(false)
  const isLoading = ref(false)

  const filteredArtists = computed(() => {
    let result = [...artists.value]

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

  const categories = computed(() => {
    const cats = new Set(artists.value.map(a => a.category).filter(Boolean))
    return ['all', ...Array.from(cats)]
  })

  async function loadArtists() {
    isLoading.value = true
    try {
      artists.value = await db.artists.toArray()
    } finally {
      isLoading.value = false
    }
  }

  async function addArtist(artist: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date()
    const clean = stripProxy(artist as Record<string, unknown>)
    const id = await db.artists.add({
      ...clean,
      createdAt: now,
      updatedAt: now,
    } as Artist)
    await loadArtists()
    return id
  }

  async function updateArtist(id: number, data: Partial<Artist>) {
    const clean = stripProxy(data as Record<string, unknown>)
    await db.artists.update(id, { ...clean, updatedAt: new Date() })
    await loadArtists()
  }

  async function deleteArtist(id: number) {
    await db.artists.delete(id)
    await loadArtists()
  }

  async function toggleFavorite(id: number) {
    const artist = artists.value.find(a => a.id === id)
    if (artist) {
      await db.artists.update(id, { isFavorite: !artist.isFavorite, updatedAt: new Date() })
      await loadArtists()
    }
  }

  async function exportFavorites(): Promise<string> {
    const favorites = artists.value.filter(a => a.isFavorite)
    const exportData = favorites.map(({ id, images, thumbnails, ...rest }) => rest)
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      version: '2.0',
      type: 'artist-favorites',
      data: exportData,
    }, null, 2)
  }

  async function importArtists(json: string) {
    const parsed = JSON.parse(json)
    const items = parsed.data || parsed.favorites || []
    const now = new Date()
    for (const item of items) {
      await db.artists.add({
        name: item.name || '',
        prompt: item.prompt || '',
        category: item.category || '其他',
        rating: item.rating || 0,
        tags: item.tags || [],
        images: [],
        thumbnails: [],
        isFavorite: item.isFavorite ?? true,
        createdAt: now,
        updatedAt: now,
      } as Artist)
    }
    await loadArtists()
  }

  return {
    artists,
    searchQuery,
    selectedCategory,
    sortField,
    sortOrder,
    showFavoritesOnly,
    isLoading,
    filteredArtists,
    categories,
    loadArtists,
    addArtist,
    updateArtist,
    deleteArtist,
    toggleFavorite,
    exportFavorites,
    importArtists,
  }
})
