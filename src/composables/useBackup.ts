import { computed, ref, shallowRef } from 'vue'
import { db } from '@/lib/db'
import { BackupService, type BackupProgress, type InspectedBackup } from '@/lib/storage/backup'
import { libraryCoordinator, LibraryAccessError } from '@/lib/storage/coordination'
import { BackupError } from '@/lib/storage/manifest'
import { directorySupport, pickBackupDirectory } from '@/lib/storage/directory'
import { LAST_BACKUP_KEY, type BackupSettings, type SettingKey } from '@/lib/storage/settings'
import { useStorageStatus } from './useStorageStatus'

const busy = ref(false)
const progress = shallowRef<BackupProgress | null>(null)
const inspected = shallowRef<InspectedBackup | null>(null)
const message = ref('')
const errorCode = ref('')
const details = ref<string[]>([])
const restored = ref(false)
const failedSettings = ref<SettingKey[]>([])
const lastBackup = shallowRef<{ createdAt: string; name: string } | null>(null)
let controller: AbortController | undefined
let settingsToRetry: BackupSettings | undefined

function service() { return new BackupService(db, localStorage, libraryCoordinator) }

function refreshHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_BACKUP_KEY) ?? 'null')
    lastBackup.value = saved && typeof saved.name === 'string' && typeof saved.createdAt === 'string' && !Number.isNaN(Date.parse(saved.createdAt)) ? saved : null
  } catch { lastBackup.value = null }
}

function report(error: unknown) {
  const name = error instanceof Error || error instanceof DOMException ? error.name : ''
  if (error instanceof BackupError || error instanceof LibraryAccessError) {
    errorCode.value = error.code
    details.value = error instanceof BackupError ? error.details : []
  } else if (name === 'AbortError') {
    message.value = 'cancelled'
  } else if (['NotAllowedError', 'SecurityError'].includes(name)) {
    errorCode.value = 'permission'
  } else if (name === 'QuotaExceededError') {
    errorCode.value = 'quota'
  } else {
    errorCode.value = 'io'
    details.value = [error instanceof Error ? error.message : String(error)]
  }
}

function begin() {
  busy.value = true
  message.value = errorCode.value = ''
  details.value = []
  progress.value = null
  controller = new AbortController()
  return { signal: controller.signal, onProgress: (value: BackupProgress) => { progress.value = value } }
}

async function finish() {
  busy.value = false
  controller = undefined
  refreshHistory()
  await useStorageStatus().refresh()
}

async function createBackup() {
  if (busy.value || restored.value) return
  const options = begin()
  inspected.value = null
  try {
    const parent = await pickBackupDirectory('readwrite')
    const result = await service().create(parent, options)
    message.value = result.historySaved ? 'created' : 'created-no-history'
    details.value = [result.directory.name]
  } catch (error) { report(error) } finally { await finish() }
}

async function inspectBackup() {
  if (busy.value || restored.value) return
  const options = begin()
  inspected.value = null
  try {
    const directory = await pickBackupDirectory('read')
    await service().checkEmpty()
    inspected.value = await service().inspect(directory, options)
  } catch (error) { report(error) } finally { await finish() }
}

async function restoreBackup() {
  if (busy.value || !inspected.value || restored.value) return
  const options = begin()
  try {
    const result = await service().restore(inspected.value, options)
    restored.value = true
    settingsToRetry = result.settings
    failedSettings.value = result.failedSettings
    inspected.value = null
    message.value = result.failedSettings.length ? 'settings-failed' : 'restored'
  } catch (error) { report(error) } finally { await finish() }
}

function retrySettings() {
  if (!settingsToRetry) return
  failedSettings.value = service().retrySettings(settingsToRetry)
  message.value = failedSettings.value.length ? 'settings-failed' : 'restored'
}

export function useBackup() {
  return {
    busy, progress, inspected, restored, failedSettings, lastBackup, message, errorCode, details,
    support: directorySupport,
    preventClose: computed(() => busy.value || restored.value),
    refreshHistory, createBackup, inspectBackup, restoreBackup, retrySettings,
    cancel: () => controller?.abort(),
    reload: () => location.reload(),
  }
}
