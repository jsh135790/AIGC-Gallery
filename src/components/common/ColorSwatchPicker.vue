<script setup lang="ts">
import { SWATCH_COLORS } from '@/lib/colors'

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="color in SWATCH_COLORS"
      :key="color"
      type="button"
      class="h-6 w-6 rounded-full transition-transform hover:scale-110"
      :class="modelValue === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : ''"
      :style="{ backgroundColor: color }"
      :aria-pressed="modelValue === color"
      @click="emit('update:modelValue', color)"
    />
  </div>
</template>
