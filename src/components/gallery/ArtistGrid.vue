<script setup lang="ts">
import type { Artist } from '@/types'
import ArtistCard from './ArtistCard.vue'
import { Skeleton } from '@/components/ui/skeleton'

defineProps<{
  artists: Artist[]
  isLoading?: boolean
}>()

const emit = defineEmits<{
  toggleFavorite: [id: number]
  view: [artist: Artist]
  copy: [prompt: string]
}>()
</script>

<template>
  <!-- Loading skeletons -->
  <div
    v-if="isLoading"
    class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
  >
    <div v-for="i in 10" :key="i" class="space-y-3">
      <Skeleton class="aspect-[3/4] w-full rounded-xl" />
      <div class="space-y-2 px-1">
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-7 w-full rounded-md" />
      </div>
    </div>
  </div>

  <!-- Empty state -->
  <div
    v-else-if="artists.length === 0"
    class="flex flex-col items-center justify-center py-20 text-center"
  >
    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-4">
      <svg class="h-8 w-8 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    </div>
    <h3 class="text-lg font-medium text-muted-foreground">暂无画师</h3>
    <p class="mt-1 text-sm text-muted-foreground/70">点击右上角的按钮添加你的第一个画师吧</p>
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
