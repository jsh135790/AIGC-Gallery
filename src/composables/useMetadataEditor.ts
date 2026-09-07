import { computed, ref, watch } from 'vue'
import { DERIVED_FIELDS } from '@/lib/parser/fields'
import type { ImageParameters, ImageSource, ParsedMetadata } from '@/types'

/*
 * 编辑态住在这个模块级单例里,组件只是它的视图。
 *
 * 之前工作态在 MetadataEditor.vue 的 ref 里,`onUnmounted` 又调 clearEditingImage() ——
 * 在工具箱点一下别的工具,编辑内容就无声消失。现在切工具、跳去 /aigc 再回来,内容都还在;
 * 清空只发生在显式「换图」/「关闭」。
 */

/** 调用方(图库详情面板 / 工具箱上传)交进来的入参 */
export interface EditingImage {
  /** 图库记录 id。有值才显示「回写图库」 */
  id?: string
  filename?: string
  blob: Blob
  metadata: ParsedMetadata
  source: ImageSource
  originalMetadata: ParsedMetadata
}

export interface EditorSession {
  id?: string
  filename: string
  blob: Blob
  source: ImageSource
  /** 工作态,双向绑定到界面 */
  metadata: ParsedMetadata
  /** 载入时的原始元数据,脏态对比与回退的基准 */
  originalMetadata: ParsedMetadata
  /** 元数据藏在 alpha 通道(隐写),导出不会同步那一份 */
  stealth: boolean
}

/** 一处改动。`delta` 是字符数差,0 表示改了但长度没变 */
export type ChangedField =
  | { kind: 'prompt'; delta: number }
  | { kind: 'negativePrompt'; delta: number }
  | { kind: 'param'; key: string; delta: number }
  | { kind: 'char'; idx: number; sub: 'prompt' | 'negative'; delta: number }

/** 右栏参数行的视图模型 */
export interface ParamRow {
  /** `ImageParameters` 里的字段名 */
  key: string
  /** 显示名。已知字段用规范拼写,未识别字段用原始键 */
  label: string
  value: string
  /** known = 有专门控件的字段;extra = 解析器兜住的未识别键 */
  kind: 'known' | 'extra'
  /** 值来自独立 tEXt chunk(原样透传),改它不会写进文件 */
  locked: boolean
  /** 锁定原因的 i18n 键。不给就用通用文案 */
  lockReason?: string
  /** 可编辑但有讲究(如必须填合法 JSON)。走 title,不禁用输入框 */
  hint?: string
}

const session = ref<EditorSession | null>(null)

function cloneParameterValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneParameterValue)
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, cloneParameterValue(nestedValue)])
    )
  }

  return value
}

export function cloneParsedMetadata(meta: ParsedMetadata): ParsedMetadata {
  const parameters = Object.fromEntries(
    Object.entries(meta.parameters).map(([key, value]) => [key, cloneParameterValue(value)])
  ) as ImageParameters

  return {
    source: meta.source,
    prompt: meta.prompt,
    negativePrompt: meta.negativePrompt,
    parameters,
    rawText: meta.rawText,
    ...(meta.stealth ? { stealth: true } : {}),
    v4Data: meta.v4Data
      ? {
          basePrompt: meta.v4Data.basePrompt,
          baseNegative: meta.v4Data.baseNegative,
          characters: meta.v4Data.characters.map(character => ({
            idx: character.idx,
            prompt: character.prompt,
            negative: character.negative,
            centers: character.centers.map(center => ({
              x: center.x,
              y: center.y,
            })),
          })),
          useOrder: meta.v4Data.useOrder,
          useCoords: meta.v4Data.useCoords,
          legacyUc: meta.v4Data.legacyUc,
        }
      : undefined,
  }
}

/*
 * 显式比较器,不用 JSON.stringify 对比 —— parameters 的键序不保证,
 * 而且 undefined 在 stringify 里会整键消失,两边都会给出假阴性/假阳性。
 */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? a : []
    const right = Array.isArray(b) ? b : []
    return left.length === right.length && left.every((item, i) => sameValue(item, right[i]))
  }
  /*
   * 对象要逐键比。`String({})` 一律是 `"[object Object]"`,两个内容不同的对象会被
   * 判成相等 —— 用户改了嵌套字段却不算脏态,导出时那处改动无声丢失。
   */
  if (isPlainRecord(a) && isPlainRecord(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].every(key => sameValue(a[key], b[key]))
  }
  return String(a ?? '') === String(b ?? '')
}

