<script setup lang="ts">
import { ref, computed } from 'vue'
import { ImagePlus } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const { error } = useToast()

const props = withDefaults(defineProps<{
  accept?: string
  multiple?: boolean
  label?: string
  sublabel?: string
  /** 解析中:掠一道琥珀扫描线(PNG 元数据读取的可见反馈) */
  scanning?: boolean
}>(), {
  accept: 'image/png,image/jpeg,image/webp',
  multiple: true,
  scanning: false,
})

// Use i18n defaults if not provided
const displayLabel = computed(() => props.label ?? t('dropzone.label'))
const displaySublabel = computed(() => props.sublabel ?? t('dropzone.sublabel'))

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
  const dropped = Array.from(e.dataTransfer?.files || [])
  /*
   * 空 `type` 一律放过 —— 部分拖拽源(资源管理器搜索结果、某些压缩工具、
   * Windows 上未注册扩展名)根本不给 MIME,旧的 `startsWith('image/')` 会把
   * 真 PNG 挡在门外。容器判定是解析层用魔数做的(CLAUDE.md 的红线),
   * 这里只需要挡明显不是图片的东西。
   */
  const files = dropped.filter(f => !f.type || f.type.startsWith('image/'))
  if (files.length) {
    emit('files', files)
  } else if (dropped.length) {
    // 全被过滤掉时必须出声:同一个文件点击选择能进、拖进来无声消失最难排查
    error(t('dropzone.rejected'))
  }
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
    class="relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed p-8 transition-all duration-300 cursor-pointer select-none"
    :class="[
      isDragOver
        ? 'border-primary bg-primary/10 scale-[1.01]'
        : 'hover:border-primary/28 hover:bg-accent',
    ]"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="handleClick"
  >
    <!-- 扫描线:1.6s 一趟,reduced-motion 下由 index.css 显式停掉 -->
    <div
      v-if="scanning"
      class="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-transparent via-primary/25 to-transparent"
      aria-hidden="true"
    />

    <div
      class="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
      :class="isDragOver ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
    >
      <ImagePlus class="h-6 w-6" />
    </div>
    <div class="text-center">
      <p class="text-sm font-medium" :class="isDragOver ? 'text-primary' : 'text-foreground'">
        {{ displayLabel }}
      </p>
      <p class="mt-1 text-xs text-muted-foreground">
        {{ displaySublabel }}
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
