import { ref, watch } from 'vue'

const STORAGE_KEY = 'blur-effect-enabled'

function getInitial(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return stored === 'true'
  return true
}

const blurEnabled = ref(getInitial())

watch(blurEnabled, (val) => {
  localStorage.setItem(STORAGE_KEY, String(val))
})

export function useBlurEffect() {
  return {
    blurEnabled,
    toggleBlur() {
      blurEnabled.value = !blurEnabled.value
    },
  }
}
