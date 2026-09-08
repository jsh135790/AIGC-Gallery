// 使用最小结构接口，既能接浏览器句柄，也能在测试里模拟磁盘写满、权限丢失。
export interface BackupWritable {
  write(data: Blob | string): Promise<void>
  close(): Promise<void>
  abort(): Promise<void>
}
export interface BackupFileHandle {
  getFile(): Promise<File>
  createWritable(): Promise<BackupWritable>
}
export interface BackupDirectory {
  name: string
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<BackupDirectory>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<BackupFileHandle>
}
export type DirectoryPicker = (options: { mode: 'read' | 'readwrite'; id: string }) => Promise<BackupDirectory>

export function directorySupport(): 'available' | 'insecure' | 'unsupported' {
  if (!globalThis.isSecureContext) return 'insecure'
  if (!('showDirectoryPicker' in window) || !navigator.locks || !crypto.subtle) return 'unsupported'
  return 'available'
}

export function pickBackupDirectory(mode: 'read' | 'readwrite') {
  const picker = (window as unknown as { showDirectoryPicker: DirectoryPicker }).showDirectoryPicker
  // 必须在点击处理器里同步调用；等待数据库或权限检查会消耗瞬时用户激活。
  return picker.call(window, { mode, id: mode === 'read' ? 'aigc-restore' : 'aigc-backup' })
}

export async function resolveFile(directory: BackupDirectory, path: string, create = false) {
  const [folder, filename] = path.split('/')
  const child = await directory.getDirectoryHandle(folder, { create })
  return child.getFileHandle(filename, { create })
}

export async function writeFile(handle: BackupFileHandle, data: Blob | string, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const writable = await handle.createWritable()
  try {
    await writable.write(data)
    signal?.throwIfAborted()
    await writable.close()
  } catch (error) {
    try { await writable.abort() } catch { /* 关闭失败后尽力释放流，保留原始错误。 */ }
    throw error
  }
}
