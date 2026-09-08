<script setup lang="ts">
import { computed } from 'vue'
import { MapPin } from 'lucide-vue-next'
import MetadataPromptGroove from './MetadataPromptGroove.vue'
import { useI18n } from '@/composables/useI18n'
import { formatCoordinates } from '@/lib/format'
import { isAutoPosition } from '@/lib/parser/fields'
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

const isAuto = computed(() => isAutoPosition(props.character.centers))

const coordText = computed(() => {
  if (isAuto.value) return t('metadata.autoPosition')
  return formatCoordinates(props.character.centers)
})

const title = computed(() => t('metadata.character', { idx: String(props.character.idx) }))
</script>

<template>
  <div class="hair flex flex-col gap-2 rounded-lg px-3 py-2.5">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <span class="text-2xs font-semibold">{{ title }}</span>
      <span v-if="character.centers.length" class="readout ml-auto flex min-w-0 items-start gap-1 text-2xs text-dim [overflow-wrap:anywhere]">
        <MapPin class="h-3 w-3 shrink-0" />
        <span class="min-w-0">{{ coordText }}</span>
      </span>
    </div>

    <MetadataPromptGroove
      dense
      :label="t('metadata.prompt')"
      :aria-label="`${title} · ${t('metadata.prompt')}`"
      :model-value="character.prompt"
      :disabled="disabled"
      :min-rows="2"
      :placeholder="disabled ? '' : t('metadata.editor.emptyValue')"
      @update:model-value="emit('update', character.idx, 'prompt', $event)"
    />

    <MetadataPromptGroove
      dense
      negative
      :label="t('metadata.negativePrompt')"
      :aria-label="`${title} · ${t('metadata.negativePrompt')}`"
      :model-value="character.negative"
      :disabled="disabled"
      :min-rows="2"
      :placeholder="disabled ? '' : t('metadata.editor.emptyValue')"
      @update:model-value="emit('update', character.idx, 'negative', $event)"
    />
  </div>
</template>
