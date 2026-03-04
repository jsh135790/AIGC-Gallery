<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  for?: string
  class?: string
}>()

const classes = computed(() =>
  cn(
    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    props.class
  )
)
</script>

<template>
  <label :for="for" :class="classes">
    <slot />
  </label>
</template>
