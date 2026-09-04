<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  ArrowUpDown, Trash2, CheckSquare, X, LayoutGrid, Columns3,
} from 'lucide-vue-next'
import { useAigcStore } from '@/stores/aigcStore'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { parseImageMetadata, generateThumbnail, getTagsFromPrompt } from '@/lib/parser'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import SearchBar from '@/components/common/SearchBar.vue'
import DropZone from '@/components/common/DropZone.vue'
import SteppedNumber from '@/components/common/SteppedNumber.vue'
import AppShell from '@/components/layout/AppShell.vue'
import FolderPanel from '@/components/aigc/FolderPanel.vue'
import ImageCard from '@/components/aigc/ImageCard.vue'
import MasonryGrid from '@/components/aigc/MasonryGrid.vue'
import ImageDetailPanel from '@/components/aigc/ImageDetailPanel.vue'
import type { AIGCImage } from '@/types'

const store = useAigcStore()
const toast = useToast()
const { t } = useI18n()

const detailImageId = ref<number | null>(null)
const detailOpen = ref(false)

// Computed: always get fresh image data from the store so the detail panel stays reactive
const detailImage = computed<AIGCImage | null>(() => {
  if (detailImageId.value === null) return null
  return store.images.find(i => i.id === detailImageId.value) ?? null
})
const isUploading = ref(false)
const uploadProgress = ref(0)
const selectedIds = ref<Set<number>>(new Set())
const selectMode = ref(false)

// 首屏交错入场只播一次;筛选/排序变化不重播
const hasAnimated = ref(false)
watch(() => store.filteredImages.length, (len) => {
  if (len > 0 && !hasAnimated.value) {
    setTimeout(() => { hasAnimated.value = true }, 800)
  }
}, { immediate: true })

onMounted(() => {
  void store.loadAll().catch((error) => {
    console.error('Failed to load AIGC library:', error)
    toast.error(t('aigc.loadFailed'))
  })
})

// Upload handler
async function handleUpload(files: File[]) {
  if (isUploading.value || files.length === 0) return

  isUploading.value = true
  uploadProgress.value = 0
  const total = files.length
  const drafts: Array<Omit<AIGCImage, 'id' | 'createdAt' | 'updatedAt'>> = []
  let failedCount = 0

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      let parseUrl: string | undefined
      try {
        // Generate thumbnail (also captures original dimensions)
        const { blob: thumbnail, width, height } = await generateThumbnail(file)

        // Stealth PNG parsing requires a temporary object URL.
        parseUrl = URL.createObjectURL(file)
        const meta = await parseImageMetadata(file, parseUrl)

        // Extract tags from prompt (including v4 character prompts)
        const allPrompts: string[] = []
        if (meta.prompt) allPrompts.push(meta.prompt)
        if (meta.v4Data) {
          if (meta.v4Data.basePrompt) allPrompts.push(meta.v4Data.basePrompt)
          for (const char of meta.v4Data.characters) {
            if (char.prompt) allPrompts.push(char.prompt)
          }
        }
        const tags = allPrompts.length > 0
          ? getTagsFromPrompt(allPrompts.join(', '))
          : []

        const folderId = typeof store.selectedFolderId === 'number'
          ? store.selectedFolderId
          : null

        drafts.push({
          folderId,
          filename: file.name,
          imageData: file,
          thumbnail,
          width,
          height,
          source: meta.source,
          prompt: meta.prompt,
          negativePrompt: meta.negativePrompt,
          parameters: meta.parameters,
          rawMetadata: meta.rawText,
          v4Data: meta.v4Data,
          tags,
          isFavorite: false,
        })
      } catch (error) {
        failedCount += 1
        console.error(`Failed to process ${file.name}:`, error)
      } finally {
        if (parseUrl) URL.revokeObjectURL(parseUrl)
        uploadProgress.value = Math.round(((i + 1) / total) * 100)
      }
    }

    let successfulCount = 0
    if (drafts.length > 0) {
      try {
        await store.addImages(drafts)
        successfulCount = drafts.length
      } catch (error) {
        failedCount += drafts.length
        console.error('Failed to save uploaded images:', error)
      }
    }

    if (successfulCount === total) {
      toast.success(t('aigc.uploadSuccess', { count: String(successfulCount) }))
    } else if (successfulCount > 0) {
      toast.error(t('aigc.uploadPartial', {
        success: String(successfulCount),
        failed: String(failedCount),
      }))
    } else {
      toast.error(t('aigc.uploadAllFailed', { count: String(failedCount) }))
    }
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

