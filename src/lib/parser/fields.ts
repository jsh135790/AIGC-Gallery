/*
 * 跨读侧 / 写侧 / UI 共用的字段口径。
 *
 * `DERIVED_FIELDS` 之前有 4 份副本(png-writer / useMetadataEditor / aigcStore /
 * MetadataEditor),名字还各起了三个。它决定"哪些键不属于图片元数据",一旦四份分叉,
 * 就会出现某个键在脏态里算改动、在写侧被过滤掉的错位 —— 用户改了却导不出去。
 */

import type { NAICharacterPrompt } from '@/types'

/**
 * 只给 UI 看的派生字段:不在文件里,不写回文件,不参与脏态比较,不算"参数缺失"。
 *
 * 两者都来自 ComfyUI 工作流的统计,是解析副产物而非元数据本身。
 */
export const DERIVED_FIELDS = new Set(['nodeCount', 'nodeTypes'])

/**
 * NAI v4 的「自动位置」:只有一个中心点且落在原点。
 *
 * NAI 对不指定坐标的角色写 `[{x:0,y:0}]` 而不是空数组,所以坐标 (0,0) 与"没给坐标"
 * 在文件里长得一样 —— 显示成 `(0.00, 0.00)` 会让人以为角色被钉在左上角。
 */
export function isAutoPosition(centers: NAICharacterPrompt['centers']): boolean {
  // 小数坐标也是明确的位置，不能四舍五入后当作自动位置。
  return centers.length === 1
    && centers[0].x === 0
    && centers[0].y === 0
}
