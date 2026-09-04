<script setup lang="ts">
import { computed } from 'vue'
import { useTypewriter } from '@/composables/useTypewriter'

const props = withDefaults(defineProps<{
  label: string
  /** 参数值来自解析出的 Record<string, unknown>,统一在这里 String() 化 */
  value: unknown
  /** 同一组里的序号,用来让多行错开入场 */
  index?: number
  /** 长文本用更高的 cps,否则一行参数要念半天 */
  multiline?: boolean
}>(), {
  index: 0,
  multiline: false,
})

const text = computed(() => String(props.value ?? ''))

const { display, isDone } = useTypewriter(text, {
  cps: props.multiline ? 220 : 90,
  delay: props.index * 70,
})
</script>

<template>
  <div class="flex items-baseline justify-between gap-2">
    <span class="micro shrink-0">{{ label }}</span>
    <span class="readout min-w-0 truncate font-mono text-xs font-medium">
      {{ display }}<span
        v-if="!isDone"
        class="caret ml-px inline-block h-[0.9em] w-[2px] translate-y-px bg-primary align-middle"
        aria-hidden="true"
      />
    </span>
  </div>
</template>
