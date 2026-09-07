import extract from 'png-chunks-extract'
import encode from 'png-chunks-encode'
import type { ParsedMetadata, ImageSource } from '@/types'
import { splitSDParams, sdFieldForKey, SD_FIELD_TO_KEY, findSDParamLineIndex } from './sd-parser'
import { DERIVED_FIELDS } from './fields'
import type { PngChunkLike } from './png-parser'
import { TRACE_KEYWORD } from './trace'

/*
 * 写回的原则是**外科手术式替换**,不是"按已知字段重新拼一份"。
 *
 * 旧实现两条路都在静默丢数据:SD 分支只重新序列化 8 个硬编码参数,`Model hash` /
 * `VAE` / `Lora hashes` / `Version` 全部消失;NAI 分支把 `Title` / `Generation time`
 * 整条删掉,并把 `Source` 写死成 `Stable Diffusion XL`。导出一次,原始 provenance
 * 就没了,而且不可逆。
 *
 * 所以这里的规矩是:以原始串(`metadata.rawText` / 原始 chunk 表)为底,按原始顺序、
 * 原始键拼写逐项搬运,只替换用户真的改过的键;不认识的键原样留在原位置。
 */

/** NAI 这几个值来自独立 tEXt chunk(原样透传),不该塞进 Comment JSON */
const NAI_CHUNK_FIELDS = new Set(['source', 'generation_time', 'title', 'software'])

/** Comment JSON 里有专门处理逻辑的字段,不走"其余字段"那条通道 */
const NAI_CORE_FIELDS = new Set(['steps', 'sampler', 'cfgScale', 'seed', 'size', 'model'])

export type MetadataWriteErrorCode = 'unsupported-source' | 'nothing-to-write'

/** 写入失败要能被区分 —— 任何"实际没写入"的路径都不许在 UI 上报成功 */
export class MetadataWriteError extends Error {
  constructor(public readonly code: MetadataWriteErrorCode, message: string) {
    super(message)
    this.name = 'MetadataWriteError'
  }
}

/**
 * Write metadata back to a PNG image.
 * @param imageBlob Original PNG image blob
 * @param metadata Metadata to write
 * @param source 目标格式。裸 PNG 由调用方选(sd / nai),不能传 unknown
 * @returns New PNG blob with updated metadata
 */
export async function writePNGMetadata(
  imageBlob: Blob,
  metadata: ParsedMetadata,
  source: ImageSource
): Promise<Blob> {
  if (source !== 'sd' && source !== 'nai') {
    throw new MetadataWriteError('unsupported-source', `Cannot write metadata for source "${source}"`)
  }

  const arrayBuffer = await imageBlob.arrayBuffer()
  const chunks = extract(new Uint8Array(arrayBuffer)) as PngChunkLike[]

  /*
   * 只剔除我们即将重写的 keyword,其余一律透传。iTXt / zTXt 也要过一遍同样的筛子:
   * 原图若把 Description 存成 iTXt,只删 tEXt 会让新旧两份元数据并存且互相矛盾。
   */
  const doomed = new Set(
    [TRACE_KEYWORD, ...(source === 'sd' ? ['parameters'] : ['Description', 'Comment'])]
      .map(keyword => keyword.toLowerCase())
  )
  const kept = chunks.filter(chunk => {
    if (!isTextLikeChunk(chunk.name)) return true
    return !doomed.has(extractKeyword(chunk.data).toLowerCase())
  })

  // 无内容可写时这里会抛错,所以走到下面就一定真写进去了
  const newChunks = source === 'sd'
    ? encodeSDMetadata(metadata)
    : encodeNAIMetadata(metadata, kept)

  newChunks.push(createTraceChunk())

  const iendIndex = kept.findIndex(chunk => chunk.name === 'IEND')
  if (iendIndex === -1) kept.push(...newChunks)
  else kept.splice(iendIndex, 0, ...newChunks)

  return new Blob([new Uint8Array(encode(kept))], { type: 'image/png' })
}

// ===== chunk 基础设施 =====

function isTextLikeChunk(name: string): boolean {
  return name === 'tEXt' || name === 'iTXt' || name === 'zTXt'
}

/** tEXt / iTXt / zTXt 都以 `keyword\0` 开头,所以一个实现够用 */
function extractKeyword(data: Uint8Array): string {
  let keywordEnd = data.length
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0x00) {
      keywordEnd = i
      break
    }
  }
  return new TextDecoder().decode(data.slice(0, keywordEnd))
}

/** 手搓 tEXt:`keyword\0content` */
function createTextChunk(keyword: string, content: string): PngChunkLike {
  const keywordBytes = new TextEncoder().encode(keyword)
  const contentBytes = new TextEncoder().encode(content)
  const data = new Uint8Array(keywordBytes.length + 1 + contentBytes.length)
  data.set(keywordBytes, 0)
  data[keywordBytes.length] = 0
  data.set(contentBytes, keywordBytes.length + 1)
  return { name: 'tEXt', data }
}

