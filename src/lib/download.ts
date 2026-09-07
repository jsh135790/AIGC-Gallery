/*
 * 触发浏览器下载。仓库里曾有三份,正确性各不相同 —— 两份的 <a> 从不进 DOM
 * (Firefox 不响应游离节点的 click()),其中一份还紧跟着同步 revoke(部分浏览器
 * 来不及读就把 URL 撤了,下载静默落空)。两个坑都是"在我的机器上能用"型的。
 */

/** 点一个 <a>。href 的所有权归调用方,这里只负责点得成 */
function clickAnchor(href: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.style.display = 'none'
  // Firefox 要求 <a> 先进 DOM 才响应 click()
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

/** 下载一个 Blob。内部铸造的 URL 由这里负责回收 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  clickAnchor(url, filename)
  // 紧跟着 revoke 会让下载在部分浏览器上落空,挪到下一个 tick
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * 下载一个已有的 URL(blob: / data: / http:)。
 *
 * **不 revoke** —— URL 是调用方铸造的,它的生命周期也归调用方
 * (灯箱拿到的 src 由父组件持有,撤掉会让还开着的预览立刻裂图)。
 */
export function downloadUrl(url: string, filename: string) {
  if (!url) return
  clickAnchor(url, filename)
}
