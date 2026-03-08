<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  Upload, ArrowUpDown,
  Trash2, FolderInput, Tag, CheckSquare, X,
  SlidersHorizontal, PanelLeftClose, PanelLeft,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import SearchBar from '@/components/common/SearchBar.vue'
import DropZone from '@/components/common/DropZone.vue'
import ImageLightbox from '@/components/common/ImageLightbox.vue'
import FolderPanel from '@/components/aigc/FolderPanel.vue'
import ImageCard from '@/components/aigc/ImageCard.vue'
import ImageDetailPanel from '@/components/aigc/ImageDetailPanel.vue'
import type { AIGCImage } from '@/types'

const store = useAigcStore()
const toast = useToast()
const { t } = useI18n()

const sidebarOpen = ref(true)
const detailImageId = ref<number | null>(null)
const detailOpen = ref(false)
const isMobile = ref(false)
const isInitialized = ref(false)

// Computed: always get fresh image data from the store so the detail panel stays reactive
const detailImage = computed<AIGCImage | null>(() => {
  if (detailImageId.value === null) return null
  return store.images.find(i => i.id === detailImageId.value) ?? null
})
const lightboxSrc = ref('')
const lightboxOpen = ref(false)
const isUploading = ref(false)
const uploadProgress = ref(0)
const selectedIds = ref<Set<number>>(new Set())
const selectMode = ref(false)

onMounted(() => {
  store.loadAll()
  // Check if mobile on mount
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    sidebarOpen.value = false
  }
  // Mark as initialized after setting initial state
  setTimeout(() => {
    isInitialized.value = true
  }, 0)
  // Listen for resize
  const handleResize = () => {
    isMobile.value = window.innerWidth < 768
  }
  window.addEventListener('resize', handleResize)
})

// Upload handler
async function handleUpload(files: File[]) {
  isUploading.value = true
  uploadProgress.value = 0
  const total = files.length

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    try {
      // Generate thumbnail
      const thumbnail = await generateThumbnail(file)

      // Create object URL for parsing (needed for stealth PNG)
      const imgSrc = URL.createObjectURL(file)

      // Parse metadata
      const meta = await parseImageMetadata(file, imgSrc)
      URL.revokeObjectURL(imgSrc)

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

      // Determine folder based on current selection
      let folderId: number | null = null
      if (typeof store.selectedFolderId === 'number') {
        folderId = store.selectedFolderId
      }

      await store.addImage({
        folderId,
        filename: file.name,
        imageData: file,
        thumbnail,
        source: meta.source,
        prompt: meta.prompt,
        negativePrompt: meta.negativePrompt,
        parameters: meta.parameters,
        rawMetadata: meta.rawText,
        v4Data: meta.v4Data,
        tags,
        isFavorite: false,
      })
    } catch (err) {
      console.error(`Failed to process ${file.name}:`, err)
      toast.error(t('aigc.uploadFailed', { filename: file.name }))
    }
    uploadProgress.value = Math.round(((i + 1) / total) * 100)
  }

  isUploading.value = false
  uploadProgress.value = 0
  toast.success(t('aigc.uploadSuccess', { count: String(total) }))
}

function viewImage(image: AIGCImage) {
  if (selectMode.value) {
    toggleSelect(image.id!)
    return
  }
  detailImageId.value = image.id ?? null
  detailOpen.value = true
}

function openLightbox(src: string) {
  lightboxSrc.value = src
  lightboxOpen.value = true
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
  <div class="flex h-[calc(100vh-3.5rem)]">
    <!-- Sidebar -->
    <Transition :name="isInitialized ? 'slide-left' : ''">
      <aside
        v-if="sidebarOpen"
        class="w-56 shrink-0 border-r border-border/40 bg-sidebar/95 md:relative fixed top-[3.5rem] md:top-0 bottom-0 left-0 z-[45]"
      >
        <FolderPanel />
      </aside>
    </Transition>

    <!-- Overlay for mobile -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen && isMobile"
        class="fixed inset-0 bg-black/50 z-[44] md:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Toolbar -->
      <div class="border-b border-border/40 bg-background/95 px-4 py-3">
        <div class="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 shrink-0"
            @click="sidebarOpen = !sidebarOpen"
          >
            <PanelLeft v-if="!sidebarOpen" class="h-4 w-4" />
            <PanelLeftClose v-else class="h-4 w-4" />
          </Button>

          <h2 class="text-sm font-semibold shrink-0">{{ currentFolderLabel }}</h2>

          <SearchBar
            v-model="store.searchQuery"
            :placeholder="t('aigc.searchPlaceholder')"
            class="flex-1 max-w-sm"
          />

          <div class="flex items-center gap-1.5 ml-auto">
            <!-- Select mode toggle -->
            <Button
              variant="outline"
              size="sm"
              class="gap-1.5 h-8"
              :class="selectMode && 'bg-primary/10 border-primary/30'"
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
          </div>
        </div>

        <!-- Upload progress -->
        <div v-if="isUploading" class="mt-2">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <div class="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                class="h-full rounded-full bg-primary transition-all duration-300"
                :style="{ width: uploadProgress + '%' }"
              />
            </div>
            <span>{{ uploadProgress }}%</span>
          </div>
        </div>

        <!-- Active tag filters -->
        <div v-if="store.selectedTags.length" class="mt-2 flex items-center gap-1.5 flex-wrap">
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
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Loading -->
        <div v-if="store.isLoading" class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          <div v-for="i in 12" :key="i">
            <Skeleton class="aspect-square w-full rounded-xl" />
            <Skeleton class="h-4 w-3/4 mt-2" />
          </div>
        </div>

        <!-- Empty state: show drop zone -->
        <div v-else-if="store.filteredImages.length === 0 && !store.searchQuery" class="max-w-lg mx-auto mt-8">
          <DropZone @files="handleUpload" />
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
            @files="handleUpload"
            :label="t('aigc.continueUpload')"
            :sublabel="t('aigc.continueUploadHint')"
          />

          <p class="mb-3 text-xs text-muted-foreground">
            {{ t('aigc.imageCount', { count: String(store.filteredImages.length) }) }}
          </p>

          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            <ImageCard
              v-for="image in store.filteredImages"
              :key="image.id"
              :image="image"
              :selected="selectedIds.has(image.id!)"
              @click="viewImage"
              @toggle-favorite="handleToggleFavorite"
            />
          </div>
        </template>
      </div>
    </main>

    <!-- Detail Panel -->
    <ImageDetailPanel
      :image="detailImage"
      :open="detailOpen"
      @update:open="detailOpen = $event"
      @open-lightbox="openLightbox"
    />

    <!-- Lightbox -->
    <ImageLightbox
      :src="lightboxSrc"
      :open="lightboxOpen"
      @update:open="lightboxOpen = $event"
    />
  </div>
</template>
