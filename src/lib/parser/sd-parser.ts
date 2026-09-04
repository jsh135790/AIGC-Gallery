import type { ParsedMetadata, ImageParameters } from '@/types'

/** 参数行里的一项。`text` 是原始片段(不含分隔逗号),导出时用来逐字回写 */
export interface SDParamPair {
  /** 原始键拼写,如 `CFG scale` / `Lora hashes` */
  key: string
  /** 去掉首尾空白的值 */
  value: string
  /** 原始片段,连空格一起留着 */
  text: string
}

/**
 * 按逗号切分 SD 参数行,**但引号内的逗号不算分隔符**。
 *
 * `Lora hashes: "detail_tweaker: 7c6bad76eb, add_detail: 6cbc63ac47"` 这种值本身
 * 带逗号又带引号,裸 `.split(',')` 会把它切成两段废料。读侧和写侧必须用同一套切分
 * 规则,否则"改一个字段"会顺手打碎另一个字段。
 */
export function splitSDParams(line: string): SDParamPair[] {
  const pairs: SDParamPair[] = []
  let buf = ''
  let inQuotes = false

  const flush = () => {
    if (!buf.trim()) {
      buf = ''
      return
    }
    const colonIndex = buf.indexOf(':')
    pairs.push(
      colonIndex === -1
        ? { key: '', value: '', text: buf }
        : { key: buf.slice(0, colonIndex).trim(), value: buf.slice(colonIndex + 1).trim(), text: buf }
    )
    buf = ''
  }

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
      buf += ch
    } else if (ch === ',' && !inQuotes) {
      flush()
    } else {
      buf += ch
    }
  }
  flush()

  return pairs
}

/** 参数行键 → `ImageParameters` 字段名。未列出的键按原拼写存进 parameters */
const SD_KEY_TO_FIELD: Record<string, string> = {
  'steps': 'steps',
  'sampler': 'sampler',
  'schedule type': 'scheduler',
  'cfg scale': 'cfgScale',
  'seed': 'seed',
  'size': 'size',
  'model': 'model',
  'vae': 'vae',
  'clip skip': 'clipSkip',
  'denoising strength': 'denoisingStrength',
}

/** 写侧的反向表:字段名 → 参数行里该用的键拼写 */
export const SD_FIELD_TO_KEY: Record<string, string> = {
  steps: 'Steps',
  sampler: 'Sampler',
  scheduler: 'Schedule type',
  cfgScale: 'CFG scale',
  seed: 'Seed',
  size: 'Size',
  model: 'Model',
  vae: 'VAE',
  clipSkip: 'Clip skip',
  denoisingStrength: 'Denoising strength',
}

/** 给定参数行里的原始键,返回它对应的 `ImageParameters` 字段名 */
export function sdFieldForKey(key: string): string {
  return SD_KEY_TO_FIELD[key.toLowerCase()] ?? key
}

const NUMERIC_FIELDS = new Set(['steps', 'cfgScale', 'clipSkip', 'denoisingStrength'])

/**
 * 定位参数行(以 `\nSteps:` 开头的那一段)在原始串里的起点。
 * 返回 -1 表示这份文本没有参数行。
 */
export function findSDParamLineIndex(text: string): number {
  const match = /\nSteps:/.exec(text)
  return match ? match.index + 1 : -1
}

/**
 * Parse SD-WebUI format metadata text.
 * Format: prompt\nNegative prompt: ...\nSteps: N, Sampler: xxx, CFG scale: N, ...
 */
export function parseSDWebUI(text: string): ParsedMetadata {
  const parameters: ImageParameters = {}

  // Split into prompt / negative / params sections
  const paramIndex = findSDParamLineIndex(text)
  const promptSection = paramIndex === -1 ? text : text.slice(0, paramIndex)
  const paramsSection = paramIndex === -1 ? '' : text.slice(paramIndex)

  // Extract negative prompt
  const negativeSplit = promptSection.split(/\nNegative prompt:\s*/)
  const prompt = negativeSplit[0]?.trim() || ''
  const negativePrompt = negativeSplit[1]?.trim() || ''

  // Parse parameters from "Steps: N, Sampler: xxx, CFG scale: N, ..."
  for (const pair of splitSDParams(paramsSection)) {
    if (!pair.key) continue
    const field = sdFieldForKey(pair.key)

    if (NUMERIC_FIELDS.has(field)) {
      const num = Number(pair.value)
      parameters[field] = Number.isFinite(num) ? num : pair.value
    } else {
      // 同名键重复出现时保留第一次的值(SD 不会这么写,但别让后面的覆盖前面的)
      if (parameters[field] === undefined) parameters[field] = pair.value
    }
  }

  return {
    source: 'sd',
    prompt,
    negativePrompt,
    parameters,
    rawText: text,
  }
}
