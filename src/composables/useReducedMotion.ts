import { useMediaQuery } from '@vueuse/core'

/**
 * 全站唯一的 reduced-motion 判定源。
 *
 * index.css 的 @media (prefers-reduced-motion: reduce) 只管得住 CSS 动画;
 * 用 JS 逐帧驱动的效果(打字机、步进计数)必须自己分支 —— 而且是「直接出终态」
 * 而不是「加速播放」,后者对前庭敏感的用户没有意义。
 */
export function useReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
