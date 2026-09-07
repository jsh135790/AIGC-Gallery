import extractChunks from 'png-chunks-extract'
import pako from 'pako'
import type {
  EntryDecodeStatus,
  MetadataContainer,
  MetadataContainerKind,
  RawMetadataEntry,
} from '@/types'

/*
 * PNG 文本块的完整读取器。
 *
 * 三类文本块必须全收,少一类就是静默丢数据:
 *   tEXt  keyword\0text
 *   zTXt  keyword\0 压缩方法(1) zlib(text)
 *   iTXt  keyword\0 压缩标志(1) 压缩方法(1) 语言标签\0 翻译关键字\0 [zlib](text)
 *
 * 两条历史教训写在这里,别再退回去:
 *  1. iTXt 的压缩标志必须真的看。跳过两个字节当没事发生,会把 deflate 原始字节
 *     喂给 TextDecoder —— 输出乱码而且不抛错,是最难发现的一类丢数据。
 *  2. tEXt 正文按规范是 Latin-1,但 A1111 事实上写 UTF-8,本 app 的写侧也写 UTF-8。
 *     所以读侧先按严格 UTF-8 解,失败才回退 Latin-1,并把回退记进 status。
 *     反过来(一律 Latin-1)会让所有中文 prompt 乱码。
 */

/** PNG 签名 */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const TEXT_CHUNK_NAMES = new Set(['tEXt', 'zTXt', 'iTXt'])

/** png-chunks-extract / -encode 两侧共用的 chunk 形状。读写各声明一份就会分叉 */
export interface PngChunkLike {
  name: string
  data: Uint8Array
}

/**
 * 按魔数判断容器类型。不能信 `file.type` —— 某些拖拽源不带 MIME,
 * 也有把 PNG 标成 image/jpeg 的,旧实现因此整张图一个字段都不解析。
 */
export function sniffContainer(bytes: Uint8Array): MetadataContainerKind {
  if (startsWith(bytes, PNG_SIGNATURE)) return 'png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp'
  // ISO-BMFF: 前 4 字节是 box 长度,随后 'ftyp',品牌里含 avif / avis
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = latin1(bytes.slice(8, 12))
    if (brand === 'avif' || brand === 'avis') return 'avif'
  }
  return 'unknown'
}

function startsWith(bytes: Uint8Array, expected: number[], offset = 0): boolean {
  if (bytes.length < offset + expected.length) return false
  return expected.every((byte, i) => bytes[offset + i] === byte)
}

function latin1(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += String.fromCharCode(byte)
  return out
}

/** 严格 UTF-8 优先,失败回退 Latin-1。回退这件事要能被上层看见 */
function decodeText(bytes: Uint8Array): { text: string; status: EntryDecodeStatus } {
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), status: 'ok' }
  } catch {
    return { text: latin1(bytes), status: 'encoding-fallback' }
  }
}

function indexOfNull(data: Uint8Array, from = 0): number {
  for (let i = from; i < data.length; i++) {
    if (data[i] === 0x00) return i
  }
  return -1
}

function inflate(bytes: Uint8Array): Uint8Array | null {
  try {
    return pako.inflate(bytes)
  } catch {
    return null
  }
}

// ===== 单块解码 =====

function decodeTEXt(data: Uint8Array): Omit<RawMetadataEntry, 'entryType' | 'byteLength'> {
  const split = indexOfNull(data)
  if (split === -1) {
    // 没有分隔符,整块当关键字处理,正文为空。畸形但不该让整张图失败
    return { keyword: latin1(data), text: '', status: 'malformed' }
  }
  const keyword = latin1(data.slice(0, split))
  const { text, status } = decodeText(data.slice(split + 1))
  return { keyword, text, status }
}

function decodeZTXt(data: Uint8Array): Omit<RawMetadataEntry, 'entryType' | 'byteLength'> {
  const split = indexOfNull(data)
  if (split === -1) return { keyword: latin1(data), text: '', status: 'malformed' }
  const keyword = latin1(data.slice(0, split))
  // split+1 是压缩方法字节,zlib 流从 split+2 开始
  const raw = inflate(data.slice(split + 2))
  if (!raw) return { keyword, text: '', status: 'decompress-failed' }
  const { text, status } = decodeText(raw)
  return { keyword, text, status }
}

