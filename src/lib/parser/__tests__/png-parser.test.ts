import { describe, it, expect } from 'vitest'
import { readPngTextEntries, decodeUserComment } from '../png-parser'
import { pngFile, tEXt, zTXt, iTXt, latin1Bytes, utf8Bytes } from './fixtures'

describe('readPngTextEntries', () => {
  it('读取 tEXt', async () => {
    const chunks = await readPngTextEntries(pngFile([tEXt('parameters', 'Steps: 28')]))
    expect(chunks).toHaveLength(1)
    expect(chunks[0].keyword).toBe('parameters')
    expect(chunks[0].text).toBe('Steps: 28')
  })

  it('tEXt 里的 UTF-8 中文不能乱码', async () => {
    // 写侧用 TextEncoder 产出 UTF-8 字节塞进 tEXt(与 A1111 事实标准一致),
    // 读侧若逐字节按 Latin-1 解就会乱码,而且乱码会被 MetadataEditor 存回库。
    const text = '杰作, 最高画质, 1girl\nNegative prompt: 低分辨率\nSteps: 28'
    const chunks = await readPngTextEntries(pngFile([tEXt('parameters', text, 'utf8')]))
    expect(chunks[0].text).toBe(text)
  })

  it('tEXt 里真正的 Latin-1 正文仍要能读', async () => {
    // 老工具产出的确实是 Latin-1。严格 UTF-8 解码会抛错,此时必须回退而不是丢内容。
    const text = 'café naïve résumé'
    const chunks = await readPngTextEntries(pngFile([tEXt('parameters', text, 'latin1')]))
    expect(chunks[0].text).toBe(text)
  })

  it('读取 zTXt(压缩文本块)', async () => {
    const text = 'masterpiece\nNegative prompt: lowres\nSteps: 28, Sampler: Euler a'
    const chunks = await readPngTextEntries(pngFile([zTXt('parameters', text)]))
    expect(chunks).toHaveLength(1)
    expect(chunks[0].keyword).toBe('parameters')
    expect(chunks[0].text).toBe(text)
  })

  it('读取未压缩 iTXt', async () => {
    const chunks = await readPngTextEntries(
      pngFile([iTXt('Comment', '{"steps":28}', { languageTag: 'en', translatedKeyword: '注释' })])
    )
    expect(chunks).toHaveLength(1)
    expect(chunks[0].keyword).toBe('Comment')
    expect(chunks[0].text).toBe('{"steps":28}')
  })

  it('读取压缩 iTXt(compression flag = 1)', async () => {
    // 旧实现不看压缩标志,直接 textStart += 2 跳过去,于是把 deflate 原始字节
    // 喂给 TextDecoder —— 输出乱码而且不报错,是最难发现的一类丢数据。
    const text = '{"prompt":"1girl","steps":28}'
    const chunks = await readPngTextEntries(pngFile([iTXt('Comment', text, { compressed: true })]))
    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toBe(text)
  })

  it('三种文本块混在一张图里都要读到', async () => {
    const chunks = await readPngTextEntries(
      pngFile([
        tEXt('Description', '1girl'),
        zTXt('Comment', '{"steps":28}'),
        iTXt('Software', 'NovelAI', { compressed: true }),
      ])
    )
    expect(chunks.map(c => c.keyword)).toEqual(['Description', 'Comment', 'Software'])
    expect(chunks.map(c => c.text)).toEqual(['1girl', '{"steps":28}', 'NovelAI'])
  })

  it('单个畸形 chunk 不能让整张图解析失败', async () => {
    /*
     * 正文里内嵌 NUL 的 tEXt 会让 png-chunk-text 抛 "Invalid NULL character found",
     * 而旧实现的 decode 在守卫 extractChunks 的 try 之外,异常一路冒到导入流程,
     * 整张图变成 failedCount++ 被静默跳过 —— 一个坏块毁掉一整张图。
     */
    const chunks = await readPngTextEntries(
      pngFile([
        { name: 'tEXt', data: new Uint8Array([...latin1Bytes('broken'), 0, ...utf8Bytes('a'), 0, ...utf8Bytes('b')]) },
        tEXt('parameters', 'Steps: 28'),
      ])
    )
    expect(chunks.find(c => c.keyword === 'parameters')?.text).toBe('Steps: 28')
  })

  it('非 PNG 字节返回空数组而不是抛错', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'not-a.png', { type: 'image/png' })
    await expect(readPngTextEntries(file)).resolves.toEqual([])
  })

  it('无文本块的 PNG 返回空数组', async () => {
    await expect(readPngTextEntries(pngFile([]))).resolves.toEqual([])
  })
})

