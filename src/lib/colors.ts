/**
 * 全局 10 色色板 — 用于画师分组与图片文件夹的标识色。
 *
 * 注意:这些 hex 值已持久化在用户的 IndexedDB 数据中
 * (aigcFolders.color / artistPages.color),不要重配数值,
 * 只能追加。`db.ts` 迁移代码中的字面量同样冻结不动。
 */
export const SWATCH_COLORS: readonly string[] = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#64748b',
]

export const DEFAULT_SWATCH = '#6366f1'

/**
 * hex → HSL 分量对象。用于把用户挑选的主题色写入 `--primary` 等
 * 以「H S% L%」形式存储的 CSS 变量(见 index.css 的令牌约定)。
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map(x => x + x).join('')
  const r = parseInt(c.slice(0, 2), 16) / 255
  const g = parseInt(c.slice(2, 4), 16) / 255
  const b = parseInt(c.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** hex → 「H S% L%」字符串,可直接赋给 hsl() 消费的 CSS 变量。 */
export function hexToHslString(hex: string): string {
  const { h, s, l } = hexToHsl(hex)
  return `${h} ${s}% ${l}%`
}

/**
 * 依据主题色亮度返回对比前景色(用于 --primary-foreground):
 * 亮色底 → 深色字(沿用暗色主题的 30 15% 8%);暗色底 → 暖白字。
 */
export function contrastForeground(hex: string): string {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map(x => x + x).join('')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '30 15% 8%' : '40 30% 97%'
}
