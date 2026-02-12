<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import {
  X, Heart, Trash2, FolderInput, Tag,
  ChevronLeft, ChevronRight, Maximize2,
} from 'lucide-vue-next'
import { useAigcStore } from '@/stores/aigcStore'
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import MetadataViewer from './MetadataViewer.vue'
import TagBadge from '@/components/common/TagBadge.vue'
import type { AIGCImage } from '@/types'

const props = defineProps<{
  image: AIGCImage | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  openLightbox: [src: string]
}>()

const store = useAigcStore()
const toast = useToast()
const imageUrl = ref('')
const newTag = ref('')
const moveToFolder = ref<string>('')

watch(() => props.image, (img) => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  if (img?.imageData) {
    imageUrl.value = URL.createObjectURL(img.imageData)
  } else {
    imageUrl.value = ''
  }
}, { immediate: true })

onUnmounted(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
})

function close() {
  emit('update:open', false)
}

async function toggleFav() {
  if (props.image?.id) {
    const wasFavorite = props.image.isFavorite
    await store.toggleImageFavorite(props.image.id)
    toast.success(wasFavorite ? '已取消收藏' : '已收藏')
  }
}

async function deleteImage() {
  if (props.image?.id) {
    await store.deleteImage(props.image.id)
    toast.success('图片已删除')
    close()
  }
}

async function addTag() {
  const tag = newTag.value.trim()
  if (!tag || !props.image?.id) return
  const updatedTags = [...new Set([...props.image.tags, tag])]
  await store.updateImage(props.image.id, { tags: updatedTags })
  newTag.value = ''
}

async function removeTag(tag: string) {
  if (!props.image?.id) return
  const updatedTags = props.image.tags.filter(t => t !== tag)
  await store.updateImage(props.image.id, { tags: updatedTags })
}

async function handleMoveFolder(folderId: unknown) {
  if (!props.image?.id) return
  const id = String(folderId)
  const numId = id === 'none' ? null : parseInt(id)
  await store.moveImagesToFolder([props.image.id], numId)
  moveToFolder.value = ''
  toast.success('已移动到分类')
}
</script>

<template>
  <!-- Backdrop -->
  <Transition name="fade">
    <div
      v-if="open && image"
      class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
      @click="close"
    />
  </Transition>

  <!-- Panel (overlay, not pushing content) -->
  <Transition name="slide-right">
    <div
      v-if="open && image"
      class="fixed right-0 top-14 bottom-0 z-50 w-full max-w-md border-l border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <h3 class="text-sm font-semibold truncate flex-1">{{ image.filename }}</h3>
        <div class="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" class="h-8 w-8"
            @click="toggleFav"
          >
            <Heart class="h-4 w-4" :class="image.isFavorite ? 'text-red-400 fill-red-400' : ''" />
          </Button>
          <Button variant="ghost" size="icon" class="h-8 w-8" @click="close">
            <X class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea class="flex-1">
        <div class="p-4 space-y-4">
          <!-- Preview Image -->
          <div
            class="relative overflow-hidden rounded-lg border border-border/40 cursor-pointer group"
            @click="emit('openLightbox', imageUrl)"
          >
            <img
              :src="imageUrl"
              :alt="image.filename"
              class="w-full object-contain max-h-64 transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div class="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
              <Maximize2 class="h-6 w-6 text-white opacity-0 group-hover:opacity-70 transition-opacity" />
            </div>
          </div>

          <!-- Metadata -->
          <MetadataViewer :image="image" />

          <Separator />

          <!-- Tags -->
          <div class="space-y-2">
            <span class="font-medium text-xs uppercase tracking-wider text-muted-foreground">标签</span>
            <div class="flex flex-wrap gap-1.5">
              <TagBadge
                v-for="tag in image.tags"
                :key="tag"
                :tag="tag"
                removable
                @remove="removeTag"
              />
              <span v-if="!image.tags.length" class="text-xs text-muted-foreground">暂无标签</span>
            </div>
            <div class="flex gap-2">
              <Input
                v-model="newTag"
                placeholder="添加标签"
                class="h-8 text-xs"
                @keydown.enter.prevent="addTag"
              />
              <Button variant="outline" size="sm" class="h-8 shrink-0" @click="addTag">
                <Tag class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Separator />

          <!-- Move to folder -->
          <div class="space-y-2">
            <span class="font-medium text-xs uppercase tracking-wider text-muted-foreground">移动到分类</span>
            <Select :model-value="moveToFolder" @update:model-value="handleMoveFolder">
              <SelectTrigger class="h-8 text-xs">
                <SelectValue placeholder="选择分类..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">未分类</SelectItem>
                <SelectItem
                  v-for="folder in store.folders"
                  :key="folder.id"
                  :value="String(folder.id)"
                >
                  {{ folder.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Actions -->
          <div class="pt-2">
            <Button
              variant="destructive"
              size="sm"
              class="w-full gap-2"
              @click="deleteImage"
            >
              <Trash2 class="h-4 w-4" />
              删除图片
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  </Transition>
</template>
