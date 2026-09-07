import pako from 'pako'
import type { ParsedMetadata, ImageParameters, PngTextChunk, NAIv4Data, NAICharacterPrompt, NAICharacterCenter, ParseReport } from '@/types'
import { TRACE_KEYWORD } from './trace'

// ===== NovelAI v4 Character Prompt Helpers =====

/**
 * Safely parse a value that may be a JSON string or already an object.
 */
function parseMaybeJson(val: unknown): Record<string, unknown> | null {
  if (!val) return null
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch {
      return null
    }
  }
  if (typeof val === 'object') return val as Record<string, unknown>
  return null
}

/**
 * Extract NovelAI v4 multi-character prompt data from Comment JSON.
 * Returns null if no v4_prompt / v4_negative_prompt fields are present.
 */
function parseNAIv4(commentJson: Record<string, unknown>): NAIv4Data | null {
  const p = parseMaybeJson(commentJson.v4_prompt)
  const n = parseMaybeJson(commentJson.v4_negative_prompt)

  if (!p && !n) return null

  const result: NAIv4Data = {
    basePrompt: '',
    baseNegative: '',
    characters: [],
    useOrder: false,
    useCoords: false,
    legacyUc: false,
  }

  // Extract base prompts and meta flags
  if (p) {
    const caption = p.caption as Record<string, unknown> | undefined
    if (caption) {
      result.basePrompt = String(caption.base_caption || '')
    }
    result.useOrder = !!p.use_order
    result.useCoords = !!p.use_coords
  }

  if (n) {
    const caption = n.caption as Record<string, unknown> | undefined
    if (caption) {
      result.baseNegative = String(caption.base_caption || '')
    }
    result.legacyUc = !!n.legacy_uc
  }

  // Extract per-character captions
  const pCaption = p?.caption as Record<string, unknown> | undefined
  const nCaption = n?.caption as Record<string, unknown> | undefined
  const pChars = pCaption && Array.isArray(pCaption.char_captions) ? pCaption.char_captions : []
  const nChars = nCaption && Array.isArray(nCaption.char_captions) ? nCaption.char_captions : []
  const maxLen = Math.max(pChars.length, nChars.length)

  for (let i = 0; i < maxLen; i++) {
    const pc = (pChars[i] as Record<string, unknown>) || {}
    const nc = (nChars[i] as Record<string, unknown>) || {}
    const rawCenters = Array.isArray(pc.centers) ? pc.centers : Array.isArray(nc.centers) ? nc.centers : []
    const centers: NAICharacterCenter[] = rawCenters.map((pt: Record<string, unknown>) => ({
      x: typeof pt.x === 'number' ? pt.x : Number(pt.x) || 0,
      y: typeof pt.y === 'number' ? pt.y : Number(pt.y) || 0,
    }))

    const character: NAICharacterPrompt = {
      idx: i + 1,
      prompt: String(pc.char_caption || ''),
      negative: String(nc.char_caption || ''),
      centers,
    }
    result.characters.push(character)
  }

  return result
}

/**
 * Comment JSON 里已有专门归宿的键 —— 归一化后不能再原样透传一份,
 * 否则 UI 上会出现 `cfgScale` 与 `scale` 并列这种自相矛盾的展示。
 */
const NAI_CONSUMED_KEYS = new Set([
  'prompt',              // → 顶层 prompt(Description chunk 优先)
  'uc',                  // → negativePrompt
  'steps', 'sampler', 'scale', 'seed',
  'width', 'height',     // → size
  'model', 'source',     // → model
  'v4_prompt', 'v4_negative_prompt', // → v4Data
])

/**
 * Parse NovelAI format metadata from PNG text chunks.
 * NovelAI stores: Description (prompt) and Comment (JSON with uc, steps, etc.)
 * Supports v4 multi-character prompts via v4_prompt / v4_negative_prompt fields.
 *
 * 已知键归一化,**其余键一律原样透传**进 parameters。展示层已经在遍历 parameters,
 * 所以这一条就是"NAI 加了新字段时 UI 自动跟上"的落点 —— 之前卡在只放 11 个键进去。
 */
