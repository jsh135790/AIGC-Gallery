import { ref, watch } from 'vue'

const KEYS = {
  autoParseTags: 'aigc-auto-parse-tags',
} as const

/*
 * 默认关。自然语言提示词被逗号切出来的整句"标签"会进 db.tags 并算进侧栏计数,
 * 那是不可逆的污染;需要 tag 的场合由用户显式打开。
 * 判定写成 `=== 'true'`,于是"从没设置过"落在关闭。
 */
const autoParseTags = ref(localStorage.getItem(KEYS.autoParseTags) === 'true')

watch(autoParseTags, (val) => {
  localStorage.setItem(KEYS.autoParseTags, String(val))
})

export function useAigcSettings() {
  return {
    autoParseTags,
    toggleAutoParseTags() {
      autoParseTags.value = !autoParseTags.value
    },
  }
}
