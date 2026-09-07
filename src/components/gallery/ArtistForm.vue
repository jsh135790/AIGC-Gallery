<script setup lang="ts">
import { ref, reactive, watch, toRaw, onUnmounted } from 'vue'
import { Plus, X, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import DropZone from '@/components/common/DropZone.vue'
import SidePanel from '@/components/common/SidePanel.vue'
import StarRating from '@/components/common/StarRating.vue'
import { useI18n } from '@/composables/useI18n'
import { useArtistSettings } from '@/composables/useArtistSettings'
import { useArtistStore } from '@/stores/artistStore'
import type { Artist } from '@/types'
import { ARTIST_CATEGORIES } from '@/types'
import { DEFAULT_SWATCH } from '@/lib/colors'

const props = defineProps<{
  open: boolean
  editArtist?: Artist | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [data: Omit<Artist, 'id' | 'createdAt' | 'updatedAt' | 'pageId'> & { pageId?: number | null }]
  delete: [id: number]
}>()

const { t, translateCategory } = useI18n()
const { autoFillName, autoFillPrefix, customPrefix } = useArtistSettings()
const store = useArtistStore()

const form = reactive({
  name: '',
  prompt: '',
  category: '其他' as string,
  rating: 0,
  tags: [] as string[],
  images: [] as Blob[],
  thumbnails: [] as string[],
  isFavorite: false,
  pageId: null as number | null,
})

const newTag = ref('')
const imagePreviews = ref<string[]>([])

function revokePreviews() {
  imagePreviews.value.forEach(url => URL.revokeObjectURL(url))
  imagePreviews.value = []
}

/*
 * 面板本身是 v-if 卸载的:切走路由(顶栏 → /aigc)时最后一次预览 URL 没人回收,
 * 整张原图 Blob 会活到文档结束,每开一个画师泄漏一份。
 */
onUnmounted(revokePreviews)

// Pre-fill form when editing - watch editArtist and open state together
watch([() => props.editArtist, () => props.open], ([artist, isOpen]) => {
  // Clean up old preview URLs
  revokePreviews()

  // Only fill form when panel is opening with an artist
  if (isOpen && artist) {
    form.name = artist.name
    form.prompt = artist.prompt
    form.category = artist.category
    form.rating = artist.rating
    form.tags = [...artist.tags]
    form.images = [...artist.images]
    form.isFavorite = artist.isFavorite
    form.pageId = artist.pageId ?? store.selectedPageId

    // Generate preview URLs for existing images
    if (artist.images && artist.images.length > 0) {
      imagePreviews.value = artist.images.map(blob => URL.createObjectURL(blob))
    }
  } else if (isOpen && !artist) {
    // Opening for new artist
    resetForm()
  }
  // Don't reset when closing (isOpen === false) to avoid unnecessary operations
}, { immediate: true })

function resetForm() {
  form.name = ''
  form.prompt = ''
  form.category = '其他'
  form.rating = 0
  form.tags = []
  form.images = []
  form.thumbnails = []
  form.isFavorite = false
  form.pageId = store.selectedPageId
  revokePreviews()
}

function handleFiles(files: File[]) {
  const file = files[0]
  if (!file) return
  revokePreviews()
  form.images = [file]
  imagePreviews.value = [URL.createObjectURL(file)]

  if (!props.editArtist && autoFillName.value && !form.name.trim()) {
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    form.name = nameWithoutExt
    if (autoFillPrefix.value && !form.prompt.trim()) {
      form.prompt = `${customPrefix.value}${nameWithoutExt}`
    }
  }
}

function removeImage(index: number) {
  form.images.splice(index, 1)
  URL.revokeObjectURL(imagePreviews.value[index])
  imagePreviews.value.splice(index, 1)
}

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
  }
  newTag.value = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter(t => t !== tag)
}

function save() {
  if (!form.name.trim() || !form.prompt.trim()) return
  const raw = toRaw(form)
  emit('save', {
    name: raw.name,
    prompt: raw.prompt,
    category: raw.category,
    rating: raw.rating,
    tags: [...raw.tags],
    images: Array.from(raw.images),
    thumbnails: [...raw.thumbnails],
    isFavorite: raw.isFavorite,
    pageId: raw.pageId,
  })
  emit('update:open', false)
  resetForm()
}

function handleDelete() {
  if (props.editArtist?.id) {
    emit('delete', props.editArtist.id)
    emit('update:open', false)
    resetForm()
  }
}

function onOpenChange(v: boolean) {
  emit('update:open', v)
  if (!v) resetForm()
}
</script>

