<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Heart, Check } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import type { AIGCImage } from '@/types'

const props = withDefaults(defineProps<{
  image: AIGCImage
  selected?: boolean
  /** 瀑布流模式:按原图比例呈现(需 width/height,缺省回退方形) */
  masonry?: boolean
}>(), {
  selected: false,
  masonry: false,
})

const emit = defineEmits<{
  click: [image: AIGCImage]
  toggleFavorite: [id: number]
  select: [id: number]
}>()

const thumbnailUrl = ref<string>('')

onMounted(() => {
  const blob = props.image.thumbnail || props.image.imageData
  if (blob) {
    thumbnailUrl.value = URL.createObjectURL(blob)
  }
})

onUnmounted(() => {
  if (thumbnailUrl.value) {
    URL.revokeObjectURL(thumbnailUrl.value)
  }
})

const sourceLabel: Record<string, string> = {
  sd: 'SD',
  nai: 'NAI',
  comfyui: 'COMFY',
  unknown: '?',
}

// 动态比例必须内联 style(Tailwind 无法生成任意运行时值)
const aspectStyle = computed(() => {
  if (props.masonry && props.image.width && props.image.height) {
    return { aspectRatio: `${props.image.width} / ${props.image.height}` }
  }
  return undefined
})
</script>

<template>
  <div
    class="group relative overflow-hidden rounded-lg border bg-card transition-colors cursor-pointer"
    :class="selected
      ? 'hair-amber'
      : 'hover:border-primary/28'"
    @click="emit('click', image)"
  >
    <!-- Thumbnail -->
    <div
      class="grid-paper relative overflow-hidden bg-muted"
      :class="aspectStyle ? '' : 'aspect-square'"
      :style="aspectStyle"
    >
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="image.filename"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="flex h-full items-center justify-center">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-[var(--hair-soft)] border-t-primary" />
      </div>

      <!-- Hover overlay with info -->
      <div class="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <!-- Source chip — neutral mono, single-accent discipline -->
      <span
        class="absolute top-2 left-2 rounded-sm border bg-background/85 text-foreground backdrop-blur-sm px-1.5 py-0 font-mono text-2xs uppercase"
      >
        {{ sourceLabel[image.source] || '?' }}
      </span>

      <!-- Selected check (amber) -->
      <div
        v-if="selected"
        class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <Check class="h-3 w-3" />
      </div>

      <!-- Favorite -->
      <Button
        v-else
        variant="ghost"
        size="icon"
        class="absolute top-2 right-2 h-7 w-7 cursor-pointer rounded-full bg-background/80 text-foreground backdrop-blur-sm hover:bg-background"
        :class="image.isFavorite ? 'text-primary' : 'opacity-0 group-hover:opacity-100'"
        @click.stop="emit('toggleFavorite', image.id!)"
      >
        <Heart class="h-3.5 w-3.5" :class="image.isFavorite && 'fill-current'" />
      </Button>

      <!-- Filename on hover at bottom of image -->
      <div class="absolute bottom-0 left-0 right-0 px-2.5 pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p class="font-mono text-2xs font-medium text-white truncate drop-shadow-md" :title="image.filename">
          {{ image.filename }}
        </p>
      </div>
    </div>
  </div>
</template>
