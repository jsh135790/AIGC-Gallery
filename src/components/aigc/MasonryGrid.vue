<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useMasonryLayout } from '@/composables/useMasonryLayout'
import ImageCard from './ImageCard.vue'
import type { AIGCImage } from '@/types'

const props = defineProps<{
  images: AIGCImage[]
  selectedIds?: Set<number>
  /** 首屏交错入场(父级用 hasAnimated 守卫,只播一次) */
  stagger?: boolean
}>()

const emit = defineEmits<{
  click: [image: AIGCImage]
  toggleFavorite: [id: number]
}>()

const containerEl = useTemplateRef<HTMLElement>('containerEl')
const items = computed(() => props.images)
const { columns } = useMasonryLayout(containerEl, items)

// 图片 id → 全局排序序号(交错延迟按阅读顺序而非列内顺序)
const indexMap = computed(() => new Map(props.images.map((img, i) => [img.id, i])))
</script>

<template>
  <div ref="containerEl" class="flex items-start gap-3">
    <div
      v-for="(col, ci) in columns"
      :key="ci"
      class="min-w-0 flex-1 space-y-3"
    >
      <ImageCard
        v-for="image in col"
        :key="image.id"
        :image="image"
        masonry
        :selected="selectedIds?.has(image.id!)"
        :class="stagger ? 'stagger-item' : ''"
        :style="stagger ? { '--stagger-i': indexMap.get(image.id) ?? 0 } : undefined"
        @click="emit('click', $event)"
        @toggle-favorite="emit('toggleFavorite', $event)"
      />
    </div>
  </div>
</template>
