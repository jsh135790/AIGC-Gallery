<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'

withDefaults(defineProps<{
  tag: string
  removable?: boolean
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
  size?: 'sm' | 'md'
}>(), {
  removable: false,
  variant: 'secondary',
  size: 'sm',
})

const emit = defineEmits<{
  remove: [tag: string]
  click: [tag: string]
}>()
</script>

<template>
  <Badge
    :variant="variant"
    class="cursor-pointer gap-1 transition-all hover:shadow-sm"
    :class="[
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
    ]"
    @click="emit('click', tag)"
  >
    <span class="max-w-[120px] truncate">{{ tag }}</span>
    <button
      v-if="removable"
      class="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
      @click.stop="emit('remove', tag)"
    >
      <X class="h-3 w-3" />
    </button>
  </Badge>
</template>
