import { describe, it, expect } from 'vitest'
import { parseImageMetadata } from '../index'
import { writePNGMetadata } from '../png-writer'
import { pngFile, pngBlob, tEXt, sdParametersText, naiCommentJson, traceChunkText } from './fixtures'

/** 写出去再读回来 —— 这是全仓库唯一能证明"导出无损"的手段 */
async function roundTrip(chunks: Parameters<typeof pngFile>[0], edit?: (m: Awaited<ReturnType<typeof parseImageMetadata>>) => void) {
  const blob = pngBlob(chunks)
  const before = await parseImageMetadata(pngFile(chunks))
  edit?.(before)
  const written = await writePNGMetadata(blob, before, before.source)
  const after = await parseImageMetadata(new File([await written.arrayBuffer()], 'out.png', { type: 'image/png' }))
  return { before, after, written }
}

describe('往返保真 — SD WebUI', () => {
  it('不改任何字段时,解析 → 写入 → 再解析恒等', async () => {
    const { before, after } = await roundTrip([tEXt('parameters', sdParametersText())])
    expect(after.source).toBe('sd')
    expect(after.prompt).toBe(before.prompt)
    expect(after.negativePrompt).toBe(before.negativePrompt)
    expect(after.rawText).toBe(before.rawText)
    expect(after.parameters).toEqual(before.parameters)
  })

  it('中文 prompt 往返不乱码', async () => {
    const params = sdParametersText({ prompt: '杰作, 最高画质, 少女', negative: '低分辨率, 多余的手指' })
    const { after } = await roundTrip([tEXt('parameters', params, 'utf8')])
    expect(after.prompt).toBe('杰作, 最高画质, 少女')
    expect(after.negativePrompt).toBe('低分辨率, 多余的手指')
  })

  it('改 prompt 后其余键的顺序与拼写不变', async () => {
    const { after } = await roundTrip([tEXt('parameters', sdParametersText())], m => {
      m.prompt = 'a totally new prompt'
    })
    expect(after.prompt).toBe('a totally new prompt')
    expect(after.parameters['Model hash']).toBe('abc123')
    expect(after.parameters['Version']).toBe('v1.9.4')
    const paramLine = after.rawText.split('\n').find(line => line.startsWith('Steps:'))
    expect(paramLine).toBe(sdParametersText().split('\n')[2])
  })

  it('反复导出不累加追踪 chunk,也不放大污染', async () => {
    const params = sdParametersText()
    let blob = pngBlob([tEXt('parameters', params)])
    let parsed = await parseImageMetadata(pngFile([tEXt('parameters', params)]))

    for (let i = 0; i < 3; i++) {
      const written = await writePNGMetadata(blob, parsed, 'sd')
      blob = written
      parsed = await parseImageMetadata(new File([await written.arrayBuffer()], `pass-${i}.png`, { type: 'image/png' }))
      expect(parsed.rawText).toBe(params)
      expect(parsed.rawText).not.toContain('editedAt')
    }
  })

  it('原图已带追踪 chunk 时,往返依然干净', async () => {
    const params = sdParametersText()
    const { after } = await roundTrip([tEXt('parameters', params), tEXt('aigc-gallery', traceChunkText())])
    expect(after.rawText).toBe(params)
  })
})

describe('往返保真 — NovelAI', () => {
  it('Comment 里白名单之外的键写回后仍在', async () => {
    const comment = naiCommentJson({ skip_cfg_above_sigma: 19, noise: 0.1 })
    const { after } = await roundTrip([tEXt('Description', '1girl'), tEXt('Comment', comment)])
    expect(after.source).toBe('nai')
    expect(after.parameters['skip_cfg_above_sigma']).toBe(19)
    expect(after.parameters['noise']).toBe(0.1)
  })

  it('改 negative 后 Comment 其余字段不丢', async () => {
    const comment = naiCommentJson({ skip_cfg_above_sigma: 19 })
    const { after } = await roundTrip([tEXt('Description', '1girl'), tEXt('Comment', comment)], m => {
      m.negativePrompt = 'brand new uc'
    })
    expect(after.negativePrompt).toBe('brand new uc')
    expect(after.parameters['skip_cfg_above_sigma']).toBe(19)
    expect(after.parameters.steps).toBe(28)
    expect(JSON.parse(after.rawText).noise_schedule).toBe('karras')
  })

  it('中文 prompt 往返不乱码', async () => {
    const { after } = await roundTrip(
      [tEXt('Description', '少女, 最高画质'), tEXt('Comment', naiCommentJson())],
      m => { m.prompt = '少女, 最高画质, 侧脸' }
    )
    expect(after.prompt).toBe('少女, 最高画质, 侧脸')
  })
})
