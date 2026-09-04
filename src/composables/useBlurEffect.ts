import { ref, watch } from 'vue'

const STORAGE_KEY = 'blur-effect-enabled'

function getInitial(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) return stored === 'true'
  return true
}

const blurEnabled = ref(getInitial())

/*
 * 关掉模糊时给 <html> 挂 .no-blur。index.css 里 .no-blur 把 --glass-alpha 翻成 1
 * 并关掉 backdrop-filter,于是所有玻璃面的实底回退自动生效 —— 组件不必再各写一遍
 * `blurEnabled ? 'bg-x/80 backdrop-blur-xl' : 'bg-x'`(那正是 Toast 漏掉回退的原因)。
 */
function syncRootClass(val: boolean) {
  document.documentElement.classList.toggle('no-blur', !val)
}

syncRootClass(blurEnabled.value)

watch(blurEnabled, (val) => {
  localStorage.setItem(STORAGE_KEY, String(val))
  syncRootClass(val)
})

export function useBlurEffect() {
  return {
    blurEnabled,
    toggleBlur() {
      blurEnabled.value = !blurEnabled.value
    },
  }
}
