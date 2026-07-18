<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  modelValue: number
  readonly?: boolean
  max?: number
  size?: 'sm' | 'md'
}>(), {
  readonly: false,
  max: 5,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function setRating(value: number) {
  if (props.readonly) return
  // 点当前星级 = 清零(允许取消评分)
  emit('update:modelValue', value === props.modelValue ? 0 : value)
}
</script>

<template>
  <div class="flex items-center gap-0.5" :class="{ 'pointer-events-none': readonly }">
    <component
      :is="readonly ? 'span' : 'button'"
      v-for="i in max"
      :key="i"
      :type="readonly ? undefined : 'button'"
      class="inline-flex"
      :class="{ 'cursor-pointer transition-transform hover:scale-110': !readonly }"
      @click="setRating(i)"
    >
      <Star
        :class="cn(
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4',
          i <= modelValue ? 'text-primary fill-primary' : 'text-muted-foreground/30',
        )"
      />
    </component>
  </div>
</template>
