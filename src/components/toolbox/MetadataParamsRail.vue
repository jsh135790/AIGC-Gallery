<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, ChevronRight, Undo2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import SectionLabel from '@/components/common/SectionLabel.vue'
import { useI18n } from '@/composables/useI18n'
import type { ChangedField, ParamRow } from '@/composables/useMetadataEditor'

/*
 * 右栏:参数 → 其他字段 → RAW → 原图对照。
 *
 * 「其他字段」是这次改版的功能核心之一:当前导出会把这些未识别字段全部静默丢掉,
 * 先把它们摆出来,丢失才成为可见的事(写侧已改成逐字保留,见 png-writer.ts)。
 */
const props = defineProps<{
  rows: ParamRow[]
  changedKeys: Set<string>
  disabled: boolean
  rawText: string
  diffRows: Array<{ field: ChangedField; label: string; delta: string }>
}>()

const emit = defineEmits<{
  'update:param': [key: string, value: string]
  revert: [field: ChangedField]
}>()

const { t } = useI18n()

const folds = ref({ extra: true, raw: false, diff: true })

function toggle(key: 'extra' | 'raw' | 'diff') {
  folds.value[key] = !folds.value[key]
}

const knownRows = computed(() => props.rows.filter(row => row.kind === 'known'))
const extraRows = computed(() => props.rows.filter(row => row.kind === 'extra'))

/** 锁定的行把原因写进 title,免得只看到一个点不动的输入框 */
function rowTitle(row: ParamRow) {
  return row.locked ? t(row.lockReason ?? 'metadata.editor.lockedField') : row.value
}

/** JSON 就美化,其他(SD 的 parameters 整串)原样 */
const prettyRaw = computed(() => {
  const text = props.rawText
  if (!text) return ''
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return text
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    return text
  }
})
</script>

<template>
  <div class="flex flex-col gap-4 border-t p-4 lg:min-h-0 lg:overflow-y-auto lg:border-t-0 lg:border-l">
    <!-- 已知参数 -->
    <div>
      <SectionLabel>{{ t('metadata.parameters') }}</SectionLabel>
      <p v-if="!knownRows.length" class="micro mt-2">{{ t('metadata.editor.noParams') }}</p>
      <div v-else class="mt-1.5">
        <div v-for="row in knownRows" :key="row.key" class="flex items-baseline justify-between gap-2.5 border-b py-1.5">
          <span class="micro shrink-0" :class="changedKeys.has(row.key) ? 'text-primary' : ''">{{ row.label }}</span>
          <input
            class="readout min-w-0 flex-1 border-b border-transparent bg-transparent px-0 py-px text-right font-mono text-2xs font-medium transition-colors hover:border-primary/70 focus:border-primary/70 disabled:opacity-45"
            :value="row.value"
            :disabled="disabled || row.locked"
            :aria-label="row.label"
            :title="rowTitle(row)"
            spellcheck="false"
            @input="emit('update:param', row.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <!-- 其他字段:解析器兜住的未识别键 -->
    <div v-if="extraRows.length" class="flex flex-col">
      <button
        type="button"
        class="micro flex w-full items-center gap-1.5 rounded-sm px-1 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        :aria-expanded="folds.extra"
        @click="toggle('extra')"
      >
        {{ t('metadata.editor.extraFields') }} · {{ extraRows.length }}
        <ChevronDown v-if="folds.extra" class="ml-auto h-3.5 w-3.5" />
        <ChevronRight v-else class="ml-auto h-3.5 w-3.5" />
      </button>

      <div v-if="folds.extra" class="mt-0.5">
        <p class="mb-1.5 text-2xs leading-relaxed text-dim">{{ t('metadata.editor.extraFieldsHint') }}</p>
        <div v-for="row in extraRows" :key="row.key" class="flex items-baseline justify-between gap-2.5 border-b py-1.5">
          <span class="micro shrink-0" :class="changedKeys.has(row.key) ? 'text-primary' : ''">{{ row.label }}</span>
          <input
            class="readout min-w-0 flex-1 border-b border-transparent bg-transparent px-0 py-px text-right font-mono text-2xs font-medium transition-colors hover:border-primary/70 focus:border-primary/70 disabled:opacity-45"
            :value="row.value"
            :disabled="disabled || row.locked"
            :aria-label="row.label"
            :title="rowTitle(row)"
            spellcheck="false"
            @input="emit('update:param', row.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>

    <!-- RAW -->
    <div class="flex flex-col">
      <button
        type="button"
        class="micro flex w-full items-center gap-1.5 rounded-sm px-1 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        :aria-expanded="folds.raw"
        @click="toggle('raw')"
      >
        Raw
        <ChevronDown v-if="folds.raw" class="ml-auto h-3.5 w-3.5" />
        <ChevronRight v-else class="ml-auto h-3.5 w-3.5" />
      </button>
      <pre
        v-if="folds.raw"
        class="mt-1 max-h-56 overflow-auto rounded-md bg-background px-2.5 py-2 font-mono text-2xs leading-relaxed break-all whitespace-pre-wrap text-muted-foreground"
      >{{ prettyRaw || t('metadata.editor.noMetadata') }}</pre>
    </div>

    <!-- 原图对照:改动清单 + 每条一个回退 -->
    <div class="flex flex-col">
      <button
        type="button"
        class="micro flex w-full items-center gap-1.5 rounded-sm px-1 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        :aria-expanded="folds.diff"
        @click="toggle('diff')"
      >
        {{ t('metadata.editor.diffTitle') }} · {{ diffRows.length }}
        <ChevronDown v-if="folds.diff" class="ml-auto h-3.5 w-3.5" />
        <ChevronRight v-else class="ml-auto h-3.5 w-3.5" />
      </button>

      <div v-if="folds.diff" class="mt-0.5">
        <p v-if="!diffRows.length" class="micro py-1.5">{{ t('metadata.editor.diffClean') }}</p>
        <div
          v-for="(row, i) in diffRows"
          :key="`${row.label}-${i}`"
          class="flex items-center gap-2 border-b py-1 text-xs"
        >
          <span class="min-w-0 flex-1 truncate text-primary" :title="row.label">{{ row.label }}</span>
          <span class="readout text-2xs text-dim">{{ row.delta }}</span>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6 shrink-0"
            :disabled="disabled"
            :aria-label="t('metadata.editor.revertField')"
            @click="emit('revert', row.field)"
          >
            <Undo2 class="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
