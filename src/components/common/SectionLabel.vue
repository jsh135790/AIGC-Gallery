<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <!-- .micro = 10px / .14em 字距 / 大写 / text-dim,定义在 index.css 的 @layer components -->
  <p :class="cn('micro', props.class)">
    <slot />
  </p>
</template>
