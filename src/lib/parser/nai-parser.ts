import pako from 'pako'
import type { ParsedMetadata, ImageParameters, PngTextChunk, NAIv4Data, NAICharacterPrompt, NAICharacterCenter } from '@/types'

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
 * Parse NovelAI format metadata from PNG text chunks.
 * NovelAI stores: Description (prompt) and Comment (JSON with uc, steps, etc.)
 * Supports v4 multi-character prompts via v4_prompt / v4_negative_prompt fields.
 */
export function parseNovelAI(chunks: PngTextChunk[]): ParsedMetadata {
  let prompt = ''
  let negativePrompt = ''
  const parameters: ImageParameters = {}
  let rawText = ''
  let v4Data: NAIv4Data | undefined

  for (const chunk of chunks) {
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
        if (json.noise_schedule) parameters['noise_schedule'] = json.noise_schedule
        if (json.sm !== undefined) parameters['sm'] = json.sm
        if (json.sm_dyn !== undefined) parameters['sm_dyn'] = json.sm_dyn
        if (json.cfg_rescale !== undefined) parameters['cfg_rescale'] = json.cfg_rescale

        // Parse v4 character prompt data
        const v4 = parseNAIv4(json)
        if (v4) v4Data = v4

        // Store remaining fields that are not already extracted for raw display
        rawText = chunk.text
      } catch {
        rawText = chunk.text
      }
    } else if (chunk.keyword === 'Source' || chunk.keyword === 'Generation time') {
      // Store additional NovelAI metadata
      parameters[chunk.keyword.toLowerCase().replace(/\s+/g, '_')] = chunk.text
    }
  }

  if (!rawText) {
    rawText = chunks.map(c => `${c.keyword}: ${c.text}`).join('\n')
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

/**
 * Parse NovelAI Stealth PNG metadata from JSON object.
 */
export function parseNovelAIStealth(json: Record<string, string>): ParsedMetadata {
  const chunks: PngTextChunk[] = Object.entries(json).map(([keyword, text]) => ({
    keyword,
    text: typeof text === 'string' ? text : JSON.stringify(text),
  }))
  return parseNovelAI(chunks)
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
 */
export async function extractStealthPng(imageSrc: string): Promise<Record<string, string> | null> {
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
    const gzipData = reader.readNBytes(dataLength / 8)
    const data = pako.ungzip(new Uint8Array(gzipData))
    const jsonString = new TextDecoder().decode(new Uint8Array(data))
    return JSON.parse(jsonString)
  } catch {
    return null
  }
}
