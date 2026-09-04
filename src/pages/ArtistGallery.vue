<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Heart, ArrowUpDown, Download, Upload, SlidersHorizontal } from 'lucide-vue-next'
import { useArtistStore } from '@/stores/artistStore'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import SearchBar from '@/components/common/SearchBar.vue'
import AppShell from '@/components/layout/AppShell.vue'
import ArtistGrid from '@/components/gallery/ArtistGrid.vue'
import ArtistForm from '@/components/gallery/ArtistForm.vue'
import ArtistGroupPanel from '@/components/gallery/ArtistGroupPanel.vue'
import type { Artist } from '@/types'

const store = useArtistStore()
const toast = useToast()
const { t, translateCategory } = useI18n()

const formOpen = ref(false)
const editingArtist = ref<Artist | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const currentPageLabel = computed(() => {
  const p = store.pages.find(pg => pg.id === store.selectedPageId)
  return p?.name ?? ''
})

onMounted(() => {
  store.loadAll()
})

function openAdd() {
  editingArtist.value = null
  formOpen.value = true
}

function openEdit(artist: Artist) {
  // Always get the latest data from store to ensure reactivity
  const latestArtist = store.artists.find(a => a.id === artist.id)
  editingArtist.value = latestArtist || artist
  formOpen.value = true
}

async function handleSave(data: Omit<Artist, 'id' | 'createdAt' | 'updatedAt' | 'pageId'> & { pageId?: number | null }) {
  if (editingArtist.value?.id) {
    await store.updateArtist(editingArtist.value.id, data)
    toast.success(t('artist.updated'))
  } else {
    await store.addArtist(data)
    toast.success(t('artist.added'))
  }
}

async function handleDelete(id: number) {
  await store.deleteArtist(id)
  toast.success(t('artist.deleted'))
}

async function handleExport() {
  const json = await store.exportCurrentPage()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `artist-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(t('artist.exportSuccess'))
}

function handleImportClick() {
  fileInput.value?.click()
}

async function handleImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    await store.importArtists(text)
    toast.success(t('artist.importSuccess'))
  } catch {
    toast.error(t('artist.importFailed'))
  }
}

function copyPrompt(_prompt: string) {
  toast.success(t('artist.promptCopied'))
}
</script>

<template>
  <AppShell>
    <template #sidebar>
      <ArtistGroupPanel />
    </template>

    <template #toolbar>
      <SearchBar
        v-model="store.searchQuery"
        :placeholder="t('artist.searchPlaceholder')"
        class="w-full max-w-xs"
      />
      <Select v-model="store.selectedCategory">
        <SelectTrigger class="h-9 w-[120px] shrink-0 bg-muted cursor-pointer">
          <SelectValue :placeholder="t('artist.allCategories')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{{ t('artist.allCategories') }}</SelectItem>
          <SelectItem
            v-for="cat in store.categories.filter(c => c !== 'all')"
            :key="cat"
            :value="cat"
          >
            {{ translateCategory(cat) }}
          </SelectItem>
        </SelectContent>
      </Select>
    </template>

    <template #toolbar-end>
      <Button
        variant="outline"
        size="sm"
        class="gap-1.5 h-8 cursor-pointer"
        :class="store.showFavoritesOnly && 'hair-amber bg-primary/10 text-primary'"
        :aria-label="t('common.favorites')"
        @click="store.showFavoritesOnly = !store.showFavoritesOnly"
      >
        <Heart class="h-4 w-4" :class="store.showFavoritesOnly && 'fill-current'" />
        <span class="hidden sm:inline">{{ t('common.favorites') }}</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" class="gap-1.5 h-8 cursor-pointer" :aria-label="t('common.more')">
            <SlidersHorizontal class="h-4 w-4" />
            <span class="hidden sm:inline">{{ t('common.more') }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @click="handleExport" class="gap-2">
            <Download class="h-4 w-4" />
            {{ t('artist.exportFavorites') }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="handleImportClick" class="gap-2">
            <Upload class="h-4 w-4" />
            {{ t('artist.importData') }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="store.sortField = 'name'; store.sortOrder = 'asc'" class="gap-2">
            <ArrowUpDown class="h-4 w-4" />
            {{ t('artist.sortByName') }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="store.sortField = 'rating'; store.sortOrder = 'desc'" class="gap-2">
            <ArrowUpDown class="h-4 w-4" />
            {{ t('artist.sortByRating') }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="store.sortField = 'createdAt'; store.sortOrder = 'desc'" class="gap-2">
            <ArrowUpDown class="h-4 w-4" />
            {{ t('artist.sortByTime') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" class="gap-1.5 h-8 cursor-pointer" :aria-label="t('artist.addArtist')" @click="openAdd">
        <Plus class="h-4 w-4" />
        <span class="hidden sm:inline">{{ t('artist.addArtist') }}</span>
      </Button>
    </template>

    <!-- Results count -->
    <p class="mb-4 font-mono text-2xs text-muted-foreground">
      {{ t('artist.totalCount', { count: String(store.filteredArtists.length) }) }}
      <span v-if="currentPageLabel"> · {{ currentPageLabel }}</span>
      <span v-if="store.searchQuery">{{ t('artist.searchResult', { query: store.searchQuery }) }}</span>
    </p>

    <!-- Grid -->
    <ArtistGrid
      :artists="store.filteredArtists"
      :is-loading="store.isLoading"
      @toggle-favorite="store.toggleFavorite($event)"
      @view="openEdit"
      @copy="copyPrompt"
      @create-first="openAdd"
    />

    <!-- Add/Edit Form Panel (with delete) -->
    <ArtistForm
      :open="formOpen"
      :edit-artist="editingArtist"
      @update:open="formOpen = $event"
      @save="handleSave"
      @delete="handleDelete"
    />

    <!-- Hidden file input for import -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      class="hidden"
      @change="handleImport"
    />
  </AppShell>
</template>
