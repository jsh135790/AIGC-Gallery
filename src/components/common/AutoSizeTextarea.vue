<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'

const props = defineProps<{ value: string }>()
const field = ref<HTMLTextAreaElement | null>(null)
const wrapper = ref<HTMLElement | null>(null)

function resize() {
  const node = field.value
  if (!node) return
  const style = getComputedStyle(node)
  const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
  node.style.height = 'auto'
  // scrollHeight 不含边框；border-box 下补上边框，避免短内容也出现滚动条。
  node.style.height = `${node.scrollHeight + borders}px`
}

// 只观察宽度，避免自己设置高度后不断触发重新测量。
let lastWidth = -1
useResizeObserver(wrapper, entries => {
  const width = entries[0]?.contentRect.width ?? 0
  if (width === lastWidth) return
  lastWidth = width
  resize()
})
watch(() => props.value, async () => { await nextTick(); resize() }, { immediate: true })
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div ref="wrapper" class="min-w-0">
    <textarea
      v-bind="$attrs"
      ref="field"
      :value="value"
      rows="1"
      class="readout block w-full min-w-0 resize-none overflow-y-auto rounded-sm border border-transparent bg-transparent px-1 py-1 font-mono text-xs leading-5 [max-height:calc(8lh+0.5rem+2px)] [overflow-wrap:anywhere] transition-colors hover:border-primary/70 focus:border-primary/70 disabled:opacity-45"
      @input="resize"
    />
  </div>
</template>
