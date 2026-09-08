<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { useI18n } from '@/composables/useI18n'
import { useTypewriter } from '@/composables/useTypewriter'
import { formatMetadataValue } from '@/lib/metadata-display'

const props = withDefaults(defineProps<{
  label: string
  value: unknown
  index?: number
  /** 查看器沿用紧凑读出，详情页提供长内容展开。 */
  compact?: boolean
}>(), { index: 0, compact: false })
const { t } = useI18n()
const text = computed(() => formatMetadataValue(props.value, !props.compact))
const { display, isDone, finish } = useTypewriter(text, { cps: 90, delay: props.index * 70 })
const valueNode = ref<HTMLElement | null>(null)
const measurement = ref<HTMLElement | null>(null)
const expanded = ref(false)
const canExpand = ref(false)
const valueId = useId()

function measure() {
  const node = measurement.value
  if (!node) return
  // 按完整内容测量，避免逐字显示时展开按钮反复变化；测量层不占滚动空间。
  canExpand.value = node.scrollHeight > parseFloat(getComputedStyle(node).lineHeight) * 3 + 1
}

useResizeObserver(valueNode, measure)
watch(text, async () => {
  expanded.value = false
  await nextTick()
  measure()
}, { immediate: true })
</script>

<template>
  <div v-if="compact" class="flex min-w-0 items-baseline justify-between gap-2">
    <span class="micro min-w-0 max-w-[45%] shrink-0 normal-case [overflow-wrap:anywhere]" :title="label">{{ label }}</span>
    <span class="readout min-w-0 truncate text-right font-mono text-xs font-medium" :title="text">
      {{ display }}<span
        v-if="!isDone"
        class="caret ml-px inline-block h-[0.9em] w-[2px] translate-y-px bg-primary align-middle"
        aria-hidden="true"
      />
    </span>
  </div>
  <div v-else class="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start gap-3 text-xs">
    <span class="min-w-0 leading-relaxed [overflow-wrap:anywhere] text-muted-foreground">{{ label }}</span>
    <div class="relative min-w-0">
      <div
        ref="measurement"
        aria-hidden="true"
        class="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden whitespace-pre-wrap font-mono font-medium leading-relaxed [overflow-wrap:anywhere]"
      >{{ text }}</div>
      <div
        :id="valueId"
        ref="valueNode"
        class="readout min-h-[1lh] min-w-0 whitespace-pre-wrap font-mono font-medium leading-relaxed [overflow-wrap:anywhere]"
        :class="expanded ? '' : 'line-clamp-3'"
      >{{ display }}<span
          v-if="!isDone"
          class="caret ml-px inline-block h-[0.9em] w-[2px] translate-y-px bg-primary align-middle"
          aria-hidden="true"
        /></div>
      <button
        v-if="canExpand"
        type="button"
        class="mt-1 rounded-sm text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        :aria-expanded="expanded"
        :aria-controls="valueId"
        :aria-label="`${t(expanded ? 'common.collapse' : 'common.expand')} · ${label}`"
        @click="expanded = !expanded; finish()"
      >{{ t(expanded ? 'common.collapse' : 'common.expand') }}</button>
    </div>
  </div>
</template>
