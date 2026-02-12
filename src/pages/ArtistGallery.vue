<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Heart, ArrowUpDown, Download, Upload, SlidersHorizontal } from 'lucide-vue-next'
import { useArtistStore } from '@/stores/artistStore'
import { useToast } from '@/composables/useToast'
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
import ArtistGrid from '@/components/gallery/ArtistGrid.vue'
import ArtistForm from '@/components/gallery/ArtistForm.vue'
import type { Artist } from '@/types'

const store = useArtistStore()
const toast = useToast()

const formOpen = ref(false)
const editingArtist = ref<Artist | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  store.loadArtists()
})

function openAdd() {
  editingArtist.value = null
  formOpen.value = true
}

// Clicking a card opens the edit form directly
function openEdit(artist: Artist) {
  editingArtist.value = artist
  formOpen.value = true
}

async function handleSave(data: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>) {
  if (editingArtist.value?.id) {
    await store.updateArtist(editingArtist.value.id, data)
    toast.success('画师信息已更新')
  } else {
    await store.addArtist(data)
    toast.success('画师已添加')
  }
}

async function handleDelete(id: number) {
  await store.deleteArtist(id)
  toast.success('画师已删除')
}

async function handleExport() {
  const json = await store.exportFavorites()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `artist-favorites-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('收藏已导出')
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
    toast.success('数据导入成功')
  } catch {
    toast.error('导入失败，请检查文件格式')
  }
}

function copyPrompt(prompt: string) {
  toast.success('画师串已复制')
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-7xl">
    <!-- Toolbar -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-1 items-center gap-3">
        <SearchBar
          v-model="store.searchQuery"
          placeholder="搜索画师名称、画师串或标签..."
          class="flex-1 max-w-sm"
        />
        <Select v-model="store.selectedCategory">
          <SelectTrigger class="w-[120px] bg-muted/50">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            <SelectItem
              v-for="cat in store.categories.filter(c => c !== 'all')"
              :key="cat"
              :value="cat"
            >
              {{ cat }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          class="gap-1.5"
          :class="store.showFavoritesOnly && 'bg-red-500/10 border-red-500/30 text-red-500'"
          @click="store.showFavoritesOnly = !store.showFavoritesOnly"
        >
          <Heart class="h-4 w-4" :class="store.showFavoritesOnly && 'fill-current'" />
          <span class="hidden sm:inline">收藏</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm" class="gap-1.5">
              <SlidersHorizontal class="h-4 w-4" />
              <span class="hidden sm:inline">更多</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="handleExport" class="gap-2">
              <Download class="h-4 w-4" />
              导出收藏
            </DropdownMenuItem>
            <DropdownMenuItem @click="handleImportClick" class="gap-2">
              <Upload class="h-4 w-4" />
              导入数据
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="store.sortField = 'name'; store.sortOrder = 'asc'" class="gap-2">
              <ArrowUpDown class="h-4 w-4" />
              按名称排序
            </DropdownMenuItem>
            <DropdownMenuItem @click="store.sortField = 'rating'; store.sortOrder = 'desc'" class="gap-2">
              <ArrowUpDown class="h-4 w-4" />
              按评分排序
            </DropdownMenuItem>
            <DropdownMenuItem @click="store.sortField = 'createdAt'; store.sortOrder = 'desc'" class="gap-2">
              <ArrowUpDown class="h-4 w-4" />
              按时间排序
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" class="gap-1.5" @click="openAdd">
          <Plus class="h-4 w-4" />
          <span class="hidden sm:inline">添加画师</span>
        </Button>
      </div>
    </div>

    <!-- Results count -->
    <p class="mb-4 text-sm text-muted-foreground">
      共 {{ store.filteredArtists.length }} 位画师
      <span v-if="store.searchQuery">（搜索: "{{ store.searchQuery }}"）</span>
    </p>

    <!-- Grid -->
    <ArtistGrid
      :artists="store.filteredArtists"
      :is-loading="store.isLoading"
      @toggle-favorite="store.toggleFavorite($event)"
      @view="openEdit"
      @copy="copyPrompt"
    />

    <!-- Add/Edit Form Sheet (with delete) -->
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
  </div>
</template>