function viewImage(image: AIGCImage) {
  if (selectMode.value) {
    toggleSelect(image.id!)
    return
  }
  detailImageId.value = image.id ?? null
  detailOpen.value = true
}

function toggleSelect(id: number) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value) // trigger reactivity
}

function selectAll() {
  if (selectedIds.value.size === store.filteredImages.length) {
    selectedIds.value.clear()
  } else {
    selectedIds.value = new Set(store.filteredImages.map(i => i.id!))
  }
  selectedIds.value = new Set(selectedIds.value)
}

function exitSelectMode() {
  selectMode.value = false
  selectedIds.value.clear()
}

async function handleToggleFavorite(id: number) {
  const image = store.images.find(i => i.id === id)
  if (!image) return
  const wasFavorite = image.isFavorite
  await store.toggleImageFavorite(id)
  toast.success(wasFavorite ? t('detail.unfavorited') : t('detail.favorited'))
}

async function batchDelete() {
  const ids = Array.from(selectedIds.value)
  const count = ids.length
  await store.deleteImages(ids)
  selectedIds.value.clear()
  selectMode.value = false
  toast.success(t('aigc.deleteSuccess', { count: String(count) }))
}

// Reactive current nav label
const currentFolderLabel = computed(() => {
  const item = store.folderNavItems.find(f => f.id === store.selectedFolderId)
  if (!item) return t('aigc.allImages')
  // Translate system folder names
  if (item.id === 'all') return t('aigc.allImages')
  if (item.id === 'uncategorized') return t('aigc.uncategorized')
  if (item.id === 'favorites') return t('common.favorites')
  return item.name
})
</script>

