<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Heart } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AIGCImage } from '@/types'

const props = defineProps<{
  image: AIGCImage
  selected?: boolean
}>()

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
  comfyui: 'Comfy',
  unknown: '?',
}
</script>

<template>
  <div
    class="group relative overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer"
    :class="[
      selected
        ? 'border-primary ring-2 ring-primary/20 shadow-lg'
        : 'border-border/40 bg-card/90 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5',
    ]"
    @click="emit('click', image)"
  >
    <!-- Thumbnail — fixed aspect ratio, no bottom info section -->
    <div class="relative aspect-square overflow-hidden bg-muted/30">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="image.filename"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="flex h-full items-center justify-center">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-muted-foreground" />
      </div>

      <!-- Hover overlay with info -->
      <div class="absolute inset-0 bg-linear-to-t from-black/60 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <!-- Source badge — monochrome theme -->
      <Badge
        variant="outline"
        class="absolute top-2 left-2 text-[10px] px-1.5 py-0 bg-background/85 text-foreground/80 border-border/50"
      >
        {{ sourceLabel[image.source] || '?' }}
      </Badge>

      <!-- Favorite -->
      <Button
        variant="ghost"
        size="icon"
        class="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/45 text-white hover:bg-black/60"
        :class="image.isFavorite ? 'text-red-400' : 'opacity-0 group-hover:opacity-100'"
        @click.stop="emit('toggleFavorite', image.id!)"
      >
        <Heart class="h-3.5 w-3.5" :class="image.isFavorite && 'fill-current'" />
      </Button>

      <!-- Filename on hover at bottom of image -->
      <div class="absolute bottom-0 left-0 right-0 px-2.5 pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p class="text-[11px] font-medium text-white truncate drop-shadow-md" :title="image.filename">
          {{ image.filename }}
        </p>
      </div>
    </div>
  </div>
</template>
