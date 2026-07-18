<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <p :class="cn('font-mono text-2xs font-medium uppercase tracking-wider text-muted-foreground', props.class)">
    <slot />
  </p>
</template>