function decodeITXt(data: Uint8Array): Omit<RawMetadataEntry, 'entryType' | 'byteLength'> {
  const keywordEnd = indexOfNull(data)
  if (keywordEnd === -1) return { keyword: latin1(data), text: '', status: 'malformed' }
  const keyword = latin1(data.slice(0, keywordEnd))

  const compressionFlag = data[keywordEnd + 1]
  const langEnd = indexOfNull(data, keywordEnd + 3)
  if (langEnd === -1) return { keyword, text: '', status: 'malformed' }
  const translatedEnd = indexOfNull(data, langEnd + 1)
  if (translatedEnd === -1) return { keyword, text: '', status: 'malformed' }

  const languageTag = latin1(data.slice(keywordEnd + 3, langEnd))
  const translatedKeyword = decodeText(data.slice(langEnd + 1, translatedEnd)).text
  const rawPayload = data.slice(translatedEnd + 1)

  // 压缩标志必须真的看 —— 跳过两字节当没事发生就会把 deflate 字节当文本解出乱码
  const payload = compressionFlag === 1 ? inflate(rawPayload) : rawPayload
  if (!payload) {
    return { keyword, text: '', status: 'decompress-failed', languageTag, translatedKeyword }
  }

  const { text, status } = decodeText(payload)
  return { keyword, text, status, languageTag, translatedKeyword }
}

// ===== 对外入口 =====

/**
 * 读出 PNG 里全部文本块。
 * 单块解码失败只标记该块,不影响其余块 —— 旧实现让一个坏块毁掉整张图的导入。
 */
export async function readPngTextEntries(file: Blob): Promise<RawMetadataEntry[]> {
  const buffer = await file.arrayBuffer()
  let chunks: PngChunkLike[]

  try {
    chunks = extractChunks(new Uint8Array(buffer))
  } catch {
    // CRC 不匹配 / 缺 IEND —— 整个 chunk 表都取不到,只能当没有元数据
    return []
  }

  const entries: RawMetadataEntry[] = []
  for (const chunk of chunks) {
    if (!TEXT_CHUNK_NAMES.has(chunk.name)) continue
    const byteLength = chunk.data.length
    try {
      const decoded =
        chunk.name === 'zTXt' ? decodeZTXt(chunk.data)
          : chunk.name === 'iTXt' ? decodeITXt(chunk.data)
            : decodeTEXt(chunk.data)
      entries.push({ ...decoded, entryType: chunk.name, byteLength })
    } catch {
      entries.push({ keyword: '', text: '', entryType: chunk.name, byteLength, status: 'malformed' })
    }
  }
  return entries
}

/**
 * 按魔数分容器读取原始条目。
 *
 * JPEG / WebP / AVIF 也产出真正的条目(只有 UserComment 一条)—— 查看器的第一层
 * 因此对这些容器不再是空的,第三层也能报出编码回退与 JIS 不支持。
 * 「容器 → 条目」这个形状是刻意的:加 eXIf / XMP 时不用改任何调用方。
 */
export async function readMetadataContainer(file: Blob): Promise<MetadataContainer> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const kind = sniffContainer(head)
  if (kind === 'png') return { kind, entries: await readPngTextEntries(file) }
  if (kind === 'jpeg' || kind === 'webp' || kind === 'avif') {
    const entry = await readExifUserComment(file)
    return { kind, entries: entry ? [entry] : [] }
  }
  return { kind, entries: [] }
}

// ===== EXIF UserComment =====

/** 8 字节字符集指示符 */
const CC_UNICODE = [0x55, 0x4e, 0x49, 0x43, 0x4f, 0x44, 0x45, 0x00]   // "UNICODE\0"
const CC_ASCII = [0x41, 0x53, 0x43, 0x49, 0x49, 0x00, 0x00, 0x00]     // "ASCII\0\0\0"
const CC_JIS = [0x4a, 0x49, 0x53, 0x00, 0x00, 0x00, 0x00, 0x00]       // "JIS\0\0\0\0\0"
const CC_UNDEFINED = [0, 0, 0, 0, 0, 0, 0, 0]

