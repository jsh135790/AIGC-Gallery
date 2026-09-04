<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Heart, Trash2, Tag, Maximize2, Edit,
} from 'lucide-vue-next'
import { useAigcStore } from '@/stores/aigcStore'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { cloneParsedMetadata, useMetadataEditor } from '@/composables/useMetadataEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import SidePanel from '@/components/common/SidePanel.vue'
import ImageLightbox from '@/components/common/ImageLightbox.vue'
import SectionLabel from '@/components/common/SectionLabel.vue'
import MetadataViewer from './MetadataViewer.vue'
import TagBadge from '@/components/common/TagBadge.vue'
import type { AIGCImage } from '@/types'

const props = defineProps<{
  image: AIGCImage | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const store = useAigcStore()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const { setEditingImage } = useMetadataEditor()
const imageUrl = ref('')
const newTag = ref('')
const lightboxOpen = ref(false)
const previewTrigger = ref<HTMLButtonElement | null>(null)

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

watch([() => props.open, () => props.image?.id], ([open], previous) => {
  const previousImageId = previous?.[1]
  if (!open || props.image?.id !== previousImageId) {
    lightboxOpen.value = false
  }
})

watch(lightboxOpen, (open, wasOpen) => {
  if (wasOpen && !open && props.open && props.image) {
    previewTrigger.value?.focus()
  }
}, { flush: 'post' })

onUnmounted(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
})

function handlePanelOpenChange(value: boolean) {
  if (!value) lightboxOpen.value = false
  emit('update:open', value)
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
    emit('update:open', false)
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

  const imageMetadata = cloneParsedMetadata({
    source: props.image.source,
    prompt: props.image.prompt,
    negativePrompt: props.image.negativePrompt,
    parameters: props.image.parameters,
    rawText: props.image.rawMetadata,
    v4Data: props.image.v4Data,
  })

  setEditingImage({
    id: String(props.image.id),
    filename: props.image.filename,
    blob: props.image.imageData,
    metadata: imageMetadata,
    source: props.image.source,
    originalMetadata: imageMetadata,
  })

  router.push('/toolbox?tool=metadata-editor')
}
</script>

<template>
  <SidePanel
    :open="open && !!image"
    :title="image?.filename ?? ''"
    @update:open="handlePanelOpenChange"
  >
    <template #header-actions>
      <Button
        variant="ghost" size="icon" class="h-8 w-8 cursor-pointer"
        :aria-label="t('common.favorites')"
        @click="toggleFav"
      >
        <Heart class="h-4 w-4" :class="image?.isFavorite ? 'text-primary fill-primary' : ''" />
      </Button>
    </template>

    <div v-if="image" class="p-4 space-y-4">
      <!-- Preview Image -->
      <button
        ref="previewTrigger"
        type="button"
        class="group relative block w-full cursor-pointer overflow-hidden rounded-lg border"
        :aria-label="t('lightbox.open')"
        @click="lightboxOpen = true"
      >
        <img
          :src="imageUrl"
          :alt="image.filename"
          class="w-full object-contain max-h-64 transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <div class="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
          <Maximize2 class="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </button>

      <!-- Metadata -->
      <MetadataViewer :image="image" />

      <Separator />

      <!-- Tags -->
      <div class="space-y-2">
        <SectionLabel>{{ t('detail.tags') }}</SectionLabel>
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
          <Button
            variant="outline"
            size="sm"
            class="h-8 shrink-0"
            :aria-label="t('detail.addTag')"
            @click="addTag"
          >
            <Tag class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Separator />

      <!-- Move to folder -->
      <div class="space-y-2">
        <SectionLabel>{{ t('detail.moveToFolder') }}</SectionLabel>
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
    <ImageLightbox
      v-if="image"
      v-model:open="lightboxOpen"
      :src="imageUrl"
      :filename="image.filename"
      :alt="image.filename"
    />
  </SidePanel>
</template>
