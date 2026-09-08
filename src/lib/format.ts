/*
 * 展示层的纯格式化函数。
 *
 * 这里的每一个都曾经有 2 份互不一致的副本:`formatBytes` 一处有字节分支、一处没有,
 * KB 的小数位还不同,同一张图在编辑器左栏和查看器条目表里显示成两个大小。
 * 格式化规则属于展示口径,必须只有一份。
 */

/**
 * 字节数 → 人读的大小。三段:< 1KB 报字节、< 1MB 报 KB(一位小数)、其余报 MB(两位)。
 *
 * KB 保一位小数是因为 PNG 的 tEXt chunk 常在 1–2 KB 量级,取整会把 1.4 KB 和 1.6 KB
 * 显示成同一个数,而查看器存在的意义就是看清字节差。
 *
 * 0 报 `0 B` 而不是 `—`:这是个字节格式化器,不负责表达"没有值"。
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/**
 * JSON 美化。SD 的 `parameters` 是纯文本(不是 JSON),原样返回。
 *
 * 判据故意只看首字符而不是 try/catch 一把梭:SD 的参数串偶尔以数字开头,
 * `JSON.parse('20')` 会成功并把整串换成 `20`。
 */
export function prettify(text: string): string {
  if (!text) return ''
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return text
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2)
  } catch {
    return text
  }
}

/** 坐标使用原数值的文本形式，避免取整或固定小数位掩盖实际位置。 */
export function formatCoordinates(centers: ReadonlyArray<{ x: number; y: number }>): string {
  return centers.map(pt => `(${pt.x}, ${pt.y})`).join(' ')
}
