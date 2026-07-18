<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { X, ZoomIn, ZoomOut, Download } from 'lucide-vue-next'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { Button } from '@/components/ui/button'
import { useBlurEffect } from '@/composables/useBlurEffect'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
  src: string
  filename: string
  alt?: string
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { blurEnabled } = useBlurEffect()
const { t } = useI18n()
const scale = ref(1)
const imgLoaded = ref(false)
const naturalWidth = ref(0)
const naturalHeight = ref(0)
const viewportWidth = ref(0)
const viewportHeight = ref(0)

const WHEEL_THRESHOLD = 40
let wheelDelta = 0
let wheelFrame: number | null = null

const fittedSize = computed(() => {
  if (!naturalWidth.value || !naturalHeight.value) {
    return { width: 0, height: 0 }
  }

  const fitRatio = Math.min(
    1,
    viewportWidth.value * 0.9 / naturalWidth.value,
    viewportHeight.value * 0.9 / naturalHeight.value,
  )

  return {
    width: naturalWidth.value * fitRatio,
    height: naturalHeight.value * fitRatio,
  }
})

const scaledSize = computed(() => ({
  width: fittedSize.value.width * scale.value,
  height: fittedSize.value.height * scale.value,
}))

const scrollViewportStyle = computed(() => {
  if (!scaledSize.value.width || !scaledSize.value.height) return undefined
  return {
    width: `min(90vw, ${scaledSize.value.width}px)`,
    height: `min(90vh, ${scaledSize.value.height}px)`,
  }
})

const scaledImageStyle = computed(() => {
  if (!scaledSize.value.width || !scaledSize.value.height) return undefined
  return {
    width: `${scaledSize.value.width}px`,
    height: `${scaledSize.value.height}px`,
  }
})

function cancelPendingWheel() {
  if (wheelFrame !== null) {
    cancelAnimationFrame(wheelFrame)
    wheelFrame = null
  }
  wheelDelta = 0
}

function resetView() {
  cancelPendingWheel()
  scale.value = 1
  imgLoaded.value = false
  naturalWidth.value = 0
  naturalHeight.value = 0
}

function handleOpenChange(value: boolean) {
  if (!value) resetView()
  emit('update:open', value)
}

function close() {
  handleOpenChange(false)
}

function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 3)
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.25)
}

function download() {
  const a = document.createElement('a')
  a.href = props.src
  a.download = props.filename
  a.click()
}

function onKeyDown(event: KeyboardEvent) {
  if (!props.open) return

  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    zoomIn()
  } else if (event.key === '-') {
    event.preventDefault()
    zoomOut()
  }
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? viewportHeight.value
      : 1
  const delta = event.deltaY * multiplier

  if (wheelDelta !== 0 && Math.sign(delta) !== Math.sign(wheelDelta)) {
    wheelDelta = 0
  }
  wheelDelta += delta

  if (wheelFrame !== null) return
  wheelFrame = requestAnimationFrame(() => {
    wheelFrame = null
    if (Math.abs(wheelDelta) < WHEEL_THRESHOLD) return

    if (wheelDelta < 0) zoomIn()
    else zoomOut()
    wheelDelta = 0
  })
}

function handleImageLoad(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  naturalWidth.value = image.naturalWidth
  naturalHeight.value = image.naturalHeight
  imgLoaded.value = true
}

function updateViewportSize() {
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
}

watch(() => props.src, resetView)
watch(() => props.open, (open, wasOpen) => {
  if (open) {
    updateViewportSize()
    window.addEventListener('resize', updateViewportSize)
  } else {
    window.removeEventListener('resize', updateViewportSize)
    if (wasOpen) resetView()
  }
}, { immediate: true })

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportSize)
  cancelPendingWheel()
})
</script>

<template>
  <DialogRoot :open="open" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-[100]"
        :class="blurEnabled ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/85'"
      />
      <DialogContent
        class="fixed inset-0 z-[101] flex items-center justify-center overflow-hidden outline-none"
        @click.self="close"
        @keydown="onKeyDown"
        @wheel="onWheel"
      >
        <DialogTitle class="sr-only">{{ alt || filename }}</DialogTitle>
        <DialogDescription class="sr-only">{{ t('lightbox.description') }}</DialogDescription>

        <div class="absolute right-4 top-4 z-10 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            class="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white"
            :aria-label="t('lightbox.zoomOut')"
            :disabled="scale <= 0.25"
            @click="zoomOut"
          >
            <ZoomOut class="h-4 w-4" />
          </Button>
          <span class="min-w-[3rem] text-center font-mono text-2xs tabular-nums text-white/60">
            {{ Math.round(scale * 100) }}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            class="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white"
            :aria-label="t('lightbox.zoomIn')"
            :disabled="scale >= 3"
            @click="zoomIn"
          >
            <ZoomIn class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white"
            :aria-label="t('lightbox.download')"
            @click="download"
          >
            <Download class="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-9 w-9 text-white/80 hover:bg-white/10 hover:text-white"
            :aria-label="t('lightbox.close')"
            @click="close"
          >
            <X class="h-5 w-5" />
          </Button>
        </div>

        <div
          class="relative overflow-auto"
          :style="scrollViewportStyle"
          @click.stop
        >
          <div class="relative" :style="scaledImageStyle">
            <img
              :src="src"
              :alt="alt || filename"
              class="block object-contain"
              :class="naturalWidth ? 'max-w-none' : 'max-h-[90vh] max-w-[90vw]'"
              :style="scaledImageStyle"
              @load="handleImageLoad"
            />
            <div v-if="!imgLoaded" class="absolute inset-0 flex items-center justify-center">
              <div class="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
