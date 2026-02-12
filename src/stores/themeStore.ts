import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'dark')

  const isDark = ref(false)

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
    let dark: boolean
    if (theme.value === 'system') {
      dark = resolveSystemTheme()
    } else {
      dark = theme.value === 'dark'
    }
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
  }

  function setTheme(newTheme: Theme) {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme()
  }

  function toggleTheme() {
    if (theme.value === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
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

  return { theme, isDark, setTheme, toggleTheme, applyTheme }
})
