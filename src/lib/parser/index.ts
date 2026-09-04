import { readPngTextEntries, extractExifMetadata, sniffContainer } from './png-parser'
import { parseSDWebUI } from './sd-parser'
import { parseNovelAI, parseNovelAIStealth, extractStealthPng } from './nai-parser'
import { parseComfyUI } from './comfy-parser'
import { TRACE_KEYWORD } from './trace'
import { getTagsFromPrompt } from './tag-analyzer'
import type {
  ParsedMetadata,
  MetadataContainerKind,
  RawMetadataEntry,
  ParseReport,
} from '@/types'

export { getTagsFromPrompt, analyzeTags, extractTags } from './tag-analyzer'
export type { AnalyzedTag, TagCategory } from './tag-analyzer'
export { readPngTextEntries, readMetadataContainer, sniffContainer } from './png-parser'

/** 生产构建里不该有解析日志。诊断信息的正阵地是 diagnostics + 查看器 */
const debug: (...args: unknown[]) => void = import.meta.env.DEV
  ? (...args) => console.log('[PNG Parser]', ...args)
  : () => {}

/**
 * Main entry point: parse an image file and extract all metadata.
 * 容器判定走魔数,不看 file.type —— 某些拖拽源不带 MIME,也有把 PNG 标成 jpeg 的。
 */
export async function parseImageMetadata(
  file: File,
  imageSrc?: string
): Promise<ParsedMetadata> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const container = sniffContainer(head)

  if (container === 'png') {
    return parsePngMetadata(file, imageSrc)
  }
  if (container === 'jpeg' || container === 'webp' || container === 'avif') {
    return parseExifMetadata(file, container)
  }
  return unknownResult('', { container: 'unknown', matchedBy: 'unrecognized-container', entries: [] })
}

async function parsePngMetadata(file: File, imageSrc?: string): Promise<ParsedMetadata> {
  const entries = await readPngTextEntries(file)
  debug('entries:', entries.map(e => ({ keyword: e.keyword, type: e.entryType, bytes: e.byteLength, status: e.status })))

  const report: ParseReport = { unconsumedKeys: [] }
  const finish = (result: ParsedMetadata, matchedBy: string): ParsedMetadata => ({
    ...result,
    diagnostics: { container: 'png', matchedBy, entries, unconsumedKeys: report.unconsumedKeys },
  })

  // ComfyUI:workflow / prompt chunk 里是工作流 JSON
  const workflowEntry = entries.find(e => e.keyword === 'workflow' || e.keyword === 'prompt')
  if (workflowEntry) {
    // ComfyUI 会写出裸 NaN,JSON.parse 认不了
    const sanitized = workflowEntry.text.replace(/:\s*NaN\b/g, ': null')
    try {
      const json = JSON.parse(sanitized)
      const isFullFormat = Array.isArray(json.nodes)
      const keys = Object.keys(json)
      const isAPIFormat = keys.length > 0 && keys.every(k => /^\d+$/.test(k))
      if (isFullFormat || isAPIFormat) {
        debug('comfyui', isFullFormat ? 'full workflow' : 'api format')
        return finish(parseComfyUI(sanitized, report), `comfyui:${isFullFormat ? 'workflow' : 'api'}`)
      }
      debug('workflow chunk is not a recognized ComfyUI shape')
    } catch (e) {
      debug('failed to parse ComfyUI workflow:', e)
    }
  }

  /*
   * SD-WebUI:只要**存在** parameters chunk 就走这条路。
   * 旧实现要求 chunks.length === 1,而本 app 的写侧每次都追加 aigc-gallery chunk,
   * 于是自家导出的图重新导入时掉进下面的拼接兜底,rawText 混入追踪 JSON,
   * 并成为下一次 SD replay 的基准,逐次放大。
   */
  const parametersEntry = entries.find(e => e.keyword === 'parameters')
  if (parametersEntry) {
    reportUnconsumed(report, entries, ['parameters'])
    return finish(parseSDWebUI(parametersEntry.text), 'sd:parameters-chunk')
  }

  // NovelAI:Description(prompt) + Comment(JSON)
  if (entries.some(e => e.keyword === 'Description' || e.keyword === 'Comment')) {
    return finish(parseNovelAI(entries, report), 'nai:description-comment')
  }

  // 单块且含 Steps: —— keyword 不叫 parameters 的 A1111 变体
  if (entries.length === 1 && entries[0].text.includes('Steps:')) {
    return finish(parseSDWebUI(entries[0].text), 'sd:single-chunk-heuristic')
  }

  // 兜底:拼接后再试 SD。拼之前必须剔掉本 app 自己的追踪 chunk
  const foreign = entries.filter(e => e.keyword !== TRACE_KEYWORD)
  const allText = foreign.map(e => e.text).join('\n')
  if (allText.includes('Steps:')) {
    reportUnconsumed(report, entries, foreign.map(e => e.keyword))
    return finish(parseSDWebUI(allText), 'sd:concatenated-fallback')
  }

  /*
   * 没识别出任何已知格式 —— 此时才试 alpha 通道隐写。
   * 旧实现只在"零文本块"时试,于是一张带任意 tEXt 的 stealth 图永远检测不到。
   */
  if (imageSrc) {
    const stealthData = await extractStealthPng(imageSrc)
    if (stealthData) {
      // 标记出来:写回只写标准 chunk,alpha 里那份不会同步,编辑器要给警告
      const stealthReport: ParseReport = { unconsumedKeys: [] }
      const parsed = parseNovelAIStealth(stealthData, stealthReport)
      return {
        ...parsed,
        stealth: true,
        diagnostics: {
          container: 'png',
          matchedBy: 'nai:stealth-alpha-lsb',
          entries,
          unconsumedKeys: stealthReport.unconsumedKeys,
        },
      }
    }
  }

  reportUnconsumed(report, entries, [])
  return unknownResult(allText, { container: 'png', matchedBy: 'no-known-format', entries }, report)
}

