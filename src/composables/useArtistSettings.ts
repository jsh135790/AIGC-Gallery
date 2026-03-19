import { ref, computed, watch } from 'vue'

const KEYS = {
  autoFillName: 'artist-auto-fill-name',
  autoFillPrefix: 'artist-auto-fill-prefix',
} as const

function getBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key)
  if (v !== null) return v === 'true'
  return fallback
}

const autoFillName = ref(getBool(KEYS.autoFillName, false))
const autoFillPrefix = ref(getBool(KEYS.autoFillPrefix, false))

watch(autoFillName, (val) => {
  localStorage.setItem(KEYS.autoFillName, String(val))
  if (!val) autoFillPrefix.value = false
})

watch(autoFillPrefix, (val) => {
  localStorage.setItem(KEYS.autoFillPrefix, String(val))
})

export function useArtistSettings() {
  const canTogglePrefix = computed(() => autoFillName.value)

  return {
    autoFillName,
    autoFillPrefix,
    canTogglePrefix,
    toggleAutoFillName() {
      autoFillName.value = !autoFillName.value
    },
    toggleAutoFillPrefix() {
      if (!autoFillName.value) return
      autoFillPrefix.value = !autoFillPrefix.value
    },
  }
}
