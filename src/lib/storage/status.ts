export type PersistenceState = 'checking' | 'persistent' | 'best-effort' | 'unsupported' | 'error'
export type PersistenceRequestResult = 'granted' | 'denied' | 'unsupported' | 'error'

export class StorageStatusController {
  state: PersistenceState = 'checking'
  usage: number | null = null
  quota: number | null = null
  estimateFailed = false
  requesting = false
  requestResult: PersistenceRequestResult | null = null
  private attempted = false
  private pending?: Promise<void>

  constructor(private manager: Partial<StorageManager> | undefined, private changed: () => void = () => {}) {}

  refresh() {
    if (this.pending) return this.pending
    this.pending = this.read().finally(() => { this.pending = undefined; this.changed() })
    return this.pending
  }

  private async read() {
    if (!this.manager?.persisted || !this.manager.persist) this.state = 'unsupported'
    else {
      try { this.state = await this.manager.persisted() ? 'persistent' : 'best-effort' }
      catch (error) {
        this.state = 'error'
        console.warn('[Storage] Could not check persistent storage:', error)
      }
    }
    this.usage = this.quota = null
    this.estimateFailed = false
    if (this.manager?.estimate) {
      try {
        const estimate = await this.manager.estimate()
        this.usage = Number.isFinite(estimate.usage) && estimate.usage! >= 0 ? estimate.usage! : null
        this.quota = Number.isFinite(estimate.quota) && estimate.quota! > 0 ? estimate.quota! : null
      } catch { this.estimateFailed = true }
    }
  }

  async request(automatic = false) {
    if (this.requesting || (automatic && this.attempted)) return
    if (automatic) this.attempted = true
    this.requesting = true
    this.requestResult = null
    this.changed()
    try {
      await this.refresh()
      if (!this.manager?.persist || this.state === 'unsupported') {
        this.requestResult = 'unsupported'
        return
      }
      if (this.state === 'persistent') {
        this.requestResult = 'granted'
        return
      }
      try {
        const granted = await this.manager.persist()
        this.state = granted ? 'persistent' : 'best-effort'
        // Chromium 可直接返回 false 而不弹窗；单独保留申请结果，避免刷新用量后丢失拒绝提示。
        this.requestResult = granted ? 'granted' : 'denied'
      } catch (error) {
        this.state = 'error'
        this.requestResult = 'error'
        console.warn('[Storage] Could not request persistent storage:', error)
      }
    } finally { this.requesting = false; this.changed() }
  }
}
