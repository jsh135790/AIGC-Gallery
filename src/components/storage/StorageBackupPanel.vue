<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Archive, FolderOpen, RefreshCw, ShieldCheck, ShieldAlert, HardDrive, ArrowDownToLine } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'
import { useBackup } from '@/composables/useBackup'
import { useStorageStatus } from '@/composables/useStorageStatus'

const { t } = useI18n()
const { status, refresh, requestPersistence } = useStorageStatus()
const {
  busy, progress, inspected, restored, failedSettings, lastBackup, message, errorCode, details,
  support, refreshHistory, createBackup, inspectBackup, restoreBackup, retrySettings, cancel, reload,
} = useBackup()
const capability = support()
const source = location.protocol === 'file:' ? location.href.split('#')[0] : location.origin
const percentage = computed(() => status.value.usage !== null && status.value.quota
  ? Math.min(100, status.value.usage / status.value.quota * 100) : null)
const progressPercent = computed(() => progress.value?.total ? Math.round(progress.value.done / progress.value.total * 100) : 0)
const summary = computed(() => {
  if (!inspected.value) return null
  const { manifest } = inspected.value
  return {
    createdAt: new Date(manifest.createdAt).toLocaleString(),
    images: manifest.tables.aigcImages.length,
    artists: manifest.tables.artists.length,
    pages: manifest.tables.artistPages.length,
    folders: manifest.tables.aigcFolders.length,
    bytes: manifest.files.reduce((sum, file) => sum + file.size, 0),
  }
})
function size(value: number | null) {
  if (value === null) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const unit = Math.min(4, Math.max(0, Math.floor(Math.log(value || 1) / Math.log(1024))))
  return `${(value / 1024 ** unit).toFixed(unit > 0 ? 1 : 0)} ${units[unit]}`
}
onMounted(() => { refreshHistory(); void refresh() })
</script>

