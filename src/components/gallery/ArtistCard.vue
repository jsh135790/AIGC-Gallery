<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Heart, Copy, Star, Eye } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useI18n } from '@/composables/useI18n'
import type { Artist } from '@/types'

const props = defineProps<{
  artist: Artist
}>()

const emit = defineEmits<{
  toggleFavorite: [id: number]
  view: [artist: Artist]
  copy: [prompt: string]
}>()

const { t } = useI18n()
const thumbnailUrl = ref<string | null>(null)
const copied = ref(false)

// Watch for changes in artist.images and regenerate thumbnail URL
watch(() => props.artist.images, (newImages) => {
  // Revoke old URL to prevent memory leak
  if (thumbnailUrl.value) {
    URL.revokeObjectURL(thumbnailUrl.value)
  }

  // Generate new URL if images exist
  if (newImages && newImages.length > 0) {
    thumbnailUrl.value = URL.createObjectURL(newImages[0])
  } else {
    thumbnailUrl.value = null
  }
}, { immediate: true })

// Clean up on unmount
onUnmounted(() => {
  if (thumbnailUrl.value) {
    URL.revokeObjectURL(thumbnailUrl.value)
  }
})

const stars = computed(() => {
  return Array.from({ length: 5 }, (_, i) => i < (props.artist.rating || 0))
})

// Translate category name
const translatedCategory = computed(() => {
  if (!props.artist.category) return ''

  // Map Chinese category names to translation keys
  const categoryMap: Record<string, string> = {
    '写实': 'category.realistic',
    '二次元': 'category.anime',
    '半写实': 'category.semiRealistic',
    '概念艺术': 'category.conceptArt',
    '水彩风': 'category.watercolor',
    '油画风': 'category.oilPainting',
    '插画': 'category.illustration',
    '像素风': 'category.pixelArt',
    '其他': 'category.other',
  }

  const key = categoryMap[props.artist.category]
  return key ? t(key) : props.artist.category
})

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(props.artist.prompt)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
    emit('copy', props.artist.prompt)
  } catch { /* ignore */ }
}
</script>

<template>
  <div
    class="group relative overflow-hidden rounded-xl border border-border/40 bg-card/60 backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5"
    @click="emit('view', artist)"
  >
    <!-- Image -->
    <div class="relative aspect-[3/4] overflow-hidden bg-muted/30">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="artist.name"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="flex h-full items-center justify-center text-muted-foreground/40">
        <Eye class="h-10 w-10" />
      </div>

      <!-- Overlay on hover -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <!-- Favorite button -->
      <Button
        variant="ghost"
        size="icon"
        class="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 transition-all"
        :class="artist.isFavorite ? 'text-red-400' : 'opacity-0 group-hover:opacity-100'"
        @click.stop="emit('toggleFavorite', artist.id!)"
      >
        <Heart class="h-4 w-4" :class="artist.isFavorite && 'fill-current'" />
      </Button>

      <!-- Category badge -->
      <Badge
        v-if="artist.category"
        variant="secondary"
        class="absolute top-2 left-2 bg-black/30 text-white backdrop-blur-sm border-none text-xs"
      >
        {{ translatedCategory }}
      </Badge>
    </div>

    <!-- Info -->
    <div class="p-3 space-y-2">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-medium text-sm leading-tight line-clamp-1">
          {{ artist.name }}
        </h3>
        <!-- Rating -->
        <div class="flex shrink-0 gap-0.5">
          <Star
            v-for="(filled, i) in stars"
            :key="i"
            class="h-3 w-3"
            :class="filled ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'"
          />
        </div>
      </div>

      <!-- Prompt string -->
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              class="flex w-full items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground font-mono hover:bg-muted transition-colors group/prompt"
              @click.stop="copyPrompt"
            >
              <Copy class="h-3 w-3 shrink-0 opacity-50 group-hover/prompt:opacity-100" />
              <span class="truncate">{{ artist.prompt }}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{{ copied ? t('common.copied') : t('artist.copyPrompt') }}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <!-- Tags -->
      <div v-if="artist.tags.length" class="flex flex-wrap gap-1">
        <Badge
          v-for="tag in artist.tags.slice(0, 3)"
          :key="tag"
          variant="outline"
          class="text-[10px] px-1.5 py-0"
        >
          {{ tag }}
        </Badge>
        <Badge
          v-if="artist.tags.length > 3"
          variant="outline"
          class="text-[10px] px-1.5 py-0 text-muted-foreground"
        >
          +{{ artist.tags.length - 3 }}
        </Badge>
      </div>
    </div>
  </div>
</template>