/** 编辑痕迹。重复导出是替换(keyword 已在 doomed 里),不会累加 */
function createTraceChunk(): PngChunkLike {
  return createTextChunk(TRACE_KEYWORD, JSON.stringify({
    editedAt: new Date().toISOString(),
    tool: `AIGC Gallery ${__APP_VERSION__}`,
  }))
}

// ===== 取值工具 =====

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value) ?? ''
}

// ===== SD WebUI =====

function encodeSDMetadata(metadata: ParsedMetadata): PngChunkLike[] {
  const content = buildSDParametersText(metadata)
  if (!content.trim()) {
    throw new MetadataWriteError('nothing-to-write', 'No SD metadata to write')
  }
  return [createTextChunk('parameters', content)]
}

function buildSDParametersText(metadata: ParsedMetadata): string {
  const params = metadata.parameters ?? {}
  const raw = metadata.rawText || ''
  const paramIndex = findSDParamLineIndex(raw)
  const originalPairs = paramIndex === -1 ? [] : splitSDParams(raw.slice(paramIndex))

  const parts: string[] = []
  const written = new Set<string>()

  // ① 原始顺序、原始键拼写逐项搬运
  for (const pair of originalPairs) {
    if (!pair.key) {
      parts.push(pair.text.trim())
      continue
    }
    const field = sdFieldForKey(pair.key)
    written.add(field)

    const current = params[field]
    // 用户把这个字段清空了 —— 那它就该从文件里消失,而不是留着旧值
    if (isBlank(current)) continue

    const next = formatValue(current)
    parts.push(next === pair.value ? pair.text.trim() : `${pair.key}: ${next}`)
  }

  // ② 原文没有、但现在有值的字段追加到末尾(裸 PNG 走这条路把整份参数写出来)
  for (const [field, value] of Object.entries(params)) {
    if (written.has(field) || DERIVED_FIELDS.has(field) || isBlank(value)) continue
    parts.push(`${SD_FIELD_TO_KEY[field] ?? field}: ${formatValue(value)}`)
  }

  /*
   * 我们自己的解析器靠 `\nSteps:` 定位参数行。现搭的行必须让 Steps 打头,否则导出的
   * 图再拖回来会把整段参数读成提示词。原文本来就有参数行时不重排 —— 那是它的原始字节序。
   */
  if (originalPairs.length === 0) hoistSteps(parts)

  /*
   * 正向提示词为空时不留前导空行 —— A1111 自己会 strip 整份 infotext,
   * 我们写出的形状要能被同一个读侧原样认回来(见 findSDParamLineIndex 认字符串开头)。
   */
  const lines: string[] = [metadata.prompt || '']
  if (metadata.negativePrompt) lines.push(`Negative prompt: ${metadata.negativePrompt}`)
  if (parts.length) lines.push(parts.join(', '))
  if (!lines[0]) lines.shift()
  return lines.join('\n')
}

function hoistSteps(parts: string[]): void {
  const index = parts.findIndex(part => /^Steps\s*:/i.test(part))
  if (index > 0) parts.unshift(...parts.splice(index, 1))
}

// ===== NovelAI =====

function encodeNAIMetadata(metadata: ParsedMetadata, keptChunks: PngChunkLike[]): PngChunkLike[] {
  const comment = buildNAIComment(metadata)

  const hasContent = Boolean(metadata.prompt || metadata.negativePrompt)
    || Object.entries(comment).some(([key, value]) => key !== 'prompt' && key !== 'uc' && !isBlank(value))
  if (!hasContent) {
    throw new MetadataWriteError('nothing-to-write', 'No NAI metadata to write')
  }

  const chunks: PngChunkLike[] = [
    createTextChunk('Description', metadata.prompt || ''),
    createTextChunk('Comment', JSON.stringify(comment)),
  ]

  /*
   * Software / Source 只在原文件确实没有时才补。旧实现无条件写
   * `Source: Stable Diffusion XL`,把真实的 `NovelAI Diffusion V4 3B41C7B0` 盖掉了 ——
   * 那串是模型指纹,盖掉就再也认不出这张图是哪个版本出的。
   */
  const present = new Set(
    keptChunks
      .filter(chunk => isTextLikeChunk(chunk.name))
      .map(chunk => extractKeyword(chunk.data).toLowerCase())
  )
  if (!present.has('software')) chunks.push(createTextChunk('Software', 'NovelAI'))
  if (!present.has('source')) {
    const source = metadata.parameters?.source
    if (typeof source === 'string' && source) chunks.push(createTextChunk('Source', source))
  }

  return chunks
}

