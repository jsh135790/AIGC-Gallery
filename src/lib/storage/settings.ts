import type { KeyValueStorage } from './coordination'

export const SETTING_KEYS = [
  'locale', 'theme', 'accent-color', 'blur-effect-enabled',
  'artist-auto-fill-name', 'artist-auto-fill-prefix', 'artist-custom-prefix',
  'aigc-auto-parse-tags', 'aigc.viewMode', 'artistGallery.selectedPageId',
] as const
export type SettingKey = typeof SETTING_KEYS[number]
export type BackupSettings = Record<SettingKey, string | null>
export const LAST_BACKUP_KEY = 'aigc-gallery:last-complete-backup'

export function readSettings(storage: KeyValueStorage): BackupSettings {
  return Object.fromEntries(SETTING_KEYS.map(key => [key, storage.getItem(key)])) as BackupSettings
}

export function validSetting(key: SettingKey, value: unknown): boolean {
  if (value === null) return true
  if (typeof value !== 'string') return false
  switch (key) {
    case 'locale': return ['zh-CN', 'en'].includes(value)
    case 'theme': return ['light', 'dark', 'system'].includes(value)
    case 'accent-color': return /^#[a-f\d]{6}$/i.test(value)
    case 'aigc.viewMode': return ['grid', 'masonry'].includes(value)
    case 'artistGallery.selectedPageId': return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))
    case 'artist-custom-prefix': return true
    default: return value === 'true' || value === 'false'
  }
}

export function restoreSettings(storage: KeyValueStorage, settings: BackupSettings): SettingKey[] {
  const failed: SettingKey[] = []
  // 设置与 IndexedDB 不共享事务；失败的项可单独重试，不重复导入图库。
  for (const key of SETTING_KEYS) {
    try {
      if (settings[key] === null) storage.removeItem(key)
      else storage.setItem(key, settings[key])
    } catch { failed.push(key) }
  }
  return failed
}
