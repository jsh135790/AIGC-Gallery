<script setup lang="ts">
import { ref, onMounted, onUnmounted, toRef } from 'vue'
import { X, ZoomIn, ZoomOut, Download } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useScrollLock } from '@/composables/useScrollLock'

const props = defineProps<{
  src: string
  alt?: string
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const scale = ref(1)
const imgLoaded = ref(false)

// Lock body scroll when lightbox is open
useScrollLock(toRef(props, 'open'))

function close() {
  emit('update:open', false)
  scale.value = 1
  imgLoaded.value = false
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
  a.download = props.alt || 'image'
  a.click()
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
  if (e.key === '+' || e.key === '=') zoomIn()
  if (e.key === '-') zoomOut()
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) zoomIn()
  else zoomOut()
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85"
        @click.self="close"
        @wheel="onWheel"
      >
        <!-- Controls -->
        <div class="absolute top-4 right-4 z-10 flex items-center gap-2">
          <Button variant="ghost" size="icon" class="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10" @click="zoomOut">
            <ZoomOut class="h-4 w-4" />
          </Button>
          <span class="text-sm text-white/60 min-w-[3rem] text-center">{{ Math.round(scale * 100) }}%</span>
          <Button variant="ghost" size="icon" class="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10" @click="zoomIn">
            <ZoomIn class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" class="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10" @click="download">
            <Download class="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" class="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10" @click="close">
            <X class="h-5 w-5" />
          </Button>
        </div>

        <!-- Image -->
        <div class="relative max-h-[90vh] max-w-[90vw] overflow-auto">
          <img
            :src="src"
            :alt="alt"
            class="block transition-transform duration-200 ease-out"
            :style="{ transform: `scale(${scale})` }"
            @load="imgLoaded = true"
          />
          <!-- Loading placeholder -->
          <div
            v-if="!imgLoaded"
            class="absolute inset-0 flex items-center justify-center"
          >
            <div class="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
