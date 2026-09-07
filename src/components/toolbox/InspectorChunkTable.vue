<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import { formatBytes } from '@/lib/format'
import SectionLabel from '@/components/common/SectionLabel.vue'
import { ENTRY_STATUS_META, type EntryRow } from '@/composables/useMetadataInspector'

/*
 * 第一层:原始条目表。
 *
 * 这一层刻意不做任何解释,只把容器里真实存在的东西摊开:keyword、块类型、
 * 原始字节数、解码后字符数、解码状态。字节数与字符数并排是有意的 ——
 * 压缩块两者会差一个量级,一眼就能看出这块是压缩的。
 */
const props = defineProps<{
  rows: EntryRow[]
  /** 未被解析器消费的 keyword,在表里标出来 */
  unconsumedKeys: string[]
}>()

const { t } = useI18n()
const expanded = ref<Set<number>>(new Set())

function toggle(index: number) {
  const next = new Set(expanded.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  expanded.value = next
}

function isUnconsumed(keyword: string) {
  return props.unconsumedKeys.includes(keyword)
}
</script>

<template>
  <section class="flex flex-col">
    <SectionLabel>{{ t('inspector.rawEntries') }} · {{ rows.length }}</SectionLabel>

    <p v-if="!rows.length" class="micro mt-2">{{ t('inspector.noEntries') }}</p>

    <div v-else class="mt-1.5 flex flex-col">
      <div v-for="(row, i) in rows" :key="`${row.keyword}-${i}`" class="border-b">
        <button
          type="button"
          class="flex w-full items-baseline gap-2.5 py-1.5 text-left transition-colors hover:bg-accent/60"
          :aria-expanded="expanded.has(i)"
          @click="toggle(i)"
        >
          <ChevronDown v-if="expanded.has(i)" class="mt-0.5 h-3 w-3 shrink-0 text-dim" />
          <ChevronRight v-else class="mt-0.5 h-3 w-3 shrink-0 text-dim" />

          <span class="min-w-0 flex-1 truncate font-mono text-xs font-medium" :title="row.keyword">
            {{ row.keyword || t('inspector.emptyKeyword') }}
          </span>

          <span
            v-if="isUnconsumed(row.keyword)"
            class="micro shrink-0 text-warning"
            :title="t('inspector.unconsumedHint')"
          >{{ t('inspector.unconsumed') }}</span>

          <span class="micro shrink-0">{{ row.entryType }}</span>
          <span class="readout shrink-0 text-2xs text-dim">{{ formatBytes(row.byteLength) }}</span>
          <span class="readout shrink-0 text-2xs text-dim">{{ row.charLength }} ch</span>
          <span class="micro shrink-0" :class="ENTRY_STATUS_META[row.status].tone">
            {{ t(ENTRY_STATUS_META[row.status].label) }}
          </span>
        </button>

        <div v-if="expanded.has(i)" class="pb-2 pl-5">
          <div v-if="row.languageTag || row.translatedKeyword" class="mb-1 flex gap-3">
            <span v-if="row.languageTag" class="micro">lang: {{ row.languageTag }}</span>
            <span v-if="row.translatedKeyword" class="micro">i18n: {{ row.translatedKeyword }}</span>
          </div>
          <pre
            class="hair max-h-72 overflow-auto rounded-md bg-background px-2.5 py-2 font-mono text-2xs leading-relaxed break-all whitespace-pre-wrap text-muted-foreground"
          >{{ row.pretty || t('inspector.emptyPayload') }}</pre>
        </div>
      </div>
    </div>
  </section>
</template>