/**
 * 解码 EXIF UserComment 的原始字节。
 *
 * 必须自己解,**不能**用 exifreader 的 `.description`:它对 `UNICODE\0` 直接返回字面串
 * `'[Unicode encoded text]'`,而 A1111 走的正是这一支(见 exifreader 的 tag-names-utils)。
 *
 * 三处旧坑:
 *  1. 不看指示符 + 逐字节 `String.fromCodePoint` —— UTF-16BE 的中文提示词全成乱码,
 *     只有纯 ASCII 侥幸对(高位字节是 0x00,再被无差别剥 NUL 抹掉)。
 *  2. `.slice(7)` 是按剥完 NUL 的 `"UNICODE"` 长度硬编码的,遇到 `ASCII\0\0\0`(剥完剩 5)
 *     会吃掉正文头两个字符。
 *  3. `String.fromCodePoint(...bytes)` 逐字节展开实参,长 comment 触发 RangeError,
 *     被外层 catch 吞掉 → 整份元数据静默消失。
 *
 * 全程用 TextDecoder,不展开实参。
 */
export function decodeUserComment(bytes: Uint8Array): { text: string; status: EntryDecodeStatus } {
  // 不足 8 字节:没有指示符可言,按无指示符的文本处理
  if (bytes.length < 8) return decodeCommentText(bytes)

  const designator = bytes.slice(0, 8)
  const payload = bytes.slice(8)

  if (matches(designator, CC_UNICODE)) {
    return { text: stripTrailingNulls(decodeUtf16(payload)), status: 'ok' }
  }

  if (matches(designator, CC_JIS)) {
    // JIS X0208 需要一张码表,本 app 不带。如实报损坏,而不是吐一串乱码
    return { text: '', status: 'malformed' }
  }

  /*
   * ASCII / 未定义:先按严格 UTF-8 解。指示符写着 ASCII 但正文是 UTF-8 的构建不少
   * (piexif 的默认分支),回退 Latin-1 时把这件事记进 status —— 与 PNG 路径同口径。
   */
  if (matches(designator, CC_ASCII) || matches(designator, CC_UNDEFINED)) {
    return decodeCommentText(payload)
  }

  // 认不出的指示符:整段(含那 8 字节)当文本试,信息一点都不丢
  return decodeCommentText(bytes)
}

function matches(bytes: Uint8Array, expected: number[]): boolean {
  return expected.every((byte, i) => bytes[i] === byte)
}

function decodeCommentText(bytes: Uint8Array): { text: string; status: EntryDecodeStatus } {
  const decoded = decodeText(bytes)
  return { text: stripTrailingNulls(decoded.text), status: decoded.status }
}

/**
 * UTF-16。EXIF 规范说大端,但有 BOM 就听 BOM —— 部分 Windows 工具写小端 + BOM,
 * 按规范硬解会得到每个字都错位一格的"半个乱码",比整段乱码更难被认出来。
 */
function decodeUtf16(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.slice(2))
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.slice(2))
  }
  return new TextDecoder('utf-16be').decode(bytes)
}

/** 只剥尾部填充 NUL。旧实现无差别剥掉所有 NUL,正是 UTF-16 被解坏的原因 */
function stripTrailingNulls(text: string): string {
  return text.replace(/\0+$/, '')
}

/**
 * 读 JPEG/WebP/AVIF 的 EXIF UserComment,产出一条 `RawMetadataEntry`。
 * 只读了 UserComment 一个标签,完整 EXIF / XMP 是二期的事(查看器会明说这一点)。
 */
export async function readExifUserComment(file: Blob): Promise<RawMetadataEntry | null> {
  try {
    const ExifReader = await import('exifreader')
    // 传 ArrayBuffer 而不是 File:回补流程拿到的是库里的 Blob,没有 File 的 name/lastModified
    const data = ExifReader.load(await file.arrayBuffer()) as Record<string, { value?: unknown }>
    const value = data.UserComment?.value
    if (value === undefined || value === null) return null

    // UNDEFINED 型标签 exifreader 给字节数组;个别路径已经给了字符串
    const bytes = Array.isArray(value)
      ? new Uint8Array(value as number[])
      : new TextEncoder().encode(String(value))

    const { text, status } = decodeUserComment(bytes)
    return {
      keyword: 'UserComment',
      text,
      entryType: 'eXIf',
      byteLength: bytes.length,
      status,
    }
  } catch {
    return null
  }
}
