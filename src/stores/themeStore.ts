import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'dark')

  function resolveSystemTheme(): boolean {
    // matchMedia can return false for "not dark" even when no preference.
    // We explicitly check the query result.
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      return false
    }
  }

  function applyTheme() {
    const dark = theme.value === 'system' ? resolveSystemTheme() : theme.value === 'dark'
    document.documentElement.classList.toggle('dark', dark)
  }

  function setTheme(newTheme: Theme) {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme()
  }

  // Listen for system theme changes
  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (theme.value === 'system') {
        applyTheme()
      }
    })
  } catch {
    // matchMedia not supported
  }

  // Initialize — must run synchronously on store creation
  applyTheme()

  watch(theme, () => {
    applyTheme()
  })

  return { theme, setTheme }
})
