<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  debounce?: number
}>(), {
  placeholder: '搜索...',
  debounce: 300,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const localValue = ref(props.modelValue)
let timer: ReturnType<typeof setTimeout>
let isPendingEmit = false

// Only sync from parent when not in the middle of user input
watch(() => props.modelValue, (val) => {
  if (!isPendingEmit) {
    localValue.value = val
  }
})

function onInput(val: string | number) {
  localValue.value = String(val)
  isPendingEmit = true
  clearTimeout(timer)
  timer = setTimeout(() => {
    emit('update:modelValue', localValue.value)
    isPendingEmit = false
  }, props.debounce)
}

function clear() {
  localValue.value = ''
  isPendingEmit = false
  clearTimeout(timer)
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="relative">
    <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      v-model="localValue"
      :placeholder="placeholder"
      class="h-9 pl-9 pr-8 bg-muted/50 border-border/50 focus:bg-background transition-colors"
      @update:model-value="onInput"
    />
    <Button
      v-if="localValue"
      variant="ghost"
      size="icon"
      class="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2"
      @click="clear"
    >
      <X class="h-3.5 w-3.5" />
    </Button>
  </div>
</template>