function buildNAIComment(metadata: ParsedMetadata): Record<string, unknown> {
  let comment: Record<string, unknown> = {}
  if (metadata.rawText) {
    try {
      const parsed: unknown = JSON.parse(metadata.rawText)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        comment = parsed as Record<string, unknown>
      }
    } catch {
      // rawText 不是 JSON(例如隐写图拼接出来的多 chunk 文本),从空对象起
    }
  }

  // 原值先留一份:v4 的 base_caption 同步规则和 size 是否改过都要靠它判断
  const originalPrompt = typeof comment.prompt === 'string' ? comment.prompt : ''
  const originalUc = typeof comment.uc === 'string' ? comment.uc : ''
  const originalSize = typeof comment.width === 'number' && typeof comment.height === 'number'
    ? `${comment.width}x${comment.height}`
    : ''

  const params = metadata.parameters ?? {}

  comment.prompt = metadata.prompt || ''
  comment.uc = metadata.negativePrompt || ''

  assignField(comment, 'steps', params.steps, 'number')
  assignField(comment, 'sampler', params.sampler, 'string')
  assignField(comment, 'scale', params.cfgScale, 'number')
  assignField(comment, 'seed', params.seed, 'number')

  // width / height 只在 size 真的改过时才动
  const nextSize = typeof params.size === 'string' ? params.size.trim() : ''
  if (nextSize && nextSize !== originalSize) {
    const [w, h] = nextSize.split(/[x×]/).map(part => Number(part.trim()))
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      comment.width = w
      comment.height = h
    }
  }

  /*
   * model 只在 Comment 原本就有这个键时才改。nai-parser 读的是 `json.model || json.source`,
   * 值可能来自 Source chunk —— 那种情况下往 Comment 里新塞一个 model 是凭空造字段。
   */
  if ('model' in comment) assignField(comment, 'model', params.model, 'string')

  // 其余字段(noise_schedule / cfg_rescale / sm / sm_dyn …):原文有这个键才写
  for (const [field, value] of Object.entries(params)) {
    if (NAI_CORE_FIELDS.has(field) || DERIVED_FIELDS.has(field) || NAI_CHUNK_FIELDS.has(field)) continue
    if (!(field in comment)) continue
    assignField(comment, field, value, kindOf(comment[field]))
  }

  applyV4Captions(comment, metadata, originalPrompt, originalUc)

  return comment
}

type ValueKind = 'number' | 'string' | 'boolean' | 'raw'

function kindOf(value: unknown): ValueKind {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'string') return 'string'
  return 'raw'
}

function coerce(value: unknown, kind: ValueKind): unknown {
  if (kind === 'number') {
    const num = Number(value)
    return Number.isFinite(num) ? num : String(value)
  }
  if (kind === 'boolean') {
    if (value === true || value === 'true') return true
    if (value === false || value === 'false') return false
    return String(value)
  }
  if (kind === 'string') return String(value)
  return value
}

/**
 * 写一个 Comment 字段。判据是"与原值不同"而不是"新值为真" —— 旧实现用
 * `if (metadata.parameters.sampler)` 这类真值判断,于是用户清空某字段永远写不回去。
 */
function assignField(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
  kind: ValueKind
): void {
  if (value === undefined) return       // UI 里根本没这个字段,别动原值
  if (isBlank(value)) {
    if (key in target) delete target[key]
    return
  }
  const next = coerce(value, kind)
  if (String(target[key] ?? '') !== String(next ?? '')) target[key] = next
}

// ===== NAI v4 角色提示词 =====

function applyV4Captions(
  comment: Record<string, unknown>,
  metadata: ParsedMetadata,
  originalPrompt: string,
  originalUc: string
): void {
  const v4 = metadata.v4Data
  if (!v4) return

  updateV4Block(comment, 'v4_prompt', originalPrompt, metadata.prompt || '', v4.characters.map(c => c.prompt))
  updateV4Block(comment, 'v4_negative_prompt', originalUc, metadata.negativePrompt || '', v4.characters.map(c => c.negative))
}

function updateV4Block(
  comment: Record<string, unknown>,
  key: string,
  originalBase: string,
  nextBase: string,
  captions: string[]
): void {
  const rawBlock = comment[key]
  if (rawBlock === undefined || rawBlock === null) return

  const wasString = typeof rawBlock === 'string'
  let block: Record<string, unknown>
  try {
    block = wasString
      ? JSON.parse(rawBlock as string) as Record<string, unknown>
      : { ...(rawBlock as Record<string, unknown>) }
  } catch {
    return                              // 解析不了就整块别动
  }
  if (!block || typeof block !== 'object') return

  const caption = block.caption as Record<string, unknown> | undefined
  if (!caption || typeof caption !== 'object') return

  /*
   * base_caption 本轮不可编辑。原值等于顶层 prompt / uc 时它只是同一串的副本,跟着改;
   * 两者原本就分叉的图**不动它** —— 那是这张图真正的全局提示词,顶层 prompt 是合成串。
   * 编辑器左栏会为这种图显示一条说明,让"导出不会改 base_caption"可见而不是静默。
   */
  if (typeof caption.base_caption === 'string' && caption.base_caption === originalBase) {
    caption.base_caption = nextBase
  }

  /*
   * 保留数组里每一项的其他字段(centers,以及 NAI 可能带的别的 per-character 键),
   * 只换 char_caption。旧实现整体重建成 `{char_caption, centers}`,其余字段就丢了。
   */
  if (Array.isArray(caption.char_captions)) {
    caption.char_captions = caption.char_captions.map((entry: unknown, i: number) => {
      if (i >= captions.length) return entry
      if (!entry || typeof entry !== 'object') return entry
      return { ...(entry as Record<string, unknown>), char_caption: captions[i] }
    })
  }

  comment[key] = wasString ? JSON.stringify(block) : block
}
