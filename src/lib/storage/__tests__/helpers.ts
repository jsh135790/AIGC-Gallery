import type { BackupDirectory, BackupFileHandle, BackupWritable } from '../directory'
import type { KeyValueStorage } from '../coordination'

export class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>()
  failKey = ''
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) {
    if (key === this.failKey) throw new DOMException('Quota full', 'QuotaExceededError')
    this.data.set(key, value)
  }
  removeItem(key: string) {
    if (key === this.failKey) throw new DOMException('Quota full', 'QuotaExceededError')
    this.data.delete(key)
  }
}

export class MemoryFile implements BackupFileHandle {
  data = new Blob([])
  constructor(public name: string, private root: MemoryDirectory) {}
  async getFile() { return new File([this.data], this.name) }
  async createWritable(): Promise<BackupWritable> {
    let next = this.data
    return {
      write: async data => {
        if (this.root.failure) throw this.root.failure
        next = data instanceof Blob ? data : new Blob([data])
      },
      close: async () => { this.data = this.root.corrupt ? new Blob(['corrupt']) : next },
      abort: async () => {},
    }
  }
}
export class MemoryDirectory implements BackupDirectory {
  directories = new Map<string, MemoryDirectory>()
  files = new Map<string, MemoryFile>()
  failure?: Error
  corrupt = false
  constructor(public name = 'root', private root: MemoryDirectory = undefined!) { this.root ||= this }
  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<MemoryDirectory> {
    if (this.root.failure?.name === 'NotAllowedError') throw this.root.failure
    if (!this.directories.has(name)) {
      if (!options?.create) throw new DOMException(name, 'NotFoundError')
      this.directories.set(name, new MemoryDirectory(name, this.root))
    }
    return this.directories.get(name)!
  }
  async getFileHandle(name: string, options?: { create?: boolean }): Promise<MemoryFile> {
    if (!this.files.has(name)) {
      if (!options?.create) throw new DOMException(name, 'NotFoundError')
      this.files.set(name, new MemoryFile(name, this.root))
    }
    return this.files.get(name)!
  }
}

/** FIFO、共享/独占与排队取消均模拟，测试恢复是否阻止旧写入，而非只验证函数调用。 */
export function memoryLocks(): LockManager {
  type Request = { mode: string; signal?: AbortSignal; run: () => void; cancel: () => void }
  const queue: Request[] = []
  let active = 0
  let exclusive = false
  const pump = () => {
    if (exclusive) return
    while (queue.length) {
      const next = queue[0]
      if (next.mode === 'exclusive' && active) return
      queue.shift()
      if (next.signal?.aborted) { next.cancel(); continue }
      active++
      exclusive = next.mode === 'exclusive'
      next.run()
      if (exclusive) return
    }
  }
  return {
    request: (_name: string, options: LockOptions, callback: () => Promise<unknown>) => new Promise<unknown>((resolve, reject) => {
      const item: Request = {
        mode: options.mode ?? 'exclusive', signal: options.signal,
        cancel: () => reject(options.signal?.reason),
        run: () => {
          options.signal?.removeEventListener('abort', abort)
          Promise.resolve().then(callback).then(resolve, reject).finally(() => { active--; exclusive = false; pump() })
        },
      }
      const abort = () => {
        const index = queue.indexOf(item)
        if (index >= 0) { queue.splice(index, 1); item.cancel(); pump() }
      }
      options.signal?.addEventListener('abort', abort, { once: true })
      queue.push(item)
      pump()
    }),
  } as LockManager
}

export function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}
