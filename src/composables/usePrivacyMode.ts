import { computed, reactive, ref, watch } from 'vue'

/*
 * 隐私遮挡。防的是「瞄一眼」(同事路过、共享屏幕、投屏),只做视觉遮挡,不加密不加锁。
 *
 * 三档:off 全显示 / flagged 遮 nsfw 标记项 / all 全遮(老板键)。基础档只在 off 与 flagged 之间选,
 * all 是叠在基础档上的临时态 —— 顶栏按钮与快捷键只在 all 和基础档之间来回切,从全遮回来不会途经 off。
 *
 * 这里的 localStorage key 全部**不进** SETTING_KEYS(同 useUpdateCheck):备份清单把 SETTING_KEYS 当闭集校验,
 * 少一个 key 的旧备份会恢复不了;而且遮挡档位本来就是「这台机器」的状态 —— 公司电脑和家里电脑各有各的。
 * 图片/画师上的 nsfw 标记则是数据,随行进备份。
 */
export type PrivacyBase = 'off' | 'flagged'
export type PrivacyLevel = PrivacyBase | 'all'

export interface KeyBinding {
  /** KeyboardEvent.code —— 按物理键位匹配,输入法开着、键盘布局不同都不影响 */
  code: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

const BASE_KEY = 'aigc-gallery:privacy-base'
const BOSS_KEY = 'aigc-gallery:privacy-boss'
const SHORTCUT_ENABLED_KEY = 'aigc-gallery:boss-key-enabled'
const SHORTCUT_KEY = 'aigc-gallery:boss-key'
const UPLOAD_NSFW_KEY = 'aigc-gallery:upload-nsfw'

export const DEFAULT_BINDING: KeyBinding = { code: 'Backquote', ctrl: false, alt: false, shift: false, meta: false }

function read(key: string) {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* 写不进只影响下次启动的默认值 */ }
}

function parseBinding(raw: string | null): KeyBinding {
  if (!raw) return { ...DEFAULT_BINDING }
  try {
    const value = JSON.parse(raw)
    if (value && typeof value.code === 'string' && value.code) {
      return { code: value.code, ctrl: !!value.ctrl, alt: !!value.alt, shift: !!value.shift, meta: !!value.meta }
    }
  } catch { /* 坏值回退默认 */ }
  return { ...DEFAULT_BINDING }
}

// 首次使用默认 flagged:还没标过任何东西时它什么都不遮,零打扰;一旦开始标记就立刻生效
const baseLevel = ref<PrivacyBase>(read(BASE_KEY) === 'off' ? 'off' : 'flagged')
// 老板键状态跨刷新保留 —— 慌乱中按 F5 不能把图放出来
const bossActive = ref(read(BOSS_KEY) === 'true')
const shortcutEnabled = ref(read(SHORTCUT_ENABLED_KEY) === 'true')
const binding = ref<KeyBinding>(parseBinding(read(SHORTCUT_KEY)))
const uploadAsNsfw = ref(read(UPLOAD_NSFW_KEY) === 'true')
/** 录键期间全局快捷键让路,否则按下当前键位会先把老板键切了 */
const recording = ref(false)

/*
 * 设置里的三档选择器直接读写 level,与盾牌共用同一份状态:选「全部」等同按盾牌(只置 bossActive),
 * 基础档原样保留,所以之后点盾牌仍回到原来那一档;选另外两档则写入基础档并退出全遮。
 * 存储沿用 base + boss 两个 key,升级前存下的状态原样有效。
 */
const level = computed<PrivacyLevel>({
  get: () => bossActive.value ? 'all' : baseLevel.value,
  set: value => {
    if (value === 'all') {
      bossActive.value = true
    } else {
      baseLevel.value = value
      bossActive.value = false
    }
  },
})

/*
 * 揭开状态只活在内存里,key 形如 aigc:<id> / artist:<id> / editor:<id>。
 * 档位一变就整体清空:按老板键之后,之前揭开的每一张都必须重新遮上(包括开着的大图浏览器)。
 */
const revealed = reactive(new Set<string>())
watch(level, () => revealed.clear())

