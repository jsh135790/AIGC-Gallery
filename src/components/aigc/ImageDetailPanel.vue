<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Heart, Trash2, Tag, Maximize2, Edit, FileSearch,
} from 'lucide-vue-next'
import { useAigcStore } from '@/stores/aigcStore'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { useMetadataEditor } from '@/composables/useMetadataEditor'
import { useMetadataInspector } from '@/composables/useMetadataInspector'
import { parseBlobMetadata } from '@/lib/parser'
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
const { inspect } = useMetadataInspector()
const imageUrl = ref('')
const newTag = ref('')
const lightboxOpen = ref(false)
const previewTrigger = ref<HTMLButtonElement | null>(null)
const busy = ref(false)

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

/*
 * 点标签 = 按它筛选图库。面板盖住的正是要筛的网格,所以顺手关掉 ——
 * 不关的话点下去屏幕上什么都不会变,只有工具栏那行筛选芯片悄悄多一个。
 * 多标签是 AND(store.filteredImages 用 every),再点一次同一个标签取消。
 */
function filterByTag(tag: string) {
  store.toggleTagFilter(tag)
  emit('update:open', false)
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

/*
 * 编辑会话不再从库行重建 —— 库行是"当时那个解析器"的产物,而写回时替换的是
 * imageData 本身,所以 blob 永远是最新状态。直接从 blob 重新解析,拿到的就是
 * 文件里真实存在的元数据,与这行何时导入无关。
 *
 * 这一点直接消掉了"中文 prompt 的 SD 图被编辑 → 写侧拿乱码 rawText 当 replay
 * 基准重放"这条路径。
 */
async function handleEditMetadata() {
  if (!props.image?.imageData || busy.value) return
  busy.value = true
  try {
    const parsed = await parseBlobMetadata(props.image.imageData)

    // 门槛看**重新解析出的**来源:旧解析器把一些 SD 图记成 unknown,那不该挡住编辑
    if (parsed.source !== 'sd' && parsed.source !== 'nai') {
      toast.error(t('metadata.editor.unsupported'))
      return
    }

    setEditingImage({
      id: String(props.image.id),
      filename: props.image.filename,
      blob: props.image.imageData,
      metadata: parsed,
      source: parsed.source,
      // setEditingImage 内部对两份都做 clone,同一个对象传两次是安全的
      originalMetadata: parsed,
    })

    router.push('/toolbox?tool=metadata-editor')
  } catch {
    toast.error(t('metadata.editor.parseFailed'))
  } finally {
    busy.value = false
  }
}

/** 查看器对所有来源开放 —— ComfyUI 图被编辑器整体挡着,这是它唯一的查看途径 */
async function handleViewRawMetadata() {
  if (!props.image?.imageData || busy.value) return
  busy.value = true
  try {
    await inspect({
      blob: props.image.imageData,
      filename: props.image.filename,
      imageId: props.image.id,
    })
    router.push('/toolbox?tool=metadata-inspector')
  } catch {
    toast.error(t('inspector.parseFailed'))
  } finally {
    busy.value = false
  }
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
            :title="t('detail.filterByTag')"
            @remove="removeTag"
            @click="filterByTag"
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
        <!--
          查看器对所有来源开放。编辑按钮只对确定写不回去的 ComfyUI 隐藏 ——
          source 为 unknown 的行可能是旧解析器误判,点进去会重新解析再决定。
        -->
        <Button
          variant="outline"
          size="sm"
          class="w-full gap-2"
          :disabled="busy"
          @click="handleViewRawMetadata"
        >
          <FileSearch class="h-4 w-4" />
          {{ t('detail.viewRawMetadata') }}
        </Button>
        <Button
          v-if="image.source !== 'comfyui'"
          variant="outline"
          size="sm"
          class="w-full gap-2"
          :disabled="busy"
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
