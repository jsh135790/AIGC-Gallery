<script setup lang="ts">
import { ref, watch, onUnmounted, computed, toRef } from 'vue'
import { useRouter } from 'vue-router'
import {
  X, Heart, Trash2, FolderInput, Tag,
  ChevronLeft, ChevronRight, Maximize2, Edit,
} from 'lucide-vue-next'
import { useAigcStore } from '@/stores/aigcStore'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { useScrollLock } from '@/composables/useScrollLock'
import { useMetadataEditor } from '@/composables/useMetadataEditor'
import { useBlurEffect } from '@/composables/useBlurEffect'
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
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const { setEditingImage } = useMetadataEditor()
const { blurEnabled } = useBlurEffect()
const imageUrl = ref('')
const newTag = ref('')

// Lock body scroll when panel is open
useScrollLock(toRef(props, 'open'))

// Compute current folder value for the select
const currentFolderValue = computed(() => {
  if (!props.image) return 'none'
  return props.image.folderId ? String(props.image.folderId) : 'none'
})

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
    toast.success(wasFavorite ? t('detail.unfavorited') : t('detail.favorited'))
  }
}

async function deleteImage() {
  if (props.image?.id) {
    await store.deleteImage(props.image.id)
    toast.success(t('detail.imageDeleted'))
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
  // Don't do anything if selecting the same folder
  if (id === currentFolderValue.value) return
  const numId = id === 'none' ? null : parseInt(id)
  await store.moveImagesToFolder([props.image.id], numId)
  toast.success(t('detail.movedToFolder'))
}

function handleEditMetadata() {
  if (!props.image) return

  // Only allow editing for SD and NAI images
  if (props.image.source !== 'sd' && props.image.source !== 'nai') {
    toast.error(t('metadata.editor.unsupported'))
    return
  }

  // Create a new blob URL that will persist across navigation
  const newBlobUrl = URL.createObjectURL(props.image.imageData)

  setEditingImage({
    id: String(props.image.id),
    blob: props.image.imageData,
    src: newBlobUrl,
    metadata: {
      source: props.image.source,
      prompt: props.image.prompt,
      negativePrompt: props.image.negativePrompt,
      parameters: { ...props.image.parameters },
      rawText: props.image.rawMetadata,
      v4Data: props.image.v4Data
    },
    source: props.image.source,
    originalMetadata: {
      source: props.image.source,
      prompt: props.image.prompt,
      negativePrompt: props.image.negativePrompt,
      parameters: { ...props.image.parameters },
      rawText: props.image.rawMetadata,
      v4Data: props.image.v4Data
    }
  })

  router.push('/toolbox?tool=metadata-editor')
}
</script>

<template>
  <!-- Backdrop -->
  <Transition name="fade">
    <div
      v-if="open && image"
      class="fixed inset-0 z-40"
      :class="blurEnabled ? 'bg-black/30 backdrop-blur-sm' : 'bg-black/45'"
      @click="close"
    />
  </Transition>

  <!-- Panel (overlay, not pushing content) -->
  <Transition name="slide-right">
    <div
      v-if="open && image"
      class="fixed right-0 top-14 bottom-0 z-50 w-full max-w-md border-l border-border/40 shadow-2xl overflow-hidden flex flex-col"
      :class="blurEnabled ? 'bg-background/95 backdrop-blur-xl' : 'bg-background'"
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
            <span class="font-medium text-xs uppercase tracking-wider text-muted-foreground">{{ t('detail.tags') }}</span>
            <div class="flex flex-wrap gap-1.5">
              <TagBadge
                v-for="tag in image.tags"
                :key="tag"
                :tag="tag"
                removable
                @remove="removeTag"
              />
              <span v-if="!image.tags.length" class="text-xs text-muted-foreground">{{ t('detail.noTags') }}</span>
            </div>
            <div class="flex gap-2">
              <Input
                v-model="newTag"
                :placeholder="t('detail.addTag')"
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
            <span class="font-medium text-xs uppercase tracking-wider text-muted-foreground">{{ t('detail.moveToFolder') }}</span>
            <Select :model-value="currentFolderValue" @update:model-value="handleMoveFolder">
              <SelectTrigger class="h-8 text-xs">
                <SelectValue :placeholder="t('detail.selectFolder')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{{ t('aigc.uncategorized') }}</SelectItem>
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

          <Separator />

          <!-- Actions -->
          <div class="space-y-2">
            <Button
              v-if="image.source === 'sd' || image.source === 'nai'"
              variant="outline"
              size="sm"
              class="w-full gap-2"
              @click="handleEditMetadata"
            >
              <Edit class="h-4 w-4" />
              {{ t('detail.editMetadata') }}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              class="w-full gap-2"
              @click="deleteImage"
            >
              <Trash2 class="h-4 w-4" />
              {{ t('detail.deleteImage') }}
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  </Transition>
</template>