/** 读到了但没被选中的解析器消费的条目,按 keyword 记进诊断(本 app 的追踪 chunk 不算) */
function reportUnconsumed(report: ParseReport, entries: RawMetadataEntry[], consumed: string[]): void {
  const used = new Set(consumed)
  for (const entry of entries) {
    if (entry.keyword === TRACE_KEYWORD) continue
    if (used.has(entry.keyword)) continue
    report.unconsumedKeys.push(entry.keyword)
  }
}

async function parseExifMetadata(file: File, container: MetadataContainerKind): Promise<ParsedMetadata> {
  const text = await extractExifMetadata(file)
  const entries: RawMetadataEntry[] = text
    ? [{ keyword: 'UserComment', text, entryType: 'exif', byteLength: text.length, status: 'ok' }]
    : []
  const base = { container, entries }

  if (text && text.includes('Steps:')) {
    return { ...parseSDWebUI(text), diagnostics: { ...base, matchedBy: 'sd:exif-usercomment', unconsumedKeys: [] } }
  }
  if (text) {
    return {
      source: 'unknown',
      prompt: text,
      negativePrompt: '',
      parameters: {},
      rawText: text,
      diagnostics: { ...base, matchedBy: 'exif-usercomment-unparsed', unconsumedKeys: [] },
    }
  }
  return unknownResult('', { ...base, matchedBy: 'exif-no-usercomment' })
}

function unknownResult(
  rawText = '',
  diagnostics?: { container: MetadataContainerKind; matchedBy: string; entries: RawMetadataEntry[] },
  report?: ParseReport
): ParsedMetadata {
  return {
    source: 'unknown',
    prompt: '',
    negativePrompt: '',
    parameters: {},
    rawText,
    ...(diagnostics
      ? { diagnostics: { ...diagnostics, unconsumedKeys: report?.unconsumedKeys ?? [] } }
      : {}),
  }
}

/**
 * Generate a thumbnail blob from an image file using Canvas.
 * Also reports the original image dimensions (already in hand in onload).
 */
export async function generateThumbnail(
  file: File,
  maxWidth = 400
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    let settled = false

    const revokeUrl = () => {
      URL.revokeObjectURL(url)
    }
    const rejectOnce = (error: unknown, fallbackMessage: string) => {
      if (settled) return
      settled = true
      try {
        revokeUrl()
      } finally {
        reject(error instanceof Error ? error : new Error(fallbackMessage))
      }
    }
    const resolveOnce = (result: { blob: Blob; width: number; height: number }) => {
      if (settled) return
      settled = true
      try {
        revokeUrl()
      } finally {
        resolve(result)
      }
    }

    img.onload = () => {
      try {
        const originalWidth = img.width
        const originalHeight = img.height
        const ratio = maxWidth / img.width
        const width = img.width > maxWidth ? maxWidth : img.width
        const height = img.width > maxWidth ? Math.round(img.height * ratio) : img.height

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Failed to create thumbnail canvas context')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolveOnce({ blob, width: originalWidth, height: originalHeight })
            } else {
              rejectOnce(new Error('Failed to generate thumbnail'), 'Failed to generate thumbnail')
            }
          },
          'image/webp',
          0.8
        )
      } catch (error) {
        rejectOnce(error, 'Failed to generate thumbnail')
      }
    }
    img.onerror = () => {
      rejectOnce(new Error('Failed to load image'), 'Failed to load image')
    }
    try {
      img.src = url
    } catch (error) {
      rejectOnce(error, 'Failed to load image')
    }
  })
}
