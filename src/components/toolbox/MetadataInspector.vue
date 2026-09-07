<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { FileSearch, X, Layers, ChevronDown, ChevronRight, Users } from 'lucide-vue-next'
import { useAigcStore } from '@/stores/aigcStore'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { prettify } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import DropZone from '@/components/common/DropZone.vue'
import SectionLabel from '@/components/common/SectionLabel.vue'
import MetadataRow from '@/components/common/MetadataRow.vue'
import InspectorChunkTable from './InspectorChunkTable.vue'
import InspectorLibraryScan from './InspectorLibraryScan.vue'
import {
  useMetadataInspector,
  toEntryRows,
  ENTRY_STATUS_META,
  MATCHED_BY_LABELS,
  SOURCE_LABELS,
} from '@/composables/useMetadataInspector'

/*
 * 只读的元数据查看器,三层信息:
 *   1 原始条目表 —— 容器里真实存在什么(InspectorChunkTable)
 *   2 解析后字段 —— 解析器从里面取出了什么
 *   3 诊断      —— 命中哪条分支、哪块解不开、哪些键没人消费
 *
 * 第三层才是这个工具存在的理由。字段改名时,前两层的差异告诉你"哪里变了",
 * 第三层告诉你"为什么当前代码没接住" —— 映射仍然由人来写,机器不猜。
 */
const store = useAigcStore()
const { t } = useI18n()
const toast = useToast()
const { session, loading, inspect, clearSession } = useMetadataInspector()

const mode = ref<'single' | 'library'>('single')
const previewUrl = ref('')
const showRaw = ref(false)

/** 预览 URL 跟着 blob 走,并在卸载时回收 —— blob URL 生命周期是这个仓库的老坑 */
watch(() => session.value?.blob, blob => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = blob ? URL.createObjectURL(blob) : ''
  showRaw.value = false
}, { immediate: true })

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

const diagnostics = computed(() => session.value?.metadata.diagnostics ?? null)
const entryRows = computed(() => toEntryRows(diagnostics.value?.entries ?? []))
const unconsumedKeys = computed(() => diagnostics.value?.unconsumedKeys ?? [])

/** 非 PNG 容器只走了 EXIF UserComment 一条窄路,得说清楚,别让用户以为读全了 */
const isPartialContainer = computed(() => {
  const kind = diagnostics.value?.container
  return kind === 'jpeg' || kind === 'webp' || kind === 'avif'
})

const matchedLabel = computed(() => {
  const matched = diagnostics.value?.matchedBy
  if (!matched) return '—'
  const key = MATCHED_BY_LABELS[matched]
  // 没有对应文案时直接显示原串,不隐藏信息
  return key ? t(key) : matched
})

/** 参数全量遍历。派生的 nodeTypes 单独渲染成标签云,不挤在键值行里 */
const paramEntries = computed(() => {
  const params = session.value?.metadata.parameters ?? {}
  return Object.entries(params).filter(
    ([key, value]) => key !== 'nodeTypes' && value !== undefined && value !== null && value !== ''
  )
})

const nodeTypes = computed(() => {
  const value = session.value?.metadata.parameters?.nodeTypes
  return Array.isArray(value) ? value as string[] : []
})

/** 解码出问题的条目。诊断层直接点名,不让用户自己在表里翻 */
const problemEntries = computed(() => entryRows.value.filter(row => row.status !== 'ok'))

/** rawText 是 SD 写回时的 replay 基准 —— 追踪 chunk 有没有漏进来,看这里 */
const rawText = computed(() => prettify(session.value?.metadata.rawText ?? ''))
/** 计数报原始长度,不报美化后的 —— 这个工具的字节/字符数处处都得是原样 */
const rawTextLength = computed(() => session.value?.metadata.rawText.length ?? 0)

async function handleFiles(files: File[]) {
  const file = files[0]
  if (!file) return
  try {
    await inspect({ blob: file, filename: file.name })
    mode.value = 'single'
  } catch {
    toast.error(t('inspector.parseFailed'))
  }
}

