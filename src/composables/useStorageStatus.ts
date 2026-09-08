import { shallowRef } from 'vue'
import { db } from '@/lib/db'
import { libraryCoordinator } from '@/lib/storage/coordination'
import { StorageStatusController } from '@/lib/storage/status'
import { isInitialArtistPage } from '@/lib/storage/backup'

const status = shallowRef({ state: 'checking', usage: null, quota: null, estimateFailed: false, requesting: false, requestResult: null } as Pick<StorageStatusController, 'state' | 'usage' | 'quota' | 'estimateFailed' | 'requesting' | 'requestResult'>)
const controller = new StorageStatusController(
  typeof navigator === 'undefined' ? undefined : navigator.storage,
  () => { status.value = { state: controller.state, usage: controller.usage, quota: controller.quota, estimateFailed: controller.estimateFailed, requesting: controller.requesting, requestResult: controller.requestResult } },
)
let started = false
let timer: ReturnType<typeof setTimeout> | undefined
let checkingData = false

async function refreshAfterWrites() {
  if (checkingData) return
  checkingData = true
  try {
    await controller.refresh()
    const [artists, images, folders, tags, pages] = await Promise.all([db.artists.count(), db.aigcImages.count(), db.aigcFolders.count(), db.tags.count(), db.artistPages.toArray()])
    if (artists + images + folders + tags > 0 || pages.length > 1 || pages.some(page => !isInitialArtistPage(page))) {
      await controller.request(true)
    }
  } catch {
    // 存储状态查询失败不能阻止图库启动；各页面仍负责显示实际读写错误。
  } finally { checkingData = false }
}

export function startStorageStatus() {
  if (started) return
  started = true
  void refreshAfterWrites()
  libraryCoordinator.onWrite(() => {
    clearTimeout(timer)
    timer = setTimeout(() => { void refreshAfterWrites() }, 400)
  })
}

export function useStorageStatus() {
  return { status, refresh: () => controller.refresh(), requestPersistence: () => controller.request() }
}
