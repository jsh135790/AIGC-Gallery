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
  let chunks: Array<{ name: string; data: Uint8Array }>

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

/** 兼容旧调用点的别名。返回值结构上仍是 PngTextChunk[] */
export const extractPngTextChunks = readPngTextEntries

/** 按魔数分容器读取原始条目。目前只有 PNG 有条目级读取 */
export async function readMetadataContainer(file: Blob): Promise<MetadataContainer> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const kind = sniffContainer(head)
  if (kind !== 'png') return { kind, entries: [] }
  return { kind, entries: await readPngTextEntries(file) }
}

/**
 * Read EXIF UserComment from JPEG/WebP/AVIF files using ExifReader.
 * 只读了 UserComment 一个标签,完整 EXIF / XMP 是二期的事。
 */
export async function extractExifMetadata(file: Blob): Promise<string | null> {
  try {
    const ExifReader = await import('exifreader')
    // 传 ArrayBuffer 而不是 File:回补流程拿到的是库里的 Blob,没有 File 的 name/lastModified
    const data = ExifReader.load(await file.arrayBuffer()) as Record<string, { value?: unknown }>
    if (data.UserComment?.value) {
      return String.fromCodePoint(...(data.UserComment.value as number[]))
        .replace(/\x00/g, '')
        .slice(7) // Skip "UNICODE" prefix
    }
    return null
  } catch {
    return null
  }
}
