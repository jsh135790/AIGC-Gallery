<script setup lang="ts">
import { cn } from '@/lib/utils'

withDefaults(defineProps<{
  title: string
  description?: string
  variant?: 'dashed' | 'plain'
}>(), {
  variant: 'dashed',
})
</script>

<template>
  <div
    :class="cn(
      'flex flex-col items-center justify-center gap-3 px-6 py-16 text-center',
      variant === 'dashed' && 'rounded-lg border border-dashed grid-paper',
    )"
  >
    <div v-if="$slots.icon" class="text-dim [&_svg]:h-10 [&_svg]:w-10 [&_svg]:stroke-[1.25]">
      <slot name="icon" />
    </div>
    <div class="space-y-1">
      <p class="text-sm font-medium text-foreground">{{ title }}</p>
      <p v-if="description" class="text-xs text-muted-foreground max-w-sm">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="mt-2">
      <slot name="action" />
    </div>
  </div>
</template>
