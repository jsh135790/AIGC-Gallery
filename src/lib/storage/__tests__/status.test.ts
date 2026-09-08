import { afterEach, describe, expect, it, vi } from 'vitest'
import { StorageStatusController } from '../status'
import { LibraryCoordinator } from '../coordination'
import { MemoryStorage, memoryLocks, deferred } from './helpers'

describe('storage persistence', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it.each([true, false])('reports the browser decision (%s) and requests automatically once per session', async granted => {
    const manager = { persisted: vi.fn(async () => false), persist: vi.fn(async () => granted), estimate: vi.fn(async () => ({ usage: 512, quota: 4096 })) }
    const status = new StorageStatusController(manager)
    await Promise.all([status.request(true), status.request(true)])
    await status.request(true)
    expect(status.state).toBe(granted ? 'persistent' : 'best-effort')
    expect(status.requestResult).toBe(granted ? 'granted' : 'denied')
    expect(status.requesting).toBe(false)
    expect(manager.persist).toHaveBeenCalledTimes(1)
    expect(status.usage).toBe(512)
    expect(status.quota).toBe(4096)
  })
  it('does not request already granted persistence', async () => {
    const persist = vi.fn(async () => true)
    const status = new StorageStatusController({ persisted: async () => true, persist })
    await status.request(true)
    expect(persist).not.toHaveBeenCalled()
    expect(status.state).toBe('persistent')
    expect(status.requestResult).toBe('granted')
  })
  it('allows manual retry after automatic denial', async () => {
    const manager = { persisted: async () => false, persist: vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true) }
    const status = new StorageStatusController(manager)
    await status.request(true)
    expect(status.requestResult).toBe('denied')
    await status.request()
    expect(status.state).toBe('persistent')
    expect(status.requestResult).toBe('granted')
    expect(manager.persist).toHaveBeenCalledTimes(2)
  })
  it('keeps the denial explanation after a storage usage refresh without logging a browser error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const status = new StorageStatusController({ persisted: async () => false, persist: async () => false })
    expect(status.requestResult).toBeNull()
    await status.request()
    await status.refresh()
    expect(status.state).toBe('best-effort')
    expect(status.requestResult).toBe('denied')
    expect(warn).not.toHaveBeenCalled()
  })
  it('clears the previous result while retrying and publishes the completed result', async () => {
    const finish = deferred(), started = deferred()
    const persist = vi.fn().mockResolvedValueOnce(false).mockImplementationOnce(async () => {
      started.resolve()
      await finish.promise
      return true
    })
    const changed = vi.fn()
    const status = new StorageStatusController({ persisted: async () => false, persist }, changed)
    await status.request()
    const retry = status.request()
    await started.promise
    expect(status.requesting).toBe(true)
    expect(status.requestResult).toBeNull()
    changed.mockClear()
    finish.resolve()
    await retry
    expect(status.requesting).toBe(false)
    expect(status.requestResult).toBe('granted')
    expect(changed).toHaveBeenCalled()
  })
  it('distinguishes a failed request from a normal denial and allows recovery', async () => {
    const error = new TypeError('Storage is disabled')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const persist = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(true)
    const status = new StorageStatusController({ persisted: async () => false, persist })
    await status.request()
    expect(status.state).toBe('error')
    expect(status.requestResult).toBe('error')
    expect(status.requesting).toBe(false)
    expect(warn).toHaveBeenCalledWith('[Storage] Could not request persistent storage:', error)
    await status.request()
    expect(status.state).toBe('persistent')
    expect(status.requestResult).toBe('granted')
  })
  it('handles absent APIs and rejected queries', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const unsupported = new StorageStatusController(undefined)
    await unsupported.request()
    expect(unsupported.state).toBe('unsupported')
    expect(unsupported.requestResult).toBe('unsupported')
    const broken = new StorageStatusController({ persisted: async () => { throw Error() }, persist: async () => { throw Error() }, estimate: async () => { throw Error() } })
    await broken.request(true)
    expect(broken.state).toBe('error')
    expect(broken.requestResult).toBe('error')
    expect(broken.estimateFailed).toBe(true)
    expect(broken.usage).toBeNull()
  })
  it('coalesces concurrent estimates and discards invalid quota values', async () => {
    const estimate = vi.fn(async () => ({ usage: 0, quota: 0 }))
    const status = new StorageStatusController({ estimate })
    await Promise.all([status.refresh(), status.refresh(), status.refresh()])
    expect(estimate).toHaveBeenCalledTimes(1)
    expect(status.usage).toBe(0)
    expect(status.quota).toBeNull()
  })
})

describe('cross-tab coordination', () => {
  it('can cancel an exclusive request while waiting for an existing write', async () => {
    const coordinator = new LibraryCoordinator(memoryLocks(), new MemoryStorage())
    const finish = deferred(), started = deferred()
    const saving = coordinator.write(async () => { started.resolve(); await finish.promise })
    await started.promise
    const abort = new AbortController()
    const maintain = coordinator.maintain(async () => 'never', abort.signal)
    abort.abort()
    await expect(maintain).rejects.toHaveProperty('name', 'AbortError')
    finish.resolve()
    await saving
  })
  it('keeps ordinary writes usable without locks but disables maintenance', async () => {
    const coordinator = new LibraryCoordinator(undefined, new MemoryStorage())
    await expect(coordinator.write(async () => 42)).resolves.toBe(42)
    await expect(coordinator.maintain(async () => 42)).rejects.toMatchObject({ code: 'coordination-unavailable' })
  })
})
