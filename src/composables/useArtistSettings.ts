import { ref, computed, watch } from 'vue'

const KEYS = {
  autoFillName: 'artist-auto-fill-name',
  autoFillPrefix: 'artist-auto-fill-prefix',
  customPrefix: 'artist-custom-prefix',
} as const

function getBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key)
  if (v !== null) return v === 'true'
  return fallback
}

const DEFAULT_PREFIX = 'artist:'

const autoFillName = ref(getBool(KEYS.autoFillName, false))
const autoFillPrefix = ref(getBool(KEYS.autoFillPrefix, false))
const customPrefix = ref(localStorage.getItem(KEYS.customPrefix) ?? DEFAULT_PREFIX)

watch(autoFillName, (val) => {
  localStorage.setItem(KEYS.autoFillName, String(val))
  if (!val) autoFillPrefix.value = false
})

watch(autoFillPrefix, (val) => {
  localStorage.setItem(KEYS.autoFillPrefix, String(val))
})

watch(customPrefix, (val) => {
  localStorage.setItem(KEYS.customPrefix, val)
})

export function useArtistSettings() {
  const canTogglePrefix = computed(() => autoFillName.value)
  const canEditPrefix = computed(() => autoFillPrefix.value)

  return {
    autoFillName,
    autoFillPrefix,
    customPrefix,
    canTogglePrefix,
    canEditPrefix,
    toggleAutoFillName() {
      autoFillName.value = !autoFillName.value
    },
    toggleAutoFillPrefix() {
      if (!autoFillName.value) return
      autoFillPrefix.value = !autoFillPrefix.value
    },
  }
}