watch(baseLevel, value => write(BASE_KEY, value))
watch(bossActive, value => write(BOSS_KEY, String(value)))
watch(shortcutEnabled, value => write(SHORTCUT_ENABLED_KEY, String(value)))
watch(binding, value => write(SHORTCUT_KEY, JSON.stringify(value)))
watch(uploadAsNsfw, value => write(UPLOAD_NSFW_KEY, String(value)))

/** 当前档位下这一项该不该遮(不看揭开状态) */
function shouldMask(nsfw: boolean | undefined) {
  return level.value === 'all' || (level.value === 'flagged' && nsfw === true)
}

function isMasked(key: string, nsfw: boolean | undefined) {
  return shouldMask(nsfw) && !revealed.has(key)
}

function reveal(key: string) {
  revealed.add(key)
}

function forget(key: string) {
  revealed.delete(key)
}

function toggleBoss() {
  bossActive.value = !bossActive.value
}

// ===== 快捷键 =====

const MODIFIER_CODES = new Set([
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
  'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight', 'CapsLock', 'Fn', 'FnLock',
])
// Esc 关弹窗、Tab/Enter/空格 键盘导航与激活、退格编辑 —— 不论带不带修饰键都不让绑(Ctrl/Shift+空格还是输入法切换)
const RESERVED_CODES = new Set(['Escape', 'Tab', 'Enter', 'NumpadEnter', 'Space', 'Backspace'])
// 浏览器不让网页拦截的组合:绑上了也收不到
const BROWSER_CODES = new Set(['KeyW', 'KeyT', 'KeyN'])

export type BindingError = 'privacy.keyErrorModifier' | 'privacy.keyErrorReserved' | 'privacy.keyErrorBrowser'

/** 录键时用:组合键是先按修饰键再按主键,单独的修饰键 keydown 要静默等下去,不能当成一次失败 */
export function isModifierCode(code: string) {
  return MODIFIER_CODES.has(code)
}

function validateBinding(e: KeyboardEvent): { binding: KeyBinding } | { error: BindingError } {
  if (!e.code || MODIFIER_CODES.has(e.code)) return { error: 'privacy.keyErrorModifier' }
  if (RESERVED_CODES.has(e.code)) return { error: 'privacy.keyErrorReserved' }
  if ((e.ctrlKey || e.metaKey) && BROWSER_CODES.has(e.code)) return { error: 'privacy.keyErrorBrowser' }
  return { binding: { code: e.code, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey } }
}

const PUNCTUATION: Record<string, string> = {
  Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
}

function keyLabel(code: string) {
  if (PUNCTUATION[code]) return PUNCTUATION[code]
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit\d$/.test(code)) return code.slice(5)
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`
  return code
}

function formatBinding(b: KeyBinding) {
  const parts: string[] = []
  if (b.ctrl) parts.push('Ctrl')
  if (b.alt) parts.push('Alt')
  if (b.shift) parts.push('Shift')
  if (b.meta) parts.push('Meta')
  parts.push(keyLabel(b.code))
  return parts.join(' + ')
}

const bindingLabel = computed(() => formatBinding(binding.value))

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function onKeydown(e: KeyboardEvent) {
  if (!shortcutEnabled.value || recording.value) return
  if (e.isComposing || e.repeat || isEditableTarget(e.target)) return
  const b = binding.value
  if (e.code !== b.code || e.ctrlKey !== b.ctrl || e.altKey !== b.alt || e.shiftKey !== b.shift || e.metaKey !== b.meta) return
  e.preventDefault()
  toggleBoss()
}

let installed = false
/** App.vue 调一次。监听常驻,开关只在回调里判断,改设置不必重装 */
export function installPrivacyShortcut() {
  if (installed) return
  installed = true
  window.addEventListener('keydown', onKeydown)
}

export function usePrivacyMode() {
  return {
    baseLevel,
    bossActive,
    level,
    shortcutEnabled,
    binding,
    bindingLabel,
    uploadAsNsfw,
    recording,
    shouldMask,
    isMasked,
    reveal,
    forget,
    toggleBoss,
    validateBinding,
    formatBinding,
  }
}
