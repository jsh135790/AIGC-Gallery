import { ref } from 'vue'
import { parseBlobMetadata } from '@/lib/parser'
import { prettify } from '@/lib/format'
import type { ImageSource, ParsedMetadata, RawMetadataEntry } from '@/types'

/*
 * 元数据查看器的会话态。
 *
 * 与 useMetadataEditor 同构:模块级单例,切工具 / 跳路由都不清空,只在显式换图时清。
 * 但这里是**只读**的 —— 没有工作态与原始态之分,没有脏态,没有 beforeunload 拦截。
 *
 * 关键取舍:每次都从 blob 现场重新解析,不吃库里存的字段。
 * 库里的行是"当时那个解析器"的产物,而这个工具存在的意义正是看清当前解析器读到了什么。
 */

export interface InspectRequest {
  blob: Blob
  filename?: string
  /** 图库记录 id。有值表示从图库跳来,用于回跳与"只补不覆盖"的回补 */
  imageId?: number
}

export interface InspectorSession {
  filename: string
  blob: Blob
  imageId?: number
  metadata: ParsedMetadata
  /** 解析耗时(ms),诊断层显示 */
  parseMs: number
}

const session = ref<InspectorSession | null>(null)
const loading = ref(false)

/** 解析并计时。临时 object URL 的生死由 parseBlobMetadata 自己管 */
async function parseFromBlob(blob: Blob): Promise<{ metadata: ParsedMetadata; parseMs: number }> {
  const started = performance.now()
  const metadata = await parseBlobMetadata(blob)
  return { metadata, parseMs: performance.now() - started }
}

export function useMetadataInspector() {
  const inspect = async (request: InspectRequest): Promise<InspectorSession> => {
    loading.value = true
    try {
      const { metadata, parseMs } = await parseFromBlob(request.blob)
      const next: InspectorSession = {
        filename: request.filename || 'image.png',
        blob: request.blob,
        imageId: request.imageId,
        metadata,
        parseMs,
      }
      session.value = next
      return next
    } finally {
      loading.value = false
    }
  }

  const clearSession = () => {
    session.value = null
  }

  return { session, loading, inspect, clearSession }
}

// ===== 展示用派生 =====

/** 单条原始条目在表格里的形态 */
export interface EntryRow extends RawMetadataEntry {
  /** JSON 就美化,其他原样。折叠展开后显示这个 */
  pretty: string
  /** 解码后的字符数。与 byteLength 一起看就能发现压缩块 */
  charLength: number
}

export function toEntryRows(entries: RawMetadataEntry[]): EntryRow[] {
  return entries.map(entry => ({
    ...entry,
    pretty: prettify(entry.text),
    charLength: entry.text.length,
  }))
}

/** 状态 → i18n 键 + 语义色。ok 不上色,其余都要显眼 */
export const ENTRY_STATUS_META: Record<RawMetadataEntry['status'], { label: string; tone: string }> = {
  'ok': { label: 'inspector.status.ok', tone: 'text-dim' },
  'encoding-fallback': { label: 'inspector.status.encodingFallback', tone: 'text-warning' },
  'decompress-failed': { label: 'inspector.status.decompressFailed', tone: 'text-destructive' },
  'malformed': { label: 'inspector.status.malformed', tone: 'text-destructive' },
}

/** 识别分支 → 人话。命中未知分支时直接显示原串,不隐藏信息 */
export const MATCHED_BY_LABELS: Record<string, string> = {
  'sd:parameters-chunk': 'inspector.matched.sdParameters',
  'sd:single-chunk-heuristic': 'inspector.matched.sdHeuristic',
  'sd:concatenated-fallback': 'inspector.matched.sdConcatenated',
  'sd:exif-usercomment': 'inspector.matched.sdExif',
  'nai:description-comment': 'inspector.matched.naiChunks',
  'nai:stealth-alpha-lsb': 'inspector.matched.naiStealth',
  'comfyui:workflow': 'inspector.matched.comfyWorkflow',
  'comfyui:api': 'inspector.matched.comfyApi',
  'exif-usercomment-unparsed': 'inspector.matched.exifUnparsed',
  'exif-no-usercomment': 'inspector.matched.exifNone',
  'no-known-format': 'inspector.matched.none',
  'unrecognized-container': 'inspector.matched.unknownContainer',
}

/**
 * 来源 → 全称。编辑器左栏那份 `sourceLabel` 用短写(SD WebUI),两处**刻意不合并**:
 * 这里是宽表头,全称更准确;那里是 224px 窄栏读出,全称会换行。
 */
export const SOURCE_LABELS: Record<ImageSource, string> = {
  sd: 'Stable Diffusion',
  nai: 'NovelAI',
  comfyui: 'ComfyUI',
  unknown: 'Unknown',
}
