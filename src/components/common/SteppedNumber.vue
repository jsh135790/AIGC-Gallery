<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useReducedMotion } from '@/composables/useReducedMotion'

const props = withDefaults(
  defineProps<{
    value: number
    /** 新旧值之间落几档 */
    steps?: number
    duration?: number
  }>(),
  { steps: 6, duration: 420 },
)

const reducedMotion = useReducedMotion()
const shown = ref(props.value)
let raf: number | null = null

function stop() {
  if (raf !== null) {
    cancelAnimationFrame(raf)
    raf = null
  }
}

/**
 * 数字从不平滑补间:它在新旧值之间落 steps 档,像机械计数器。
 * 这是「暗色精密仪器」最小的一处签名,移植自个人主页的 demo/SteppedNumber.vue。
 */
watch(
  () => props.value,
  (to, from) => {
    stop()
    if (reducedMotion.value) {
      shown.value = to
      return
    }
    const start = from ?? to
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / props.duration)
      const quantized = Math.round(t * props.steps) / props.steps
      shown.value = Math.round(start + (to - start) * quantized)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        shown.value = to
        raf = null
      }
    }
    raf = requestAnimationFrame(tick)
  },
)

onUnmounted(stop)
</script>

<template>
  <span class="readout">{{ shown }}</span>
</template>
