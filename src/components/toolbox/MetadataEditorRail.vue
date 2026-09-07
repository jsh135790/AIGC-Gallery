<script setup lang="ts">
import { computed, ref } from 'vue'
import { Expand, Upload } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'
import { formatBytes } from '@/lib/format'
import type { ImageSource } from '@/types'

/*
 * 左栏:原图 + 读出 + 换图 + 警告位。
 *
 * 预览封在 max-h-[38vh] 里 —— 旧版是 `<img class="w-full h-auto">`,一张 1024×1536
 * 的竖图能把整页拉到三屏长,操作按钮全被推到滚动底部。
 */
const props = defineProps<{
  imageUrl: string
  filename: string
  fileSize: number
  source: ImageSource
  /** 导出 / 回写进行中。此时不许换图:写回流程在 await 前捕获了会话 */
  busy?: boolean
}>()

const emit = defineEmits<{
  expand: []
  'pick-file': [file: File]
}>()

const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const naturalWidth = ref(0)
const naturalHeight = ref(0)

const dimensions = computed(() =>
  naturalWidth.value && naturalHeight.value ? `${naturalWidth.value}×${naturalHeight.value}` : '—'
)

const sizeText = computed(() => formatBytes(props.fileSize))

const formatText = computed(() => {
  const ext = props.filename.split('.').pop()
  return ext && ext !== props.filename ? ext.toUpperCase() : 'PNG'
})

/*
 * 刻意用短写(SD WebUI / NovelAI)。查看器那份 SOURCE_LABELS 给的是全称
 * (Stable Diffusion),两者不合并 —— 这一栏是窄栏读出,全称会换行。
 */
const sourceLabel = computed(() => {
  if (props.source === 'sd') return 'SD WebUI'
  if (props.source === 'nai') return 'NovelAI'
  if (props.source === 'comfyui') return 'ComfyUI'
  return t('metadata.editor.noMetadata')
})

function onImageLoad(event: Event) {
  const img = event.currentTarget as HTMLImageElement
  naturalWidth.value = img.naturalWidth
  naturalHeight.value = img.naturalHeight
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('pick-file', file)
  input.value = ''
}
</script>

<template>
  <div
    class="flex flex-col items-stretch gap-3.5 border-b p-4 sm:flex-row sm:items-start lg:min-h-0 lg:flex-col lg:items-stretch lg:overflow-y-auto lg:border-b-0 lg:border-r"
  >
    <!--
      版式随宽度走三段:窄屏竖排 → sm 起横排(预览缩到 168px,读出挪到右边)
      → lg 起回到竖栏并自己吃满高度、自己滚动。
      注释放在根元素里面 —— 顶层注释会让组件编译成 fragment 根。
    -->
    <button
      type="button"
      class="hair group relative flex max-h-[38vh] min-h-[8rem] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background sm:w-42 lg:w-full"
      :title="t('lightbox.open')"
      @click="emit('expand')"
    >
      <img
        :src="imageUrl"
        :alt="filename"
        class="block max-h-[38vh] w-full object-contain"
        @load="onImageLoad"
      />
      <span
        class="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-[opacity,background-color] duration-200 group-hover:bg-black/35 group-hover:opacity-100"
      >
        <Expand class="h-5 w-5" />
      </span>
    </button>

    <div class="flex min-w-0 flex-1 flex-col gap-3">
      <div class="flex flex-col gap-1.5">
        <div class="flex items-baseline justify-between gap-2">
          <span class="micro">{{ t('metadata.editor.dimensions') }}</span>
          <span class="readout truncate text-2xs font-medium">{{ dimensions }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-2">
          <span class="micro">{{ t('metadata.editor.fileSize') }}</span>
          <span class="readout truncate text-2xs font-medium">{{ sizeText }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-2">
          <span class="micro">{{ t('metadata.editor.format') }}</span>
          <span class="readout truncate text-2xs font-medium">{{ formatText }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-2">
          <span class="micro">{{ t('metadata.source') }}</span>
          <span class="readout truncate text-2xs font-medium">{{ sourceLabel }}</span>
        </div>
        <!-- 文件名单独占一行:224px 栏宽下 26 字符的等宽名能整条放下,不用截断 -->
        <div class="flex flex-col gap-0.5">
          <span class="micro">{{ t('metadata.filename') }}</span>
          <span class="readout break-all text-2xs font-medium" :title="filename">{{ filename }}</span>
        </div>
      </div>

      <Button variant="outline" size="sm" class="w-full text-xs" :disabled="busy" @click="fileInput?.click()">
        <Upload class="h-3.5 w-3.5" />
        {{ t('metadata.editor.replaceImage') }}
      </Button>

      <slot name="notices" />
    </div>

    <input ref="fileInput" type="file" accept="image/png" class="hidden" @change="onFileChange" />
  </div>
</template>
