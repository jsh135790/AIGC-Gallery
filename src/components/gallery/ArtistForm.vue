<script setup lang="ts">
import { ref, reactive, watch, toRaw, toRef } from 'vue'
import { Plus, X, Star, Upload, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import DropZone from '@/components/common/DropZone.vue'
import { useI18n } from '@/composables/useI18n'
import { useScrollLock } from '@/composables/useScrollLock'
import type { Artist } from '@/types'
import { ARTIST_CATEGORIES } from '@/types'

const props = defineProps<{
  open: boolean
  editArtist?: Artist | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [data: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>]
  delete: [id: number]
}>()

const { t, translateCategory } = useI18n()

// Lock body scroll when panel is open
useScrollLock(toRef(props, 'open'))

const form = reactive({
  name: '',
  prompt: '',
  category: '其他' as string,
  rating: 0,
  tags: [] as string[],
  images: [] as Blob[],
  thumbnails: [] as string[],
  isFavorite: false,
})

const newTag = ref('')
const imagePreviews = ref<string[]>([])

// Pre-fill form when editing - watch editArtist and open state together
watch([() => props.editArtist, () => props.open], ([artist, isOpen]) => {
  // Clean up old preview URLs
  imagePreviews.value.forEach(url => URL.revokeObjectURL(url))
  imagePreviews.value = []

  // Only fill form when panel is opening with an artist
  if (isOpen && artist) {
    form.name = artist.name
    form.prompt = artist.prompt
    form.category = artist.category
    form.rating = artist.rating
    form.tags = [...artist.tags]
    form.images = [...artist.images]
    form.isFavorite = artist.isFavorite

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
  imagePreviews.value.forEach(url => URL.revokeObjectURL(url))
  imagePreviews.value = []
}

function handleFiles(files: File[]) {
  // Only allow 1 image — replace existing
  const file = files[0]
  if (!file) return
  imagePreviews.value.forEach(url => URL.revokeObjectURL(url))
  form.images = [file]
  imagePreviews.value = [URL.createObjectURL(file)]
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

function setRating(n: number) {
  form.rating = form.rating === n ? 0 : n
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

function cancel() {
  emit('update:open', false)
  resetForm()
}
</script>

<template>
  <!-- Backdrop -->
  <Transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 z-40 bg-black/45"
      @click="cancel"
    />
  </Transition>

  <!-- Panel -->
  <Transition name="slide-right">
    <div
      v-if="open"
      class="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg border-l border-border/40 bg-background shadow-2xl overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div>
          <h3 class="text-lg font-semibold">{{ editArtist ? t('artist.editArtist') : t('artist.addArtist') }}</h3>
          <p class="text-sm text-muted-foreground mt-0.5">
            {{ editArtist ? t('artist.editDescription') : t('artist.formDescription') }}
          </p>
        </div>
        <Button variant="ghost" size="icon" class="h-8 w-8" @click="cancel">
          <X class="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea class="flex-1">
        <div class="p-6 space-y-5">
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

          <!-- Category -->
          <div class="space-y-2">
            <label class="text-sm font-medium">{{ t('artist.category') }}</label>
            <Select v-model="form.category">
              <SelectTrigger>
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
            <div class="flex gap-1">
              <button
                v-for="n in 5"
                :key="n"
                class="p-0.5 transition-transform hover:scale-110"
                @click="setRating(n)"
              >
                <Star
                  class="h-5 w-5"
                  :class="n <= form.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'"
                />
              </button>
            </div>
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
              <Button variant="outline" size="icon" @click="addTag">
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
              <div class="group relative aspect-3/4 max-w-[200px] overflow-hidden rounded-lg border border-border/50">
                <img :src="imagePreviews[0]" class="h-full w-full object-cover" />
                <button
                  class="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="removeImage(0)"
                >
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <!-- Footer -->
      <div class="border-t border-border/40 px-6 py-4 flex items-center gap-2">
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
        <Button variant="outline" @click="cancel">{{ t('common.cancel') }}</Button>
        <Button
          @click="save"
          :disabled="!form.name.trim() || !form.prompt.trim()"
        >
          {{ editArtist ? t('artist.saveChanges') : t('artist.addArtist') }}
        </Button>
      </div>
    </div>
  </Transition>
</template>
