// 页头与 favicon 共用轮廓，避免两个品牌入口在后续调整时产生差异。
export const BRAND_PATHS = [
  'M6.25 10.75V4.25A1.75 1.75 0 0 1 8 2.5h8a1.75 1.75 0 0 1 1.75 1.75v6.5',
  'm8.75 8.25 2-2 3.75 3.75',
  'M5 10.75h14a2.5 2.5 0 0 1 2.5 2.5v4.5a3.5 3.5 0 0 1-3.5 3.5H6a3.5 3.5 0 0 1-3.5-3.5v-4.5a2.5 2.5 0 0 1 2.5-2.5Z',
] as const

export const BRAND_EYES = [8.5, 15.5] as const
export const BRAND_STROKE_WIDTH = 1.75
export const BRAND_EYE_Y = 15.75
export const BRAND_EYE_RADIUS = 1

export function brandFaviconUrl(color: string): string {
  const safeColor = color.replace(/[&<>"']/g, '')
  const paths = BRAND_PATHS.map(d => `<path d="${d}"/>`).join('')
  const eyes = BRAND_EYES.map(cx => `<circle cx="${cx}" cy="${BRAND_EYE_Y}" r="${BRAND_EYE_RADIUS}"/>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${BRAND_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round" color="${safeColor}">${paths}<g fill="currentColor" stroke="none">${eyes}</g></svg>`
  // data URL 在单文件分发中保持自包含，不能改成指向 public 的外链。
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