<template>
  <AppShell :title="currentFolderLabel" :padded="false">
    <template #sidebar>
      <FolderPanel />
    </template>

    <template #toolbar>
      <SearchBar
        v-model="store.searchQuery"
        :placeholder="t('aigc.searchPlaceholder')"
        class="w-full max-w-xs"
      />
    </template>

    <template #toolbar-end>
      <!-- View mode toggle (grid / masonry) -->
      <div class="hair flex h-8 items-center rounded-md p-0.5">
        <button
          class="flex h-6 w-7 items-center justify-center rounded-sm transition-colors"
          :class="store.viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'"
          :aria-label="t('aigc.viewGrid')"
          :title="t('aigc.viewGrid')"
          @click="store.viewMode = 'grid'"
        >
          <LayoutGrid class="h-3.5 w-3.5" />
        </button>
        <button
          class="flex h-6 w-7 items-center justify-center rounded-sm transition-colors"
          :class="store.viewMode === 'masonry' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'"
          :aria-label="t('aigc.viewMasonry')"
          :title="t('aigc.viewMasonry')"
          @click="store.viewMode = 'masonry'"
        >
          <Columns3 class="h-3.5 w-3.5" />
        </button>
      </div>

      <!-- Select mode toggle -->
      <Button
        variant="outline"
        size="sm"
        class="gap-1.5 h-8"
        :class="selectMode && 'hair-amber bg-primary/10 text-primary'"
        @click="selectMode ? exitSelectMode() : (selectMode = true)"
      >
        <CheckSquare class="h-3.5 w-3.5" />
        <span class="hidden sm:inline text-xs">{{ selectMode ? t('common.exit') : t('common.select') }}</span>
      </Button>

      <!-- Batch actions -->
      <template v-if="selectMode && selectedIds.size > 0">
        <Button variant="outline" size="sm" class="gap-1.5 h-8" @click="selectAll">
          {{ selectedIds.size === store.filteredImages.length ? t('common.deselectAll') : t('common.selectAll') }}
        </Button>
        <Button variant="destructive" size="sm" class="gap-1.5 h-8" @click="batchDelete">
          <Trash2 class="h-3.5 w-3.5" />
          {{ t('aigc.deleteSelected', { count: String(selectedIds.size) }) }}
        </Button>
      </template>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" class="gap-1.5 h-8">
            <ArrowUpDown class="h-3.5 w-3.5" />
            <span class="hidden sm:inline text-xs">{{ t('common.sort') }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem @click="store.sortField = 'createdAt'; store.sortOrder = 'desc'">
            {{ t('aigc.sortNewest') }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="store.sortField = 'createdAt'; store.sortOrder = 'asc'">
            {{ t('aigc.sortOldest') }}
          </DropdownMenuItem>
          <DropdownMenuItem @click="store.sortField = 'filename'; store.sortOrder = 'asc'">
            {{ t('aigc.sortFilename') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </template>

    <template #toolbar-extra>
      <!-- Upload progress -->
      <div v-if="isUploading" class="px-4 pb-2">
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <!-- 解析中的琥珀状态灯:steps(8) 跳变而非平滑呼吸 -->
          <span class="pulse-amber h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <div class="flex-1 h-1.5 rounded-full bg-[var(--hair-soft)] overflow-hidden">
            <div
              class="h-full rounded-full bg-primary transition-all duration-300"
              :style="{ width: uploadProgress + '%' }"
            />
          </div>
          <SteppedNumber :value="uploadProgress" class="font-mono text-2xs" /><span class="font-mono text-2xs">%</span>
        </div>
      </div>

      <!-- Active tag filters -->
      <div v-if="store.selectedTags.length" class="flex items-center gap-1.5 flex-wrap px-4 pb-2">
        <span class="text-xs text-muted-foreground">{{ t('aigc.filterTags') }}</span>
        <Badge
          v-for="tag in store.selectedTags"
          :key="tag"
          variant="secondary"
          class="gap-1 text-xs cursor-pointer"
          @click="store.selectedTags = store.selectedTags.filter(t => t !== tag)"
        >
          {{ tag }}
          <X class="h-3 w-3" />
        </Badge>
      </div>
    </template>

    <div class="p-4">
      <!-- Loading -->
      <div v-if="store.isLoading" class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        <div v-for="i in 12" :key="i">
          <Skeleton class="aspect-square w-full rounded-lg" />
          <Skeleton class="h-4 w-3/4 mt-2" />
        </div>
      </div>

      <!-- Empty state: show drop zone -->
      <div v-else-if="store.filteredImages.length === 0 && !store.searchQuery" class="max-w-lg mx-auto mt-8">
        <DropZone :scanning="isUploading" @files="handleUpload" />
        <p class="mt-4 text-center text-sm text-muted-foreground">
          {{ t('aigc.uploadHint') }}
        </p>
      </div>

      <!-- No results -->
      <div
        v-else-if="store.filteredImages.length === 0 && store.searchQuery"
        class="flex flex-col items-center py-20 text-center"
      >
        <p class="text-muted-foreground">{{ t('aigc.noResults') }}</p>
        <Button variant="link" size="sm" class="mt-2" @click="store.searchQuery = ''">
          {{ t('aigc.clearSearch') }}
        </Button>
      </div>

      <!-- Image Grid -->
      <template v-else>
        <!-- Drop zone banner when images exist -->
        <DropZone
          class="mb-4"
          :scanning="isUploading"
          @files="handleUpload"
          :label="t('aigc.continueUpload')"
          :sublabel="t('aigc.continueUploadHint')"
        />

        <p class="mb-3 font-mono text-2xs text-muted-foreground">
          {{ t('aigc.imageCount', { count: String(store.filteredImages.length) }) }}
        </p>

        <MasonryGrid
          v-if="store.viewMode === 'masonry'"
          :images="store.filteredImages"
          :selected-ids="selectedIds"
          :stagger="!hasAnimated"
          @click="viewImage"
          @toggle-favorite="handleToggleFavorite"
        />
        <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <ImageCard
            v-for="(image, index) in store.filteredImages"
            :key="image.id"
            :image="image"
            :selected="selectedIds.has(image.id!)"
            :class="hasAnimated ? '' : 'stagger-item'"
            :style="hasAnimated ? undefined : { '--stagger-i': index }"
            @click="viewImage"
            @toggle-favorite="handleToggleFavorite"
          />
        </div>
      </template>
    </div>

    <!-- Detail Panel -->
    <ImageDetailPanel
      :image="detailImage"
      :open="detailOpen"
      @update:open="detailOpen = $event"
    />
  </AppShell>
</template>
