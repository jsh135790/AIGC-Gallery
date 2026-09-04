import { describe, it, expect } from 'vitest'
import { extractPngTextChunks } from '../png-parser'
import { pngFile, tEXt, zTXt, iTXt, latin1Bytes, utf8Bytes } from './fixtures'

describe('extractPngTextChunks', () => {
  it('读取 tEXt', async () => {
    const chunks = await extractPngTextChunks(pngFile([tEXt('parameters', 'Steps: 28')]))
    expect(chunks).toHaveLength(1)
    expect(chunks[0].keyword).toBe('parameters')
    expect(chunks[0].text).toBe('Steps: 28')
  })

  it('tEXt 里的 UTF-8 中文不能乱码', async () => {
    // 写侧用 TextEncoder 产出 UTF-8 字节塞进 tEXt(与 A1111 事实标准一致),
    // 读侧若逐字节按 Latin-1 解就会乱码,而且乱码会被 MetadataEditor 存回库。
    const text = '杰作, 最高画质, 1girl\nNegative prompt: 低分辨率\nSteps: 28'
    const chunks = await extractPngTextChunks(pngFile([tEXt('parameters', text, 'utf8')]))
    expect(chunks[0].text).toBe(text)
  })

  it('tEXt 里真正的 Latin-1 正文仍要能读', async () => {
    // 老工具产出的确实是 Latin-1。严格 UTF-8 解码会抛错,此时必须回退而不是丢内容。
    const text = 'café naïve résumé'
    const chunks = await extractPngTextChunks(pngFile([tEXt('parameters', text, 'latin1')]))
    expect(chunks[0].text).toBe(text)
  })

  it('读取 zTXt(压缩文本块)', async () => {
    const text = 'masterpiece\nNegative prompt: lowres\nSteps: 28, Sampler: Euler a'
    const chunks = await extractPngTextChunks(pngFile([zTXt('parameters', text)]))
    expect(chunks).toHaveLength(1)
    expect(chunks[0].keyword).toBe('parameters')
    expect(chunks[0].text).toBe(text)
  })

  it('读取未压缩 iTXt', async () => {
    const chunks = await extractPngTextChunks(
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
    const chunks = await extractPngTextChunks(pngFile([iTXt('Comment', text, { compressed: true })]))
    expect(chunks).toHaveLength(1)
    expect(chunks[0].text).toBe(text)
  })

  it('三种文本块混在一张图里都要读到', async () => {
    const chunks = await extractPngTextChunks(
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
    const chunks = await extractPngTextChunks(
      pngFile([
        { name: 'tEXt', data: new Uint8Array([...latin1Bytes('broken'), 0, ...utf8Bytes('a'), 0, ...utf8Bytes('b')]) },
        tEXt('parameters', 'Steps: 28'),
      ])
    )
    expect(chunks.find(c => c.keyword === 'parameters')?.text).toBe('Steps: 28')
  })

  it('非 PNG 字节返回空数组而不是抛错', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'not-a.png', { type: 'image/png' })
    await expect(extractPngTextChunks(file)).resolves.toEqual([])
  })

  it('无文本块的 PNG 返回空数组', async () => {
    await expect(extractPngTextChunks(pngFile([]))).resolves.toEqual([])
  })
})
