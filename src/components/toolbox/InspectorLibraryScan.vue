<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ScanSearch, Wrench, Loader2, CheckCircle2 } from 'lucide-vue-next'
import {
  useAigcStore,
  type MetadataIssueKind,
  type MetadataScanResult,
} from '@/stores/aigcStore'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import SectionLabel from '@/components/common/SectionLabel.vue'

/*
 * 第二个模式:全库扫描。
 *
 * 先出数字再动手 —— 扫描是**只读**的,它只回答"有多少张图、丢了什么"。
 * 回补是另一次显式点击,而且只补不覆盖:用户手动加的 tag、改过的 prompt
 * 一律不碰(规则写在 aigcStore.backfillMetadata 的注释里)。
 */
const emit = defineEmits<{
  inspect: [imageId: number]
}>()

const store = useAigcStore()
const { t } = useI18n()
const toast = useToast()

const scanning = ref(false)
const backfilling = ref(false)
const progress = ref({ done: 0, total: 0 })
const result = ref<MetadataScanResult | null>(null)

const ISSUE_LABELS: Record<MetadataIssueKind, { label: string; tone: string }> = {
  'decode-failed': { label: 'inspector.issue.decodeFailed', tone: 'text-destructive' },
  'encoding-fallback': { label: 'inspector.issue.encodingFallback', tone: 'text-warning' },
  'raw-mismatch': { label: 'inspector.issue.rawMismatch', tone: 'text-warning' },
  'missing-params': { label: 'inspector.issue.missingParams', tone: 'text-primary' },
  'stealth-unflagged': { label: 'inspector.issue.stealthUnflagged', tone: 'text-primary' },
  'source-mismatch': { label: 'inspector.issue.sourceMismatch', tone: 'text-primary' },
  'missing-v4': { label: 'inspector.issue.missingV4', tone: 'text-primary' },
}

const percent = computed(() =>
  progress.value.total ? Math.round((progress.value.done / progress.value.total) * 100) : 0
)

const busy = computed(() => scanning.value || backfilling.value)

/*
 * 只有 /aigc 与 /gallery 会 loadAll。直接落在这个 tab 上(或刷新)时 images 是空的,
 * 扫描按钮会莫名其妙地灰着 —— 自己把库拉起来。loadAll 走 enqueueImageMutation,
 * 与图库页各自调用不会打架。
 */
onMounted(() => {
  if (!store.images.length) void store.loadAll()
})

async function runScan() {
  scanning.value = true
  result.value = null
  progress.value = { done: 0, total: store.images.length }
  try {
    result.value = await store.scanMetadataIntegrity((done, total) => {
      progress.value = { done, total }
    })
  } catch {
    toast.error(t('inspector.scanFailed'))
  } finally {
    scanning.value = false
  }
}

async function runBackfill() {
  const findings = result.value?.findings ?? []
  if (!findings.length) return
  backfilling.value = true
  progress.value = { done: 0, total: findings.length }
  try {
    const { updated, failed } = await store.backfillMetadata(
      findings.map(f => f.imageId),
      (done, total) => { progress.value = { done, total } }
    )
    /*
     * 逐行失败(写库被拒、结构化克隆失败)不再静默 —— 只报「补了 N 条」时,
     * 数字对不上会被当成"扫描误报"。失败数走 error 提示,细节在 console。
     */
    if (failed) {
      toast.error(t('inspector.backfillPartial', { n: updated, failed }))
    } else {
      toast.success(t('inspector.backfillDone', { n: updated }))
    }
    // 回补后重扫,让剩下的问题(真解不开的块)如实留在列表里
    await runScan()
  } catch {
    toast.error(t('inspector.backfillFailed'))
  } finally {
    backfilling.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 操作条 -->
    <section class="panel rounded-lg p-4">
      <SectionLabel>{{ t('inspector.scanTitle') }}</SectionLabel>
      <p class="mt-2 text-xs leading-relaxed text-muted-foreground">{{ t('inspector.scanHint') }}</p>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" class="gap-2" :disabled="busy || !store.images.length" @click="runScan">
          <Loader2 v-if="scanning" class="h-3.5 w-3.5 animate-spin" />
          <ScanSearch v-else class="h-3.5 w-3.5" />
          {{ t('inspector.runScan') }}
        </Button>

        <Button
          v-if="result?.findings.length"
          size="sm"
          variant="outline"
          class="gap-2"
          :disabled="busy"
          @click="runBackfill"
        >
          <Loader2 v-if="backfilling" class="h-3.5 w-3.5 animate-spin" />
          <Wrench v-else class="h-3.5 w-3.5" />
          {{ t('inspector.runBackfill') }} · {{ result.findings.length }}
        </Button>

        <span v-if="busy" class="readout text-2xs text-dim">
          {{ progress.done }} / {{ progress.total }} · {{ percent }}%
        </span>
        <span v-else-if="store.isLoading" class="micro">{{ t('inspector.libraryLoading') }}</span>
        <span v-else-if="!store.images.length" class="micro">{{ t('inspector.libraryEmpty') }}</span>
      </div>

      <p v-if="result?.findings.length" class="micro mt-2.5 text-warning">
        {{ t('inspector.backfillSafety') }}
      </p>
    </section>

    <!-- 结果 -->
    <section v-if="result" class="flex flex-col">
      <SectionLabel>
        {{ t('inspector.scanned') }} {{ result.scanned }} · {{ t('inspector.affected') }} {{ result.findings.length }}
      </SectionLabel>

      <div v-if="!result.findings.length" class="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 class="h-4 w-4 text-primary" />
        {{ t('inspector.allClean') }}
      </div>

      <div v-else class="mt-1.5 flex flex-col">
        <button
          v-for="finding in result.findings"
          :key="finding.imageId"
          type="button"
          class="flex flex-col gap-1 border-b py-2 text-left transition-colors hover:bg-accent/60"
          @click="emit('inspect', finding.imageId)"
        >
          <div class="flex items-baseline gap-2">
            <span class="min-w-0 flex-1 truncate font-mono text-xs" :title="finding.filename">
              {{ finding.filename }}
            </span>
            <span v-if="finding.storedSource !== finding.parsedSource" class="micro text-primary">
              {{ finding.storedSource }} → {{ finding.parsedSource }}
            </span>
            <span v-else class="micro">{{ finding.storedSource }}</span>
          </div>

          <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span
              v-for="issue in finding.issues"
              :key="issue"
              class="micro"
              :class="ISSUE_LABELS[issue].tone"
            >{{ t(ISSUE_LABELS[issue].label) }}</span>
          </div>

          <p v-if="finding.missingKeys.length" class="text-2xs break-all text-dim">
            {{ finding.missingKeys.join(', ') }}
          </p>
        </button>
      </div>
    </section>
  </div>
</template>

