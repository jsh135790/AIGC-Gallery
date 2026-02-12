<script setup lang="ts">
import { ref } from 'vue'
import { Upload, ImagePlus } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  accept?: string
  multiple?: boolean
  label?: string
  sublabel?: string
}>(), {
  accept: 'image/png,image/jpeg,image/webp',
  multiple: true,
  label: '拖拽图片到此处上传',
  sublabel: '或点击选择文件 · 支持 PNG / JPEG / WebP',
})

const emit = defineEmits<{
  files: [files: File[]]
}>()

const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const files = Array.from(e.dataTransfer?.files || []).filter(f =>
    f.type.startsWith('image/')
  )
  if (files.length) emit('files', files)
}

function handleClick() {
  fileInput.value?.click()
}

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (files.length) emit('files', files)
  input.value = ''
}
</script>

<template>
  <div
    class="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all duration-300 cursor-pointer select-none"
    :class="[
      isDragOver
        ? 'border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10'
        : 'border-border/60 hover:border-primary/40 hover:bg-muted/30',
    ]"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="handleClick"
  >
    <div
      class="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
      :class="isDragOver ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
    >
      <ImagePlus class="h-6 w-6" />
    </div>
    <div class="text-center">
      <p class="text-sm font-medium" :class="isDragOver ? 'text-primary' : 'text-foreground'">
        {{ label }}
      </p>
      <p class="mt-1 text-xs text-muted-foreground">
        {{ sublabel }}
      </p>
    </div>
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      :multiple="multiple"
      class="hidden"
      @change="handleFileChange"
    />
  </div>
</template>
