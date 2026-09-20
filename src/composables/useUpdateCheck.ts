import { computed, ref, shallowRef, watch } from 'vue'
import { fetchLatestRelease, isFreshCache, isNewerVersion, type ReleaseInfo, type UpdateCheckCache } from '@/lib/update-check'

/*
 * 启动时检查一次更新。模块级单例(同 useStorageStatus):App.vue 调 startUpdateCheck() 一次,组件只读状态。
 *
 * 三个 localStorage key 都**不进** SETTING_KEYS:备份清单把 SETTING_KEYS 当闭集校验,少一个 key 的旧备份
 * 会被判 invalid-backup 而恢复不了;而且「看过哪个版本」「上次查询结果」本来就是这台机器的状态,不该随备份迁移。
 */
const ENABLED_KEY = 'aigc-gallery:check-updates'
const SEEN_KEY = 'aigc-gallery:seen-release'
const CACHE_KEY = 'aigc-gallery:update-check'
const START_DELAY_MS = 3000
const TIMEOUT_MS = 8000

export type UpdateStatus = 'idle' | 'disabled' | 'checking' | 'up-to-date' | 'available' | 'failed'

function read(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string | null) {
  // 隐私模式等写不进就算了,只影响下次能不能复用结果
  try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value) } catch { /* ignore */ }
}

const enabled = ref(read(ENABLED_KEY) !== 'false')
const seenRelease = ref(read(SEEN_KEY))
const status = shallowRef<UpdateStatus>('idle')
const latest = shallowRef<ReleaseInfo | null>(null)
const hasUnseenUpdate = computed(() => status.value === 'available' && latest.value !== null && seenRelease.value !== latest.value.tag)
let started = false
let running = false

watch(enabled, value => {
  write(ENABLED_KEY, value ? null : 'false')
  if (value) {
    void check(false) // 从关切开:立刻查一次,给开关一个看得见的反馈
  } else {
    status.value = 'disabled'
    latest.value = null
  }
})

function readCache(): UpdateCheckCache | null {
  const raw = read(CACHE_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isFreshCache(parsed) ? parsed : null
  } catch { return null }
}

function applyResult(info: ReleaseInfo) {
  latest.value = info
  status.value = isNewerVersion(info.version, __APP_VERSION__) ? 'available' : 'up-to-date'
}

async function check(useCache: boolean) {
  if (!enabled.value) { status.value = 'disabled'; return }
  if (running) return
  const cached = useCache ? readCache() : null
  if (cached) { applyResult(cached); return }
  running = true
  status.value = 'checking'
  try {
    const info = await fetchLatestRelease(fetch, AbortSignal.timeout(TIMEOUT_MS))
    if (!info) throw new Error('no usable release')
    const cache: UpdateCheckCache = { ...info, checkedAt: new Date().toISOString() }
    write(CACHE_KEY, JSON.stringify(cache))
    applyResult(info)
  } catch (error) {
    // 断网、被墙、限额、超时 —— 一律静默,关于页里给一个重试就够了
    status.value = 'failed'
    if (import.meta.env.DEV) console.debug('[update-check] failed:', error)
  } finally {
    running = false
  }
}

/** 挂载后延迟、空闲时再发起,别和图库首屏加载抢资源;每次页面加载只跑一次 */
export function startUpdateCheck() {
  if (started) return
  started = true
  if (!enabled.value) { status.value = 'disabled'; return }
  setTimeout(() => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => { void check(true) })
    else void check(true)
  }, START_DELAY_MS)
}

export function useUpdateCheck() {
  function markSeen() {
    if (!latest.value) return
    seenRelease.value = latest.value.tag
    write(SEEN_KEY, latest.value.tag)
  }
  /** 只有失败态给按钮;用户显式点的,无视 6 小时缓存 */
  function retry() { void check(false) }
  function toggleEnabled() { enabled.value = !enabled.value }
  return { status, latest, enabled, hasUnseenUpdate, markSeen, retry, toggleEnabled }
}
