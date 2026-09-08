import { ref, watch, onUnmounted, type Ref } from 'vue'
import { useReducedMotion } from './useReducedMotion'

interface TypewriterOptions {
  /** 每秒字符数 */
  cps?: number
  /** 首字符前的延迟(ms),配合 index * n 让多行错开 */
  delay?: number
  /** 文本变化时自动重播;关掉则由调用方驱动 start() */
  auto?: boolean
  /** 最后一个字符落位后触发一次 */
  onDone?: () => void
}

/**
 * 逐字显现的读出效果(移植自个人主页 PilotGarage 的同名 composable)。
 *
 * 用 rAF 而不是 setInterval:与页面其余动效同一时钟,切到后台标签会自动暂停。
 * reduced-motion 下直接渲染完整文本 —— 不是加速,是不播。
 */
export function useTypewriter(text: Ref<string>, opts: TypewriterOptions = {}) {
  const { cps = 90, delay = 0, auto = true, onDone } = opts
  const reducedMotion = useReducedMotion()

  const display = ref('')
  const isDone = ref(false)

  let raf: number | null = null
  let startedAt = 0

  function stop() {
    if (raf !== null) {
      cancelAnimationFrame(raf)
      raf = null
    }
  }

  function finish() {
    stop()
    display.value = text.value
    if (!isDone.value) {
      isDone.value = true
      onDone?.()
    }
  }

  function start() {
    stop()
    const full = text.value ?? ''

    if (reducedMotion.value || full.length === 0) {
      display.value = full
      isDone.value = true
      onDone?.()
      return
    }

    display.value = ''
    isDone.value = false
    startedAt = performance.now() + delay

    const step = (now: number) => {
      const elapsed = now - startedAt
      if (elapsed < 0) {
        raf = requestAnimationFrame(step)
        return
      }
      const shown = Math.floor((elapsed / 1000) * cps)
      if (shown >= full.length) {
        finish()
        return
      }
      display.value = full.slice(0, shown)
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
  }

  if (auto) watch(text, start, { immediate: true })
  onUnmounted(stop)

  return { display, isDone, finish }
}
