<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  Upload, LayoutGrid, List, ArrowUpDown,
  Trash2, FolderInput, Tag, CheckSquare, X,
  SlidersHorizontal, PanelLeftClose, PanelLeft,
} from 'lucide-vue-next'
import { useAigcStore } from '@/stores/aigcStore'
import { useToast } from '@/composables/useToast'
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

const sidebarOpen = ref(true)
const detailImageId = ref<number | null>(null)
const detailOpen = ref(false)

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
      toast.error(`处理 ${file.name} 失败`)
    }
    uploadProgress.value = Math.round(((i + 1) / total) * 100)
  }

  isUploading.value = false
  uploadProgress.value = 0
  toast.success(`成功上传 ${total} 张图片`)
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

async function batchDelete() {
  const ids = Array.from(selectedIds.value)
  const count = ids.length
  await store.deleteImages(ids)
  selectedIds.value.clear()
  selectMode.value = false
  toast.success(`已删除 ${count} 张图片`)
}

// Reactive current nav label
const currentFolderLabel = computed(() => {
  const item = store.folderNavItems.find(f => f.id === store.selectedFolderId)
  return item?.name || '全部图片'
})
</script>

<template>
  <div class="flex h-[calc(100vh-3.5rem)]">
    <!-- Sidebar -->
    <Transition name="slide-left">
      <aside
        v-if="sidebarOpen"
        class="w-56 shrink-0 border-r border-border/40 bg-sidebar/50 backdrop-blur-lg"
      >
        <FolderPanel />
      </aside>
    </Transition>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Toolbar -->
      <div class="border-b border-border/40 bg-background/60 backdrop-blur-sm px-4 py-3">
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
            placeholder="搜索文件名、提示词或标签..."
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
              <span class="hidden sm:inline text-xs">{{ selectMode ? '退出' : '选择' }}</span>
            </Button>

            <!-- Batch actions -->
            <template v-if="selectMode && selectedIds.size > 0">
              <Button variant="outline" size="sm" class="gap-1.5 h-8" @click="selectAll">
                {{ selectedIds.size === store.filteredImages.length ? '取消全选' : '全选' }}
              </Button>
              <Button variant="destructive" size="sm" class="gap-1.5 h-8" @click="batchDelete">
                <Trash2 class="h-3.5 w-3.5" />
                删除 ({{ selectedIds.size }})
              </Button>
            </template>

            <!-- View mode -->
            <div class="flex rounded-md border border-border/50 overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 rounded-none"
                :class="store.viewMode === 'grid' && 'bg-muted'"
                @click="store.viewMode = 'grid'"
              >
                <LayoutGrid class="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 rounded-none border-l border-border/50"
                :class="store.viewMode === 'list' && 'bg-muted'"
                @click="store.viewMode = 'list'"
              >
                <List class="h-3.5 w-3.5" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="outline" size="sm" class="gap-1.5 h-8">
                  <ArrowUpDown class="h-3.5 w-3.5" />
                  <span class="hidden sm:inline text-xs">排序</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem @click="store.sortField = 'createdAt'; store.sortOrder = 'desc'">
                  最新上传
                </DropdownMenuItem>
                <DropdownMenuItem @click="store.sortField = 'createdAt'; store.sortOrder = 'asc'">
                  最早上传
                </DropdownMenuItem>
                <DropdownMenuItem @click="store.sortField = 'filename'; store.sortOrder = 'asc'">
                  文件名 A-Z
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
          <span class="text-xs text-muted-foreground">筛选标签:</span>
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
            上传图片后将自动解析 SD / NovelAI 元数据
          </p>
        </div>

        <!-- No results -->
        <div
          v-else-if="store.filteredImages.length === 0 && store.searchQuery"
          class="flex flex-col items-center py-20 text-center"
        >
          <p class="text-muted-foreground">没有找到匹配的图片</p>
          <Button variant="link" size="sm" class="mt-2" @click="store.searchQuery = ''">
            清除搜索
          </Button>
        </div>

        <!-- Image Grid -->
        <template v-else>
          <!-- Drop zone banner when images exist -->
          <DropZone
            class="mb-4"
            @files="handleUpload"
            label="继续上传图片"
            sublabel="拖拽或点击添加更多图片"
          />

          <p class="mb-3 text-xs text-muted-foreground">
            {{ store.filteredImages.length }} 张图片
          </p>

          <div
            :class="[
              store.viewMode === 'grid'
                ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                : 'space-y-2',
            ]"
          >
            <ImageCard
              v-for="image in store.filteredImages"
              :key="image.id"
              :image="image"
              :selected="selectedIds.has(image.id!)"
              @click="viewImage"
              @toggle-favorite="store.toggleImageFavorite($event)"
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
