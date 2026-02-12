<script setup lang="ts">
import { ref, reactive, watch, toRaw } from 'vue'
import { Plus, X, Star, Upload, Trash2 } from 'lucide-vue-next'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import DropZone from '@/components/common/DropZone.vue'
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

// Pre-fill form when editing
watch(() => props.editArtist, (artist) => {
  if (artist) {
    form.name = artist.name
    form.prompt = artist.prompt
    form.category = artist.category
    form.rating = artist.rating
    form.tags = [...artist.tags]
    form.images = [...artist.images]
    form.isFavorite = artist.isFavorite
    imagePreviews.value = artist.images.map(blob => URL.createObjectURL(blob))
  } else {
    resetForm()
  }
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
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent side="right" class="w-full sm:max-w-lg overflow-y-auto glass-heavy">
      <SheetHeader>
        <SheetTitle>{{ editArtist ? '编辑画师' : '添加画师' }}</SheetTitle>
        <SheetDescription>
          {{ editArtist ? '修改画师信息' : '填写画师串信息并上传示例图片' }}
        </SheetDescription>
      </SheetHeader>

      <div class="mt-6 space-y-5 px-1">
        <!-- Name -->
        <div class="space-y-2">
          <label class="text-sm font-medium">画师名称 <span class="text-destructive">*</span></label>
          <Input v-model="form.name" placeholder="如：wlop" />
        </div>

        <!-- Prompt -->
        <div class="space-y-2">
          <label class="text-sm font-medium">画师串 <span class="text-destructive">*</span></label>
          <Input v-model="form.prompt" placeholder="如：artist:wlop" class="font-mono text-sm" />
        </div>

        <!-- Category -->
        <div class="space-y-2">
          <label class="text-sm font-medium">风格分类</label>
          <Select v-model="form.category">
            <SelectTrigger>
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="cat in ARTIST_CATEGORIES" :key="cat" :value="cat">
                {{ cat }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Rating -->
        <div class="space-y-2">
          <label class="text-sm font-medium">评分</label>
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
          <label class="text-sm font-medium">标签</label>
          <div class="flex gap-2">
            <Input
              v-model="newTag"
              placeholder="输入标签，回车添加"
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
          <label class="text-sm font-medium">示例图片</label>
          <DropZone
            v-if="imagePreviews.length === 0"
            @files="handleFiles"
            :multiple="false"
            label="添加示例图"
            sublabel="1 张示例图片"
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

      <SheetFooter class="mt-6 gap-2">
        <!-- Delete button only when editing -->
        <Button
          v-if="editArtist"
          variant="destructive"
          size="sm"
          class="mr-auto gap-1.5"
          @click="handleDelete"
        >
          <Trash2 class="h-4 w-4" />
          删除画师
        </Button>
        <Button variant="outline" @click="cancel">取消</Button>
        <Button
          @click="save"
          :disabled="!form.name.trim() || !form.prompt.trim()"
        >
          {{ editArtist ? '保存修改' : '添加画师' }}
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