<template>
  <div class="space-y-5 text-sm">
    <section class="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div class="flex items-center gap-2 font-medium">
          <ShieldCheck v-if="status.state === 'persistent'" class="h-4 w-4 text-primary" />
          <ShieldAlert v-else class="h-4 w-4 text-muted-foreground" />
          <span role="status">{{ t(`storage.state.${status.state}`) }}</span>
        </div>
        <Button v-if="status.state !== 'persistent' && status.state !== 'unsupported'" variant="outline" size="sm"
          :disabled="busy || restored || status.requesting" @click="requestPersistence">
          {{ t(status.requesting ? 'storage.requesting' : status.requestResult === 'denied' || status.requestResult === 'error' ? 'storage.retry' : 'storage.request') }}
        </Button>
      </div>
      <p v-if="!status.requesting && status.requestResult === 'denied' && status.state === 'best-effort'"
        role="status" class="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed">
        {{ t('storage.requestDenied') }}
      </p>
      <p v-else-if="!status.requesting && status.requestResult === 'error' && status.state !== 'persistent' && status.state !== 'unsupported'"
        role="alert" class="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
        {{ t('storage.requestFailed') }}
      </p>
      <p class="text-xs leading-relaxed text-muted-foreground">{{ t('storage.persistenceNote') }}</p>
      <div class="border-t pt-3">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs text-muted-foreground">{{ t('storage.usage') }}</span>
          <Button variant="ghost" size="icon" class="h-7 w-7" :aria-label="t('storage.refresh')" @click="refresh">
            <RefreshCw class="h-3.5 w-3.5" />
          </Button>
        </div>
        <div class="font-mono text-xl tracking-tight tabular-nums">
          {{ size(status.usage) }} <span class="text-sm text-muted-foreground">/ {{ size(status.quota) }}</span>
        </div>
        <div v-if="percentage !== null" class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted" role="meter" :aria-valuenow="percentage" :aria-valuemin="0" :aria-valuemax="100" :aria-label="t('storage.usage')">
          <div class="h-full rounded-full bg-primary" :style="{ width: `${percentage}%` }" />
        </div>
        <p class="mt-1.5 text-xs text-muted-foreground">{{ t(status.estimateFailed ? 'storage.estimateFailed' : 'storage.estimateNote') }}</p>
      </div>
      <div class="border-t pt-3 text-xs">
        <span class="flex items-center gap-1.5 text-muted-foreground"><HardDrive class="h-3.5 w-3.5" />{{ t('storage.source') }}</span>
        <p class="mt-1 break-all font-mono select-all">{{ source }}</p>
      </div>
    </section>

    <section class="space-y-3">
      <div>
        <h3 class="flex items-center gap-2 font-medium"><Archive class="h-4 w-4 text-primary" />{{ t('storage.snapshot') }}</h3>
        <p class="mt-1.5 text-xs leading-relaxed text-muted-foreground">{{ t('storage.snapshotNote') }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button :disabled="busy || restored || capability !== 'available'" class="gap-2" @click="createBackup">
          <ArrowDownToLine class="h-4 w-4" />{{ t('storage.create') }}
        </Button>
        <Button variant="outline" :disabled="busy || restored || capability !== 'available'" class="gap-2" @click="inspectBackup">
          <FolderOpen class="h-4 w-4" />{{ t('storage.selectRestore') }}
        </Button>
      </div>
      <p v-if="capability !== 'available'" class="text-xs leading-relaxed text-muted-foreground">{{ t(`storage.capability.${capability}`) }}</p>
      <p class="text-xs text-muted-foreground">{{ t('storage.emptyOnly') }}</p>
      <div class="border-t pt-3 text-xs space-y-1">
        <p>{{ t('storage.lastBackup') }} <span class="font-mono">{{ lastBackup ? new Date(lastBackup.createdAt).toLocaleString() : t('storage.never') }}</span></p>
        <p class="text-muted-foreground">{{ t('storage.historyNote') }}</p>
      </div>
    </section>

    <div v-if="busy" class="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2" role="status" aria-live="polite">
      <div class="flex justify-between items-center gap-3">
        <span>{{ t(progress ? `storage.phase.${progress.phase}` : 'storage.selecting') }}</span>
        <Button variant="ghost" size="sm" @click="cancel">{{ t('storage.cancel') }}</Button>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" :aria-valuenow="progressPercent" :aria-valuemin="0" :aria-valuemax="100" :aria-label="t('storage.progress')">
        <div class="h-full rounded-full bg-primary" :style="{ width: `${progressPercent}%` }" />
      </div>
      <div v-if="progress" class="flex justify-between gap-2 font-mono text-xs text-muted-foreground">
        <span>{{ progress.done }} / {{ progress.total }}</span>
        <span v-if="progress.bytesTotal">{{ size(progress.bytesDone) }} / {{ size(progress.bytesTotal) }}</span>
      </div>
      <p v-if="progress?.path" class="truncate font-mono text-xs text-muted-foreground">{{ progress.path }}</p>
    </div>

    <section v-if="summary && !restored" class="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
      <h3 class="font-medium">{{ t('storage.verified') }}</h3>
      <p class="text-xs font-mono">{{ summary.createdAt }} · {{ size(summary.bytes) }}</p>
      <p class="text-xs leading-relaxed">{{ t('storage.summary', { images: summary.images, artists: summary.artists, pages: summary.pages, folders: summary.folders }) }}</p>
      <Button :disabled="busy" @click="restoreBackup">{{ t('storage.restore') }}</Button>
    </section>

    <div v-if="message || errorCode" :role="errorCode ? 'alert' : 'status'" aria-live="polite" class="rounded-lg border p-3 text-xs leading-relaxed space-y-2" :class="errorCode ? 'border-destructive/40 text-destructive' : 'border-primary/30'">
      <p>{{ t(errorCode ? `storage.error.${errorCode}` : `storage.message.${message}`) }}</p>
      <ul v-if="details.length" class="max-h-28 overflow-y-auto space-y-1 break-all font-mono text-muted-foreground">
        <li v-for="(detail, index) in details" :key="index">{{ detail }}</li>
      </ul>
      <p v-if="failedSettings.length" class="break-all font-mono text-muted-foreground">{{ failedSettings.join(', ') }}</p>
      <div v-if="restored" class="flex flex-wrap gap-2">
        <Button v-if="failedSettings.length" variant="outline" size="sm" @click="retrySettings">{{ t('storage.retrySettings') }}</Button>
        <Button size="sm" @click="reload">{{ t('storage.reload') }}</Button>
      </div>
    </div>
  </div>
</template>
