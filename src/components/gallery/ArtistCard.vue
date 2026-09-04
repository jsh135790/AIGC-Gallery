<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Heart, Copy, Eye } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import StarRating from '@/components/common/StarRating.vue'
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
    class="panel group relative cursor-pointer overflow-hidden rounded-lg transition-colors hover:border-primary/28"
    @click="emit('view', artist)"
  >
    <!-- Image -->
    <div class="grid-paper relative aspect-[3/4] overflow-hidden bg-muted">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="artist.name"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="flex h-full items-center justify-center text-dim">
        <Eye class="h-10 w-10" />
      </div>

      <!-- Overlay on hover -->
      <div class="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <!-- Favorite button -->
      <Button
        variant="ghost"
        size="icon"
        class="absolute top-2 right-2 h-7 w-7 cursor-pointer rounded-full bg-background/80 text-foreground backdrop-blur-sm hover:bg-background transition-all"
        :class="artist.isFavorite ? 'text-primary' : 'opacity-0 group-hover:opacity-100'"
        :aria-label="t('common.favorites')"
        @click.stop="emit('toggleFavorite', artist.id!)"
      >
        <Heart class="h-3.5 w-3.5" :class="artist.isFavorite && 'fill-current'" />
      </Button>

      <!-- Category badge -->
      <Badge
        v-if="artist.category"
        variant="secondary"
        class="absolute top-2 left-2 bg-background/85 text-foreground backdrop-blur-sm text-2xs"
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
        <StarRating :model-value="artist.rating || 0" readonly size="sm" class="shrink-0" />
      </div>

      <!-- Prompt string -->
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              class="flex w-full items-center gap-1.5 rounded-md bg-muted px-2 py-1.5 font-mono text-2xs text-muted-foreground hover:bg-accent transition-colors group/prompt"
              @click.stop="copyPrompt"
            >
              <Copy class="h-3 w-3 shrink-0 text-dim group-hover/prompt:text-foreground" />
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
          class="text-2xs px-1.5 py-0"
        >
          {{ tag }}
        </Badge>
        <Badge
          v-if="artist.tags.length > 3"
          variant="outline"
          class="text-2xs px-1.5 py-0 text-muted-foreground"
        >
          +{{ artist.tags.length - 3 }}
        </Badge>
      </div>
    </div>
  </div>
</template>