<template>
  <SidePanel
    :open="open"
    :title="editArtist ? t('artist.editArtist') : t('artist.addArtist')"
    width-class="sm:max-w-lg"
    @update:open="onOpenChange"
  >
    <div class="p-6 space-y-5">
      <p class="text-sm text-muted-foreground -mt-1">
        {{ editArtist ? t('artist.editDescription') : t('artist.formDescription') }}
      </p>

      <!-- Name -->
      <div class="space-y-2">
        <label class="text-sm font-medium">{{ t('artist.name') }} <span class="text-destructive">*</span></label>
        <Input v-model="form.name" placeholder="wlop" />
      </div>

      <!-- Prompt -->
      <div class="space-y-2">
        <label class="text-sm font-medium">{{ t('artist.prompt') }} <span class="text-destructive">*</span></label>
        <Input v-model="form.prompt" placeholder="artist:wlop" class="font-mono text-sm" />
      </div>

      <!-- Page (group) -->
      <div class="space-y-2" v-if="store.sortedPages.length > 0">
        <label class="text-sm font-medium">{{ t('artist.belongTo') }}</label>
        <Select
          :model-value="form.pageId != null ? String(form.pageId) : ''"
          @update:model-value="v => form.pageId = v ? Number(v) : null"
        >
          <SelectTrigger class="cursor-pointer">
            <SelectValue :placeholder="t('artistPage.title')" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="page in store.sortedPages"
              :key="page.id"
              :value="String(page.id)"
            >
              <span class="inline-flex items-center gap-2">
                <span
                  class="h-2 w-2 rounded-full"
                  :style="{ backgroundColor: page.color || DEFAULT_SWATCH }"
                />
                {{ page.name }}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Category -->
      <div class="space-y-2">
        <label class="text-sm font-medium">{{ t('artist.category') }}</label>
        <Select v-model="form.category">
          <SelectTrigger class="cursor-pointer">
            <SelectValue :placeholder="translateCategory(form.category)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="cat in ARTIST_CATEGORIES" :key="cat" :value="cat">
              {{ translateCategory(cat) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Rating -->
      <div class="space-y-2">
        <label class="text-sm font-medium">{{ t('artist.rating') }}</label>
        <StarRating v-model="form.rating" />
      </div>

      <!-- Tags -->
      <div class="space-y-2">
        <label class="text-sm font-medium">{{ t('artist.tags') }}</label>
        <div class="flex gap-2">
          <Input
            v-model="newTag"
            :placeholder="t('artist.tagInputPlaceholder')"
            class="flex-1"
            @keydown.enter.prevent="addTag"
          />
          <Button variant="outline" size="icon" class="h-9 w-9" @click="addTag">
            <Plus class="h-4 w-4" />
          </Button>
        </div>
        <div v-if="form.tags.length" class="flex flex-wrap gap-1.5 pt-1">
          <Badge
            v-for="tag in form.tags"
            :key="tag"
            variant="secondary"
            class="gap-1 cursor-pointer"
            @click="removeTag(tag)"
          >
            {{ tag }}
            <X class="h-3 w-3" />
          </Badge>
        </div>
      </div>

      <!-- Image (single) -->
      <div class="space-y-2">
        <label class="text-sm font-medium">{{ t('artist.sampleImage') }}</label>
        <DropZone
          v-if="imagePreviews.length === 0"
          @files="handleFiles"
          :multiple="false"
          :label="t('artist.addSampleImage')"
          :sublabel="t('artist.sampleImageHint')"
        />
        <div v-if="imagePreviews.length" class="pt-2">
          <div class="group relative aspect-3/4 max-w-[200px] overflow-hidden rounded-lg border">
            <img :src="imagePreviews[0]" class="h-full w-full object-cover" />
            <button
              class="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm hover:bg-background opacity-0 transition-opacity group-hover:opacity-100"
              @click="removeImage(0)"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center gap-2">
        <!-- Delete button only when editing -->
        <Button
          v-if="editArtist"
          variant="destructive"
          size="sm"
          class="mr-auto gap-1.5"
          @click="handleDelete"
        >
          <Trash2 class="h-4 w-4" />
          {{ t('artist.deleteArtist') }}
        </Button>
        <Button variant="outline" class="ml-auto" @click="onOpenChange(false)">{{ t('common.cancel') }}</Button>
        <Button
          @click="save"
          :disabled="!form.name.trim() || !form.prompt.trim()"
        >
          {{ editArtist ? t('artist.saveChanges') : t('artist.addArtist') }}
        </Button>
      </div>
    </template>
  </SidePanel>
</template>
