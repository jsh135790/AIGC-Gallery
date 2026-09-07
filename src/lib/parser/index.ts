import { readPngTextEntries, readExifUserComment, sniffContainer } from './png-parser'
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

export { getTagsFromPrompt, extractTags } from './tag-analyzer'
export { readPngTextEntries, readMetadataContainer, sniffContainer } from './png-parser'

/** 生产构建里不该有解析日志。诊断信息的正阵地是 diagnostics + 查看器 */
const debug: (...args: unknown[]) => void = import.meta.env.DEV
  ? (...args) => console.log('[PNG Parser]', ...args)
  : () => {}

/**
 * Main entry point: parse an image file and extract all metadata.
 * 容器判定走魔数,不看 file.type —— 某些拖拽源不带 MIME,也有把 PNG 标成 jpeg 的。
 *
 * 收 Blob 而不是 File:回补与查看器要重新解析库里的 imageData,那是个 Blob。
 */
export async function parseImageMetadata(
  file: Blob,
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

async function parsePngMetadata(file: Blob, imageSrc?: string): Promise<ParsedMetadata> {
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
    // 报告传进去:魔数对上但解不开时它会记一条,而不是伪装成"没有元数据"
    const stealthData = await extractStealthPng(imageSrc, report)
    if (stealthData) {
      // 标记出来:写回只写标准 chunk,alpha 里那份不会同步,编辑器要给警告
      const parsed = parseNovelAIStealth(stealthData, report)
      return {
        ...parsed,
        stealth: true,
        diagnostics: {
          container: 'png',
          matchedBy: 'nai:stealth-alpha-lsb',
          entries,
          unconsumedKeys: report.unconsumedKeys,
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

/**
 * JPEG / WebP / AVIF:目前只读 EXIF UserComment 一个标签。
 *
 * 产出的是一条真正的 `RawMetadataEntry`(不是从解码后的字符串现搓一个)——
 * 于是查看器第一层对这些容器不再是空的,`byteLength` 是真实字节数,
 * 编码回退与 JIS 不支持也能在第三层如实报出来。
 */
async function parseExifMetadata(file: Blob, container: MetadataContainerKind): Promise<ParsedMetadata> {
  const entry = await readExifUserComment(file)
  const entries: RawMetadataEntry[] = entry ? [entry] : []
  const base = { container, entries }
  const text = entry?.text ?? ''

  if (text.includes('Steps:')) {
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
  /*
   * 有条目但正文为空 = 读到了 UserComment 却解不开(JIS / 结构损坏)。
   * 这跟"压根没有 UserComment"是两件事,分开报 —— 条目自己的 status 说明了原因。
   */
  return unknownResult('', {
    ...base,
    matchedBy: entry ? 'exif-usercomment-unparsed' : 'exif-no-usercomment',
  })
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
 * Parse a Blob with no image src on hand.
 *
 * 隐写检测需要一个能喂给 <img> 的地址,所以这里临时造一个 object URL 并立刻回收 ——
 * 它不交给任何组件持有,不存在 CLAUDE.md 那条"导航前失效"的问题。
 *
 * 库里的 imageData 一直留着,所以任何时候都能从 blob 重新解析一遍,
 * 不必相信库行里那些"当时那个解析器"留下的字段。
 */
export async function parseBlobMetadata(blob: Blob): Promise<ParsedMetadata> {
  const url = URL.createObjectURL(blob)
  try {
    return await parseImageMetadata(blob, url)
  } finally {
    URL.revokeObjectURL(url)
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