function textDelta(next: string, prev: string): number {
  return next.length - prev.length
}

const changedFields = computed<ChangedField[]>(() => {
  const current = session.value
  if (!current) return []

  const work = current.metadata
  const orig = current.originalMetadata
  const out: ChangedField[] = []

  if (work.prompt !== orig.prompt) {
    out.push({ kind: 'prompt', delta: textDelta(work.prompt, orig.prompt) })
  }
  if (work.negativePrompt !== orig.negativePrompt) {
    out.push({ kind: 'negativePrompt', delta: textDelta(work.negativePrompt, orig.negativePrompt) })
  }

  const keys = new Set([...Object.keys(work.parameters ?? {}), ...Object.keys(orig.parameters ?? {})])
  for (const key of keys) {
    if (DERIVED_FIELDS.has(key)) continue
    const a = work.parameters?.[key]
    const b = orig.parameters?.[key]
    // 一边缺键、另一边是空值,不算改动
    if (sameValue(a, b)) continue
    out.push({ kind: 'param', key, delta: 0 })
  }

  if (work.v4Data && orig.v4Data) {
    for (const character of work.v4Data.characters) {
      const before = orig.v4Data.characters.find(item => item.idx === character.idx)
      if (!before) continue
      if (character.prompt !== before.prompt) {
        out.push({ kind: 'char', idx: character.idx, sub: 'prompt', delta: textDelta(character.prompt, before.prompt) })
      }
      if (character.negative !== before.negative) {
        out.push({ kind: 'char', idx: character.idx, sub: 'negative', delta: textDelta(character.negative, before.negative) })
      }
    }
  }

  return out
})

const isDirty = computed(() => changedFields.value.length > 0)

/*
 * 脏态时拦刷新。blob 不落盘,刷新一定丢 —— 这是唯一真会丢内容的路径。
 * 不加路由守卫:状态已经跨路由存活,再拦一层只是烦人。
 */
function warnBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  event.returnValue = ''
}

watch(isDirty, dirty => {
  if (typeof window === 'undefined') return
  if (dirty) window.addEventListener('beforeunload', warnBeforeUnload)
  else window.removeEventListener('beforeunload', warnBeforeUnload)
})

export function useMetadataEditor() {
  const setEditingImage = (image: EditingImage) => {
    session.value = {
      id: image.id,
      filename: image.filename || 'image.png',
      blob: image.blob,
      source: image.source,
      metadata: cloneParsedMetadata(image.metadata),
      originalMetadata: cloneParsedMetadata(image.originalMetadata),
      stealth: Boolean(image.metadata.stealth),
    }
  }

  /** 换图 / 关闭时才调 —— 组件卸载不清 */
  const clearSession = () => {
    session.value = null
  }

  /** 全部字段回到载入时的原始元数据 */
  const resetAll = () => {
    const current = session.value
    if (!current) return
    current.metadata = cloneParsedMetadata(current.originalMetadata)
  }

  /** 回退单个字段 */
  const revertField = (field: ChangedField) => {
    const current = session.value
    if (!current) return
    const work = current.metadata
    const orig = current.originalMetadata

    if (field.kind === 'prompt') {
      work.prompt = orig.prompt
      return
    }
    if (field.kind === 'negativePrompt') {
      work.negativePrompt = orig.negativePrompt
      return
    }
    if (field.kind === 'param') {
      const before = orig.parameters?.[field.key]
      if (before === undefined) delete work.parameters[field.key]
      else work.parameters[field.key] = cloneParameterValue(before)
      return
    }

    const target = work.v4Data?.characters.find(item => item.idx === field.idx)
    const before = orig.v4Data?.characters.find(item => item.idx === field.idx)
    if (target && before) target[field.sub] = before[field.sub]
  }

  /** 回写图库 / 导出成功后,把当前工作态认作新的原始态 */
  const commitAsOriginal = () => {
    const current = session.value
    if (!current) return
    current.originalMetadata = cloneParsedMetadata(current.metadata)
  }

  return {
    session,
    changedFields,
    isDirty,
    setEditingImage,
    clearSession,
    resetAll,
    revertField,
    commitAsOriginal,
  }
}