export function parseNovelAI(chunks: PngTextChunk[], report?: ParseReport): ParsedMetadata {
  let prompt = ''
  let negativePrompt = ''
  const parameters: ImageParameters = {}
  let rawText = ''
  let v4Data: NAIv4Data | undefined

  for (const chunk of chunks) {
    // 本 app 自己的编辑痕迹不是图片元数据
    if (chunk.keyword === TRACE_KEYWORD) continue

    if (chunk.keyword === 'Description') {
      prompt = chunk.text.trim()
    } else if (chunk.keyword === 'Comment') {
      try {
        const json = JSON.parse(chunk.text) as Record<string, unknown>
        negativePrompt = (json.uc as string) || ''
        parameters.steps = json.steps as number
        parameters.sampler = json.sampler as string
        parameters.cfgScale = json.scale as number
        parameters.seed = json.seed as number | string
        const w = json.width as number | undefined
        const h = json.height as number | undefined
        parameters.size = w && h ? `${w}x${h}` : undefined
        parameters.model = (json.model || json.source) as string | undefined

        // Parse v4 character prompt data
        const v4 = parseNAIv4(json)
        if (v4) v4Data = v4

        // 白名单之外的键全部透传。模型/工具改字段名时不需要动代码
        for (const [key, value] of Object.entries(json)) {
          if (NAI_CONSUMED_KEYS.has(key)) continue
          parameters[key] = value
        }

        rawText = chunk.text
      } catch {
        // Comment 不是合法 JSON —— 原文留在 rawText,写侧会据此判断能不能 replay
        report?.unconsumedKeys.push('Comment')
        rawText = chunk.text
      }
    } else {
      /*
       * 其余独立 chunk 一律收下(Source / Generation time / Title / Software /
       * 任何将来新增的)。旧实现只认前两个,Title 与 Software 被整条丢弃。
       */
      parameters[normalizeChunkKeyword(chunk.keyword)] = chunk.text
    }
  }

  if (!rawText) {
    rawText = chunks
      .filter(c => c.keyword !== TRACE_KEYWORD)
      .map(c => `${c.keyword}: ${c.text}`)
      .join('\n')
  }

  return {
    source: 'nai',
    prompt,
    negativePrompt,
    parameters,
    rawText,
    ...(v4Data ? { v4Data } : {}),
  }
}

/** `Generation time` → `generation_time`,与写侧的 NAI_CHUNK_FIELDS 对齐 */
function normalizeChunkKeyword(keyword: string): string {
  return keyword.toLowerCase().replace(/\s+/g, '_')
}

/**
 * Parse NovelAI Stealth PNG metadata from JSON object.
 */
export function parseNovelAIStealth(json: Record<string, string>, report?: ParseReport): ParsedMetadata {
  const chunks: PngTextChunk[] = Object.entries(json).map(([keyword, text]) => ({
    keyword,
    text: typeof text === 'string' ? text : JSON.stringify(text),
  }))
  return parseNovelAI(chunks, report)
}

// ===== Stealth PNG Decoder =====

class DataReader {
  private data: number[]
  private index: number

  constructor(data: number[]) {
    this.data = data
    this.index = 0
  }

  readBit(): number {
    return this.data[this.index++]
  }

  readByte(): number {
    let byte = 0
    for (let i = 0; i < 8; i++) {
      byte |= this.readBit() << (7 - i)
    }
    return byte
  }

  readNBytes(n: number): number[] {
    const bytes: number[] = []
    for (let i = 0; i < n; i++) {
      bytes.push(this.readByte())
    }
    return bytes
  }

  readInt32(): number {
    const bytes = this.readNBytes(4)
    return new DataView(new Uint8Array(bytes).buffer).getInt32(0, false)
  }
}

/**
 * Extract Stealth PNG metadata hidden in the alpha channel.
 * NovelAI hides metadata using LSB steganography in the alpha channel.
 *
 * 解码失败会经 `report` 如实报出来 —— 返回 null 同时意味着"没有隐写数据",
 * 两者混在一起时用户看到的是「这张图没有元数据」,而真相是「有,但读坏了」。
 */
export async function extractStealthPng(
  imageSrc: string,
  report?: ParseReport
): Promise<Record<string, string> | null> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: true })!
  const img = new Image()
  img.src = imageSrc

  try {
    await img.decode()
  } catch {
    return null
  }

  canvas.width = img.width
  canvas.height = img.height
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, img.width, img.height)
  const lowestData: number[] = []

  for (let x = 0; x < img.width; x++) {
    for (let y = 0; y < img.height; y++) {
      const index = (y * img.width + x) * 4
      const a = imageData.data[index + 3]
      lowestData.push(a & 1)
    }
  }

  const magic = 'stealth_pngcomp'
  const reader = new DataReader(lowestData)
  const readMagic = reader.readNBytes(magic.length)
  const magicString = String.fromCharCode(...readMagic)

  if (magic !== magicString) {
    return null
  }

  try {
    const dataLength = reader.readInt32()
    /*
     * 位长按规范是 8 的倍数,现实里见过不对齐的。旧代码 `readNBytes(dataLength / 8)`
     * 会要求读小数个字节:循环里那次越界的 readBit 返回 undefined,`undefined << 7`
     * 静默贡献 0,末字节被写坏 → pako.ungzip 抛错 → catch 返回 null,对外表现成
     * 「这张图没有元数据」。向上取整,并把不对齐如实报出来。
     */
    if (dataLength % 8 !== 0) {
      report?.unconsumedKeys.push(`stealth:bit-length-unaligned:${dataLength}`)
    }
    const gzipData = reader.readNBytes(Math.ceil(dataLength / 8))
    const data = pako.ungzip(new Uint8Array(gzipData))
    const jsonString = new TextDecoder().decode(new Uint8Array(data))
    return JSON.parse(jsonString)
  } catch {
    // 魔数已经对上了,所以这里是"有隐写数据但解不开",不是"没有"
    report?.unconsumedKeys.push('stealth:decode-failed')
    return null
  }
}
