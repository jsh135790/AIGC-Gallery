<script setup lang="ts">
import { ref, watch } from 'vue'
import { Palette, Plus } from 'lucide-vue-next'
import type { Artist } from '@/types'
import ArtistCard from './ArtistCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{
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

// 首屏交错入场只播一次;筛选/排序变化不重播
const hasAnimated = ref(false)
watch(() => props.artists.length, (len) => {
  if (len > 0 && !hasAnimated.value) {
    setTimeout(() => { hasAnimated.value = true }, 800)
  }
}, { immediate: true })
</script>

<template>
  <!-- Loading skeletons -->
  <div
    v-if="isLoading"
    class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
  >
    <div v-for="i in 10" :key="i" class="space-y-3">
      <Skeleton class="aspect-3/4 w-full rounded-lg" />
      <div class="space-y-2 px-1">
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-7 w-full rounded-md" />
      </div>
    </div>
  </div>

  <!-- Empty state -->
  <EmptyState
    v-else-if="artists.length === 0"
    :title="t('artist.empty')"
    :description="t('artist.emptyHint')"
  >
    <template #icon>
      <Palette />
    </template>
    <template #action>
      <Button size="sm" class="gap-1.5 cursor-pointer" @click="emit('createFirst')">
        <Plus class="h-4 w-4" />
        {{ t('artist.createFirst') }}
      </Button>
    </template>
  </EmptyState>

  <!-- Grid -->
  <div
    v-else
    class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
  >
    <ArtistCard
      v-for="(artist, index) in artists"
      :key="artist.id"
      :artist="artist"
      :class="hasAnimated ? '' : 'stagger-item'"
      :style="hasAnimated ? undefined : { '--stagger-i': index }"
      @toggle-favorite="emit('toggleFavorite', $event)"
      @view="emit('view', $event)"
      @copy="emit('copy', $event)"
    />
  </div>
</template>
