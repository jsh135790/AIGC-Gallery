/**
 * 本 app 写回时追加的编辑痕迹 chunk 的 keyword。
 *
 * 单独成模块是为了让读侧与写侧共用同一个常量而不互相 import:
 * 读侧必须认得它(不能把它当成图片元数据、也不能让它把 SD 识别挤进拼接兜底),
 * 写侧负责产出它。两边各抄一份的话,哪天改名就会静默退回旧 bug。
 *
 * PNG 规范:keyword 为 1–79 字符 Latin-1、首尾无空格。
 */
export const TRACE_KEYWORD = 'aigc-gallery'
