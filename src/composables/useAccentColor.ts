import { ref, watch } from 'vue'
import { hexToHslString, contrastForeground } from '@/lib/colors'

/**
 * 自定义主题强调色。默认(null)时沿用 index.css 中各主题的琥珀 --primary;
 * 用户选色后,把 --primary / --ring / --primary-foreground 写到 :root 内联样式覆盖。
 * 内联样式作用于 documentElement,同时覆盖浅色与深色主题。
 */
const STORAGE_KEY = 'accent-color'

/** 预设强调色(含默认琥珀)。null = 恢复主题默认。 */
export const ACCENT_PRESETS: { name: string; hex: string | null }[] = [
  { name: 'amber', hex: null },
  { name: 'orange', hex: '#f97316' },
  { name: 'rose', hex: '#f43f5e' },
  { name: 'pink', hex: '#ec4899' },
  { name: 'violet', hex: '#8b5cf6' },
  { name: 'indigo', hex: '#6366f1' },
  { name: 'blue', hex: '#3b82f6' },
  { name: 'cyan', hex: '#06b6d4' },
  { name: 'emerald', hex: '#22c55e' },
]

function getInitial(): string | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored && stored.trim() ? stored : null
}

const accentColor = ref<string | null>(getInitial())

function apply(hex: string | null) {
  const root = document.documentElement
  if (!hex) {
    root.style.removeProperty('--primary')
    root.style.removeProperty('--ring')
    root.style.removeProperty('--primary-foreground')
    return
  }
  const hsl = hexToHslString(hex)
  root.style.setProperty('--primary', hsl)
  root.style.setProperty('--ring', hsl)
  root.style.setProperty('--primary-foreground', contrastForeground(hex))
}

// 启动即应用(在模块加载时执行一次)
apply(accentColor.value)

watch(accentColor, (val) => {
  if (val) localStorage.setItem(STORAGE_KEY, val)
  else localStorage.removeItem(STORAGE_KEY)
  apply(val)
})

export function useAccentColor() {
  return {
    accentColor,
    setAccent(hex: string | null) {
      accentColor.value = hex
    },
  }
}
