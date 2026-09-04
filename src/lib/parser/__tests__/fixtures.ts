import encode from 'png-chunks-encode'
import pako from 'pako'

/*
 * 现造 PNG fixture,不往仓库里塞二进制。
 *
 * 一张最小合法 PNG = 签名 + IHDR + IDAT + IEND,png-chunks-encode 负责签名与 CRC。
 * 之所以要自己拼:测试要覆盖的正是"读取器对不同 chunk 类型 / 压缩标志 / 文本编码
 * 的处理",这些差异没法靠现成图片稳定复现。
 */

export interface ChunkLike {
  name: string
  data: Uint8Array
}

function u32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]
}

/** 1x1 RGBA,足够让任何 PNG 解析器认为这是张真图 */
function ihdr(): ChunkLike {
  return {
    name: 'IHDR',
    data: new Uint8Array([...u32(1), ...u32(1), 8, 6, 0, 0, 0]),
  }
}

function idat(): ChunkLike {
  // 一行扫描线:过滤器字节 0 + RGBA 四字节
  return { name: 'IDAT', data: pako.deflate(new Uint8Array([0, 0, 0, 0, 0])) }
}

export function latin1Bytes(text: string): Uint8Array {
  return Uint8Array.from([...text].map(ch => ch.charCodeAt(0) & 0xff))
}

export function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function concat(...parts: Array<Uint8Array | number[]>): Uint8Array {
  const arrays = parts.map(part => (part instanceof Uint8Array ? part : new Uint8Array(part)))
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

/** tEXt: `keyword\0text`。encoding 决定正文字节,用来复现读写编码不对称 */
export function tEXt(keyword: string, text: string, encoding: 'utf8' | 'latin1' = 'utf8'): ChunkLike {
  const body = encoding === 'utf8' ? utf8Bytes(text) : latin1Bytes(text)
  return { name: 'tEXt', data: concat(latin1Bytes(keyword), [0], body) }
}

/** zTXt: `keyword\0` + 压缩方法(1) + zlib 正文 */
export function zTXt(keyword: string, text: string): ChunkLike {
  return { name: 'zTXt', data: concat(latin1Bytes(keyword), [0, 0], pako.deflate(utf8Bytes(text))) }
}

/**
 * iTXt: `keyword\0` + 压缩标志(1) + 压缩方法(1) + `语言标签\0` + `翻译关键字\0` + 正文
 * 正文在 compressed 时是 zlib 流。
 */
export function iTXt(
  keyword: string,
  text: string,
  options: { compressed?: boolean; languageTag?: string; translatedKeyword?: string } = {}
): ChunkLike {
  const { compressed = false, languageTag = '', translatedKeyword = '' } = options
  const body = compressed ? pako.deflate(utf8Bytes(text)) : utf8Bytes(text)
  return {
    name: 'iTXt',
    data: concat(
      latin1Bytes(keyword),
      [0, compressed ? 1 : 0, 0],
      latin1Bytes(languageTag),
      [0],
      utf8Bytes(translatedKeyword),
      [0],
      body
    ),
  }
}

/** 把文本 chunk 夹进 IHDR / IDAT / IEND 之间,产出可交给解析器的字节 */
export function pngBytes(textChunks: ChunkLike[]): Uint8Array<ArrayBuffer> {
  const encoded = encode([ihdr(), ...textChunks, idat(), { name: 'IEND', data: new Uint8Array(0) }])
  // png-chunks-encode 无类型声明,过一遍 from 拿到确定持有 ArrayBuffer 的视图
  return Uint8Array.from(encoded as Iterable<number>)
}

/**
 * 造 File。注意第三个参数刻意可省:`type` 为空正是需要覆盖的场景之一
 * (某些拖拽源不带 MIME,旧实现会因此一个字段都不解析)。
 */
export function pngFile(textChunks: ChunkLike[], name = 'fixture.png', type = 'image/png'): File {
  return new File([pngBytes(textChunks)], name, type ? { type } : {})
}

export function pngBlob(textChunks: ChunkLike[]): Blob {
  return new Blob([pngBytes(textChunks)], { type: 'image/png' })
}

// ===== 常用样本 =====

/** A1111 的 parameters 文本。prompt 换行 + Negative prompt 行 + Steps 参数行 */
export function sdParametersText(options: {
  prompt?: string
  negative?: string
  tail?: string
} = {}): string {
  const {
    prompt = 'masterpiece, best quality, 1girl',
    negative = 'lowres, bad anatomy',
    tail = 'Steps: 28, Sampler: DPM++ 2M Karras, CFG scale: 7, Seed: 12345, Size: 832x1216, Model hash: abc123, Model: someModel, Version: v1.9.4',
  } = options
  return `${prompt}\nNegative prompt: ${negative}\n${tail}`
}

/** NAI Comment JSON。extra 用来验证白名单之外的键是否被透传 */
export function naiCommentJson(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    prompt: '1girl, best quality',
    uc: 'lowres',
    steps: 28,
    sampler: 'k_euler_ancestral',
    scale: 5,
    seed: 987654321,
    width: 832,
    height: 1216,
    noise_schedule: 'karras',
    ...extra,
  })
}

/** 编辑痕迹 chunk 的内容,形状跟 png-writer 的 createTraceChunk 一致 */
export function traceChunkText(): string {
  return JSON.stringify({ editedAt: new Date().toISOString(), tool: 'AIGC Gallery 2.0.0' })
}
