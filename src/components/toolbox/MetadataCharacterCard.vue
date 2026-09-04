<script setup lang="ts">
import { computed } from 'vue'
import { MapPin } from 'lucide-vue-next'
import MetadataPromptGroove from './MetadataPromptGroove.vue'
import { useI18n } from '@/composables/useI18n'
import type { NAICharacterPrompt } from '@/types'

/*
 * NAI v4 角色卡。两个文本域**恒常渲染** —— 这是「删空就消失」的修法:
 * 旧实现把它们套在 `v-if="char.prompt"` / `v-if="char.negative"` 里,删到空字符
 * 输入框自毁并丢焦点,而本来就没有负面的角色永远补不上。
 */
const props = defineProps<{
  character: NAICharacterPrompt
  disabled?: boolean
}>()

const emit = defineEmits<{
  update: [idx: number, field: 'prompt' | 'negative', value: string]
}>()

const { t } = useI18n()

const isAuto = computed(() => {
  const centers = props.character.centers
  return centers.length === 1 && Math.round(centers[0].x) === 0 && Math.round(centers[0].y) === 0
})

const coordText = computed(() => {
  if (isAuto.value) return t('metadata.autoPosition')
  return props.character.centers.map(pt => `(${pt.x.toFixed(2)}, ${pt.y.toFixed(2)})`).join(' ')
})

const title = computed(() => t('metadata.character', { idx: String(props.character.idx) }))
</script>

<template>
  <div class="hair flex flex-col gap-2 rounded-lg px-3 py-2.5">
    <div class="flex items-center gap-2">
      <span class="text-2xs font-semibold">{{ title }}</span>
      <span v-if="character.centers.length" class="readout ml-auto flex items-center gap-1 text-2xs text-dim">
        <MapPin class="h-3 w-3" />
        {{ coordText }}
      </span>
    </div>

    <MetadataPromptGroove
      dense
      label="Prompt"
      :aria-label="`${title} · Prompt`"
      :model-value="character.prompt"
      :disabled="disabled"
      :min-rows="2"
      :placeholder="disabled ? '' : t('metadata.editor.emptyValue')"
      @update:model-value="emit('update', character.idx, 'prompt', $event)"
    />

    <MetadataPromptGroove
      dense
      negative
      label="Negative"
      :aria-label="`${title} · Negative`"
      :model-value="character.negative"
      :disabled="disabled"
      :min-rows="2"
      :placeholder="disabled ? '' : t('metadata.editor.emptyValue')"
      @update:model-value="emit('update', character.idx, 'negative', $event)"
    />
  </div>
</template>
