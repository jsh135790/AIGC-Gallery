<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Check, Copy } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SectionLabel from '@/components/common/SectionLabel.vue'
import { extractTags } from '@/lib/parser'
import { useI18n } from '@/composables/useI18n'
import { useCopyFeedback } from '@/composables/useCopyFeedback'

/*
 * 提示词凹槽。底色用 --background 而不是 --card:暗色下 background 比 card 更暗,
 * 于是文本域读作"陷进面板里"的凹槽,与 MetadataViewer 的只读框同源。
 *
 * 本轮不做 tag 芯片,所以头部只给 tag 数 / 字符数 + 复制,编辑仍在等宽文本域里。
 * 计数用 lib/parser 的 extractTags —— 与以后真上芯片时同一套切分口径。
 */
const props = withDefaults(defineProps<{
  label: string
  modelValue: string
  /** 无障碍名。不传则退回 label */
  ariaLabel?: string
  disabled?: boolean
  /** 负向提示词:整体走 muted 文字色 */
  negative?: boolean
  /** 角色卡里的小号变体:更小的字号、不显示计数 */
  dense?: boolean
  minRows?: number
  placeholder?: string
}>(), {
  disabled: false,
  negative: false,
  dense: false,
  minRows: 3,
  placeholder: '',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { t } = useI18n()
const field = ref<HTMLTextAreaElement | null>(null)
const wrapper = ref<HTMLElement | null>(null)
const { copiedKey: copied, copy } = useCopyFeedback()

const tagCount = computed(() => extractTags(props.modelValue).length)

let frame = 0
let observer: ResizeObserver | null = null
let lastWidth = 0

/** 高度跟内容走,CSS 的 max-height 封顶后内部滚动 */
function autosize() {
  const node = field.value
  if (!node) return
  // 先塌到 auto 量出真实内容高度,再贴上去
  node.style.height = 'auto'
  const needed = node.scrollHeight
  node.style.height = `${needed}px`
  // 只有被 max-height 夹住时才给滚动条,否则等宽文本上会常驻一条空轨
  node.style.overflowY = node.clientHeight < needed - 1 ? 'auto' : 'hidden'
}

function scheduleAutosize() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(autosize)
}

watch(() => props.modelValue, () => { void nextTick(autosize) })

onMounted(() => {
  autosize()
  /*
   * 宽度变了要重排(侧栏开合、断点切换都不发 window resize)。只认宽度变化 ——
   * 高度是我们自己设的,跟着高度重算会自激。
   */
  if (wrapper.value && typeof ResizeObserver !== 'undefined') {
    lastWidth = wrapper.value.clientWidth
    observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0
      if (Math.abs(width - lastWidth) < 1) return
      lastWidth = width
      scheduleAutosize()
    })
    observer.observe(wrapper.value)
  }
})

onUnmounted(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
})
</script>

<template>
  <div ref="wrapper" class="flex flex-col gap-1.5">
    <div class="flex items-center gap-2">
      <SectionLabel>{{ label }}</SectionLabel>
      <span v-if="!dense" class="readout ml-auto text-2xs text-dim">
        {{ t('metadata.editor.meter', { tags: String(tagCount), chars: String(modelValue.length) }) }}
      </span>
      <Button
        variant="ghost"
        size="icon"
        class="h-6 w-6 shrink-0"
        :class="dense ? 'ml-auto' : ''"
        :disabled="!modelValue"
        :aria-label="t('common.copy')"
        @click="copy(modelValue)"
      >
        <Check v-if="copied" class="h-3 w-3 text-success" />
        <Copy v-else class="h-3 w-3" />
      </Button>
    </div>

    <textarea
      ref="field"
      class="hair w-full resize-none rounded-md bg-background px-3 py-2.5 font-mono leading-[1.7] transition-colors placeholder:text-dim hover:border-primary/28 disabled:cursor-not-allowed disabled:opacity-45"
      :class="[
        dense ? 'max-h-[24vh] text-xs' : 'max-h-[34vh] text-[12.5px]',
        negative ? 'text-muted-foreground' : '',
      ]"
      :value="modelValue"
      :rows="minRows"
      :disabled="disabled"
      :placeholder="placeholder"
      :aria-label="ariaLabel || label"
      spellcheck="false"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </div>
</template>