/** 从全库扫描结果跳进单图检查 */
async function handleInspectFromLibrary(imageId: number) {
  const image = store.images.find(item => item.id === imageId)
  if (!image?.imageData) {
    toast.error(t('inspector.imageMissing'))
    return
  }
  try {
    await inspect({ blob: image.imageData, filename: image.filename, imageId })
    mode.value = 'single'
  } catch {
    toast.error(t('inspector.parseFailed'))
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-4">
    <!-- 模式切换:单图检查 / 全库扫描 -->
    <div class="hair flex w-fit rounded-md p-0.5">
      <button
        type="button"
        class="micro flex items-center gap-1.5 rounded-sm px-2.5 py-1 transition-colors"
        :class="mode === 'single' ? 'bg-accent text-foreground' : 'hover:text-foreground'"
        @click="mode = 'single'"
      >
        <FileSearch class="h-3 w-3" />
        {{ t('inspector.modeSingle') }}
      </button>
      <button
        type="button"
        class="micro flex items-center gap-1.5 rounded-sm px-2.5 py-1 transition-colors"
        :class="mode === 'library' ? 'bg-accent text-foreground' : 'hover:text-foreground'"
        @click="mode = 'library'"
      >
        <Layers class="h-3 w-3" />
        {{ t('inspector.modeLibrary') }}
      </button>
    </div>

    <InspectorLibraryScan v-if="mode === 'library'" @inspect="handleInspectFromLibrary" />

    <template v-else-if="!session">
      <DropZone
        :multiple="false"
        accept="image/*"
        :scanning="loading"
        :label="t('inspector.dropLabel')"
        :sublabel="t('inspector.dropSublabel')"
        @files="handleFiles"
      />
      <p class="micro leading-relaxed">{{ t('inspector.intro') }}</p>
    </template>

    <template v-else>
      <!-- 文件头 -->
      <section class="panel flex items-center gap-3 rounded-lg p-3">
        <img
          v-if="previewUrl"
          :src="previewUrl"
          :alt="session.filename"
          class="hair h-14 w-14 shrink-0 rounded-md object-cover"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate font-mono text-xs font-medium" :title="session.filename">
            {{ session.filename }}
          </p>
          <div class="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span class="micro">{{ diagnostics?.container ?? '—' }}</span>
            <span class="micro">{{ SOURCE_LABELS[session.metadata.source] }}</span>
            <span v-if="session.metadata.stealth" class="micro text-primary">stealth</span>
            <span class="readout text-2xs text-dim">{{ session.parseMs.toFixed(1) }} ms</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="h-7 w-7 shrink-0"
          :title="t('inspector.clear')"
          @click="clearSession"
        >
          <X class="h-3.5 w-3.5" />
        </Button>
      </section>

      <!-- 非 PNG 容器:说清楚只读了 UserComment,别让人以为读全了 -->
      <p v-if="isPartialContainer" class="micro leading-relaxed text-warning">
        {{ t('inspector.partialContainer') }}
      </p>

      <!-- 层 1:容器里真实存在什么 -->
      <InspectorChunkTable :rows="entryRows" :unconsumed-keys="unconsumedKeys" />

      <!-- 层 2:解析器从里面取出了什么 -->
      <section class="flex flex-col gap-3">
        <SectionLabel>{{ t('inspector.parsedFields') }}</SectionLabel>

        <div v-if="session.metadata.prompt" class="flex flex-col gap-1">
          <SectionLabel>{{ t('metadata.prompt') }}</SectionLabel>
          <pre class="hair max-h-32 overflow-auto rounded-md bg-background px-2.5 py-2 font-mono text-2xs leading-relaxed break-all whitespace-pre-wrap">{{ session.metadata.prompt }}</pre>
        </div>

        <div v-if="session.metadata.negativePrompt" class="flex flex-col gap-1">
          <SectionLabel>{{ t('metadata.negativePrompt') }}</SectionLabel>
          <pre class="hair max-h-24 overflow-auto rounded-md bg-background px-2.5 py-2 font-mono text-2xs leading-relaxed break-all whitespace-pre-wrap text-muted-foreground">{{ session.metadata.negativePrompt }}</pre>
        </div>

        <div v-if="paramEntries.length" class="grid grid-cols-1 gap-x-5 gap-y-1.5 sm:grid-cols-2">
          <MetadataRow
            v-for="([key, value], i) in paramEntries"
            :key="key"
            :label="key"
            :value="value"
            :index="i"
          />
        </div>
        <p v-else class="micro">{{ t('inspector.noParams') }}</p>

        <div v-if="nodeTypes.length" class="flex flex-col gap-1">
          <SectionLabel>{{ t('metadata.nodeTypes') }} · {{ nodeTypes.length }}</SectionLabel>
          <div class="flex max-h-32 flex-wrap gap-1 overflow-auto">
            <Badge v-for="type in nodeTypes" :key="type" variant="outline" class="text-2xs font-mono">
              {{ type }}
            </Badge>
          </div>
        </div>

        <div v-if="session.metadata.v4Data" class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Users class="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground" />
          <SectionLabel>NAI v4</SectionLabel>
          <span class="micro">
            {{ t('metadata.characterPrompts') }} · {{ session.metadata.v4Data.characters.length }}
          </span>
          <Badge v-if="session.metadata.v4Data.useOrder" variant="outline" class="text-2xs">use_order</Badge>
          <Badge v-if="session.metadata.v4Data.useCoords" variant="outline" class="text-2xs">use_coords</Badge>
          <Badge v-if="session.metadata.v4Data.legacyUc" variant="outline" class="text-2xs">legacy_uc</Badge>
        </div>

        <!-- rawText:写回 SD 时的 replay 基准,单独可折叠 -->
        <div v-if="rawText" class="flex flex-col">
          <button
            type="button"
            class="micro flex items-center gap-1.5 py-1 text-left transition-colors hover:text-foreground"
            :aria-expanded="showRaw"
            @click="showRaw = !showRaw"
          >
            <ChevronDown v-if="showRaw" class="h-3 w-3" />
            <ChevronRight v-else class="h-3 w-3" />
            {{ t('inspector.rawText') }} · {{ rawTextLength }} ch
          </button>
          <pre
            v-if="showRaw"
            class="hair max-h-72 overflow-auto rounded-md bg-background px-2.5 py-2 font-mono text-2xs leading-relaxed break-all whitespace-pre-wrap text-muted-foreground"
          >{{ rawText }}</pre>
        </div>
      </section>

      <!-- 层 3:命中了哪条分支、哪块解不开、哪些键没人消费 —— 这一层才是工具存在的理由 -->
      <section class="panel flex flex-col gap-3 rounded-lg p-4">
        <SectionLabel>{{ t('inspector.diagnostics') }}</SectionLabel>

        <div class="flex flex-col gap-1.5">
          <div class="flex items-baseline justify-between gap-2">
            <span class="micro shrink-0">{{ t('inspector.matchedBy') }}</span>
            <span class="readout min-w-0 text-right font-mono text-xs font-medium">{{ matchedLabel }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-2">
            <span class="micro shrink-0">{{ t('inspector.container') }}</span>
            <span class="readout font-mono text-xs font-medium">{{ diagnostics?.container ?? '—' }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-2">
            <span class="micro shrink-0">{{ t('inspector.entryCount') }}</span>
            <span class="readout font-mono text-xs font-medium">{{ entryRows.length }}</span>
          </div>
        </div>

        <div v-if="problemEntries.length" class="flex flex-col gap-1">
          <SectionLabel>{{ t('inspector.decodeIssues') }} · {{ problemEntries.length }}</SectionLabel>
          <div
            v-for="(row, i) in problemEntries"
            :key="`${row.keyword}-${i}`"
            class="flex items-baseline gap-2"
          >
            <span class="min-w-0 flex-1 truncate font-mono text-xs">
              {{ row.keyword || t('inspector.emptyKeyword') }}
            </span>
            <span class="micro shrink-0" :class="ENTRY_STATUS_META[row.status].tone">
              {{ t(ENTRY_STATUS_META[row.status].label) }}
            </span>
          </div>
        </div>

        <!-- 没人消费的键:上游改名后第一时间出现在这里,映射由人来写 -->
        <div v-if="unconsumedKeys.length" class="flex flex-col gap-1">
          <SectionLabel>{{ t('inspector.unconsumedKeys') }} · {{ unconsumedKeys.length }}</SectionLabel>
          <p class="text-2xs leading-relaxed break-all text-dim">{{ unconsumedKeys.join(', ') }}</p>
          <p class="micro leading-relaxed">{{ t('inspector.unconsumedExplain') }}</p>
        </div>

        <p v-if="session.metadata.stealth" class="micro leading-relaxed text-warning">
          {{ t('inspector.stealthNote') }}
        </p>

        <p v-if="!problemEntries.length && !unconsumedKeys.length" class="micro">
          {{ t('inspector.diagnosticsClean') }}
        </p>
      </section>
    </template>
  </div>
</template>
