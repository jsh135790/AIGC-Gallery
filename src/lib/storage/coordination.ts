import { ref } from 'vue'

const LOCK_NAME = 'aigc-gallery:library-maintenance'
const EPOCH_KEY = 'aigc-gallery:library-epoch'

export class LibraryAccessError extends Error {
  constructor(public code: 'stale-library' | 'coordination-unavailable') {
    super(code)
    this.name = 'LibraryAccessError'
  }
}

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class LibraryCoordinator {
  private loadedEpoch: string
  private listeners = new Set<() => void>()
  readonly remoteStale = ref(false)

  constructor(private locks?: LockManager, private storage?: KeyValueStorage) {
    this.loadedEpoch = this.epoch()
  }

  private epoch() {
    try { return this.storage?.getItem(EPOCH_KEY) ?? '' } catch { return '' }
  }

  checkFresh() {
    if (this.epoch() !== this.loadedEpoch) throw new LibraryAccessError('stale-library')
  }

  onStorageChange(key: string | null) {
    if (key === EPOCH_KEY && this.epoch() !== this.loadedEpoch) this.remoteStale.value = true
  }

  onWrite(listener: () => void) {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  async write<T>(operation: () => Promise<T>): Promise<T> {
    this.checkFresh()
    const run = async () => {
      // 排队期间可能完成了恢复；不能把旧页面上的 ID 写到新库里。
      this.checkFresh()
      try { return await operation() } finally {
        for (const listener of this.listeners) listener()
      }
    }
    // 老浏览器仍能使用图库；完整备份入口会单独要求跨标签页协调能力。
    // 所有会改变 IndexedDB 的 store 操作都走独占锁。备份的只读快照也要排在
    // 已开始的写入之后，不能用 shared 让两个写入同时穿过一致性边界。
    return this.locks ? this.locks.request(LOCK_NAME, { mode: 'exclusive' }, run) : run()
  }

  async maintain<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!this.locks || !this.storage) throw new LibraryAccessError('coordination-unavailable')
    this.checkFresh()
    return this.locks.request(LOCK_NAME, { mode: 'exclusive', signal }, async () => {
      this.checkFresh()
      signal?.throwIfAborted()
      return operation()
    })
  }

  invalidateBeforeRestore() {
    if (!this.storage) throw new LibraryAccessError('coordination-unavailable')
    // 必须先使旧页面失效，再提交恢复。即使恢复失败，重新加载旧库也是安全的。
    this.storage.setItem(EPOCH_KEY, crypto.randomUUID())
  }

  acknowledgeFailedRestore() {
    this.loadedEpoch = this.epoch()
  }
}

function browserStorage() {
  try { return typeof localStorage === 'undefined' ? undefined : localStorage } catch { return undefined }
}

export const libraryCoordinator = new LibraryCoordinator(
  typeof navigator === 'undefined' ? undefined : navigator.locks,
  browserStorage(),
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => libraryCoordinator.onStorageChange(event.key))
}

export function coordinatedWrite<A extends unknown[], R>(operation: (...args: A) => Promise<R>) {
  return (...args: A) => libraryCoordinator.write(() => operation(...args))
}
