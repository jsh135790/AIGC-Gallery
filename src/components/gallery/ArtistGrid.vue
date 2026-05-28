<script setup lang="ts">
import { Palette, Plus } from 'lucide-vue-next'
import type { Artist } from '@/types'
import ArtistCard from './ArtistCard.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'

defineProps<{
  artists: Artist[]
  isLoading?: boolean
}>()

const emit = defineEmits<{
  toggleFavorite: [id: number]
  view: [artist: Artist]
  copy: [prompt: string]
  createFirst: []
}>()

const { t } = useI18n()
</script>

<template>
  <!-- Loading skeletons -->
  <div
    v-if="isLoading"
    class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
  >
    <div v-for="i in 10" :key="i" class="space-y-3">
      <Skeleton class="aspect-3/4 w-full rounded-xl" />
      <div class="space-y-2 px-1">
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-7 w-full rounded-md" />
      </div>
    </div>
  </div>

  <!-- Empty state -->
  <div
    v-else-if="artists.length === 0"
    class="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border/60 py-16 text-center"
  >
    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60 text-muted-foreground/70">
      <Palette class="h-8 w-8" />
    </div>
    <div class="space-y-1">
      <h3 class="text-base font-medium text-foreground">{{ t('artist.empty') }}</h3>
      <p class="text-sm text-muted-foreground">{{ t('artist.emptyHint') }}</p>
    </div>
    <Button size="sm" class="gap-1.5 cursor-pointer" @click="emit('createFirst')">
      <Plus class="h-4 w-4" />
      {{ t('artist.createFirst') }}
    </Button>
  </div>

  <!-- Grid -->
  <div
    v-else
    class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
  >
    <ArtistCard
      v-for="artist in artists"
      :key="artist.id"
      :artist="artist"
      class="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
      @toggle-favorite="emit('toggleFavorite', $event)"
      @view="emit('view', $event)"
      @copy="emit('copy', $event)"
    />
  </div>
</template>
