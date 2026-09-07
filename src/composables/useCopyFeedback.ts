import { onUnmounted, ref } from 'vue'

/*
 * 「复制成功」的行内反馈:图标换成对勾,1.5s 后换回来。
 *
 * 四处各写了一份,只有一份清了上一个定时器 —— 其余三处连点两个不同按钮时,
 * 先启动的那个定时器会把后一个的对勾提前抹掉。
 *
 * 不弹 toast 是刻意的:复制按钮就在指针下面,行内换图标的反馈更收敛,
 * 而且弹窗开着时 toast 会被遮住。
 */
export function useCopyFeedback(duration = 1500) {
  /** 当前显示对勾的那个 key。单键场景传不传都行,默认 `'default'` */
  const copiedKey = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  const copy = async (text: string, key = 'default') => {
    try {
      await navigator.clipboard.writeText(text)
      copiedKey.value = key
      // 上一个定时器不清,连点两个按钮时先启动的那个会提前抹掉后一个的对勾
      if (timer !== undefined) clearTimeout(timer)
      timer = setTimeout(() => { copiedKey.value = null }, duration)
    } catch {
      /* 剪贴板被拒(非安全上下文 / 用户拒权)时静默:文本本身就在屏幕上,可手抄 */
    }
  }

  onUnmounted(() => {
    if (timer !== undefined) clearTimeout(timer)
  })

  return { copiedKey, copy }
}