/*
 * EXIF UserComment 直接喂字节,不手搓完整 JPEG —— 要验的是解码分支本身。
 * `decodeUserComment` 是 JPEG / WebP / AVIF 那条路上唯一的文本来源。
 */
function designator(text: string): number[] {
  const bytes = [...text].map(ch => ch.charCodeAt(0))
  while (bytes.length < 8) bytes.push(0)
  return bytes.slice(0, 8)
}

function utf16beBytes(text: string): number[] {
  const out: number[] = []
  for (const unit of text) {
    const code = unit.codePointAt(0)!
    if (code > 0xffff) {
      // 代理对:高位在前
      const high = 0xd800 + ((code - 0x10000) >> 10)
      const low = 0xdc00 + ((code - 0x10000) & 0x3ff)
      out.push(high >> 8, high & 0xff, low >> 8, low & 0xff)
    } else {
      out.push(code >> 8, code & 0xff)
    }
  }
  return out
}

describe('decodeUserComment', () => {
  it('UNICODE\\0 + UTF-16BE 的中文提示词不能乱码', () => {
    // A1111 走的正是这一支。旧实现逐字节 fromCodePoint,中文全成乱码
    const text = '杰作, 最高画质, 1girl'
    const bytes = new Uint8Array([...designator('UNICODE'), ...utf16beBytes(text)])
    expect(decodeUserComment(bytes)).toEqual({ text, status: 'ok' })
  })

  it('UNICODE\\0 带 BOM 的小端也要按 BOM 解', () => {
    const text = '低分辨率'
    const le: number[] = [0xff, 0xfe]
    for (const ch of text) {
      const code = ch.charCodeAt(0)
      le.push(code & 0xff, code >> 8)
    }
    expect(decodeUserComment(new Uint8Array([...designator('UNICODE'), ...le])).text).toBe(text)
  })

  it('ASCII\\0\\0\\0 但正文是 UTF-8 时要解得出中文', () => {
    // piexif 的默认分支会这么写。严格 UTF-8 先行,所以这里 status 仍是 ok
    const text = '杰作, 1girl'
    const bytes = new Uint8Array([...designator('ASCII'), ...utf8Bytes(text)])
    expect(decodeUserComment(bytes)).toEqual({ text, status: 'ok' })
  })

  it('ASCII\\0\\0\\0 的纯 ASCII 正文头两个字符不能被吃掉', () => {
    // 旧实现的 `.slice(7)` 是按剥完 NUL 的 "UNICODE" 长度硬编码的
    const text = 'Steps: 28, Sampler: Euler a'
    const bytes = new Uint8Array([...designator('ASCII'), ...utf8Bytes(text)])
    expect(decodeUserComment(bytes).text).toBe(text)
  })

  it('真正的 Latin-1 正文回退解码,并把回退记进 status', () => {
    const text = 'café naïve'
    const bytes = new Uint8Array([...designator('ASCII'), ...latin1Bytes(text)])
    expect(decodeUserComment(bytes)).toEqual({ text, status: 'encoding-fallback' })
  })

  it('尾部填充 NUL 剥掉,正文内部不动', () => {
    const bytes = new Uint8Array([...designator('ASCII'), ...utf8Bytes('Steps: 28'), 0, 0, 0])
    expect(decodeUserComment(bytes).text).toBe('Steps: 28')
  })

  it('JIS 指示符如实报 malformed,而不是吐乱码', () => {
    const bytes = new Uint8Array([...designator('JIS'), 0x82, 0xa0, 0x82, 0xa2])
    expect(decodeUserComment(bytes)).toEqual({ text: '', status: 'malformed' })
  })

  it('超长 payload 不得抛 RangeError', () => {
    // 旧实现 String.fromCodePoint(...bytes) 逐字节展开实参,长 comment 直接爆栈,
    // 异常被外层 catch 吞掉 → 整份元数据静默消失
    const text = 'a'.repeat(300_000)
    const bytes = new Uint8Array([...designator('ASCII'), ...utf8Bytes(text)])
    expect(() => decodeUserComment(bytes)).not.toThrow()
    expect(decodeUserComment(bytes).text).toHaveLength(300_000)
  })

  it('认不出的指示符把整段(含那 8 字节)当文本试', () => {
    const bytes = utf8Bytes('Steps: 28, Sampler: Euler a')
    expect(decodeUserComment(bytes).text).toBe('Steps: 28, Sampler: Euler a')
  })

  it('不足 8 字节也不越界', () => {
    expect(decodeUserComment(utf8Bytes('hi')).text).toBe('hi')
    expect(decodeUserComment(new Uint8Array(0)).text).toBe('')
  })
})
