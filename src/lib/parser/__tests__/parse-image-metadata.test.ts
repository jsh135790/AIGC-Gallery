import { describe, it, expect } from 'vitest'
import { parseImageMetadata } from '../index'
import { pngFile, tEXt, zTXt, iTXt, sdParametersText, naiCommentJson, traceChunkText } from './fixtures'

describe('parseImageMetadata — 格式识别', () => {
  it('MIME 为空的 PNG 也要解析(靠魔数而不是 file.type)', async () => {
    // 某些拖拽源不带 MIME。旧实现只看 file.type,于是整张图一个字段都不解析。
    const file = pngFile([tEXt('parameters', sdParametersText())], 'dropped.png', '')
    expect(file.type).toBe('')
    const result = await parseImageMetadata(file)
    expect(result.source).toBe('sd')
    expect(result.parameters.steps).toBe(28)
  })

  it('MIME 谎报成 jpeg 的 PNG 仍按 PNG 解析', async () => {
    const result = await parseImageMetadata(
      pngFile([tEXt('parameters', sdParametersText())], 'mislabeled.png', 'image/jpeg')
    )
    expect(result.source).toBe('sd')
  })

  it('无任何元数据的 PNG 返回 unknown 而不抛错', async () => {
    const result = await parseImageMetadata(pngFile([]))
    expect(result.source).toBe('unknown')
    expect(result.prompt).toBe('')
  })
})

describe('parseImageMetadata — SD WebUI', () => {
  it('识别 tEXt 承载的 parameters', async () => {
    const result = await parseImageMetadata(pngFile([tEXt('parameters', sdParametersText())]))
    expect(result.source).toBe('sd')
    expect(result.prompt).toBe('masterpiece, best quality, 1girl')
    expect(result.negativePrompt).toBe('lowres, bad anatomy')
    expect(result.parameters.steps).toBe(28)
    // seed 刻意保持字符串:种子可以超出安全整数范围,sd-parser 的 NUMERIC_FIELDS 不含它
    expect(result.parameters.seed).toBe('12345')
    // 未映射键必须原样透传
    expect(result.parameters['Model hash']).toBe('abc123')
    expect(result.parameters['Version']).toBe('v1.9.4')
  })

  it('识别 zTXt 承载的 parameters', async () => {
    const result = await parseImageMetadata(pngFile([zTXt('parameters', sdParametersText())]))
    expect(result.source).toBe('sd')
    expect(result.parameters.steps).toBe(28)
  })

  it('本 app 导出过的 SD PNG(parameters + 追踪 chunk)不能掉进拼接兜底', async () => {
    /*
     * 写侧每次都追加 aigc-gallery chunk,读侧的干净分支却要求 chunks.length === 1。
     * 于是自家导出的图重新导入时走 join 兜底,rawText 混入追踪 JSON,并成为下一次
     * SD replay 的基准,逐次放大。
     */
    const params = sdParametersText()
    const result = await parseImageMetadata(
      pngFile([tEXt('parameters', params), tEXt('aigc-gallery', traceChunkText())])
    )
    expect(result.source).toBe('sd')
    expect(result.rawText).toBe(params)
    expect(result.rawText).not.toContain('editedAt')
    expect(result.prompt).toBe('masterpiece, best quality, 1girl')
    expect(result.parameters['Version']).toBe('v1.9.4')
    // 追踪 chunk 本身不该冒充参数
    expect(result.parameters['editedAt']).toBeUndefined()
    expect(result.parameters['tool']).toBeUndefined()
  })

  it('中文 prompt 的 parameters 不乱码', async () => {
    const params = sdParametersText({ prompt: '杰作, 最高画质', negative: '低分辨率, 手崩' })
    const result = await parseImageMetadata(pngFile([tEXt('parameters', params, 'utf8')]))
    expect(result.prompt).toBe('杰作, 最高画质')
    expect(result.negativePrompt).toBe('低分辨率, 手崩')
  })
})

describe('parseImageMetadata — NovelAI', () => {
  it('已知键归一化', async () => {
    const result = await parseImageMetadata(
      pngFile([tEXt('Description', '1girl, best quality'), tEXt('Comment', naiCommentJson())])
    )
    expect(result.source).toBe('nai')
    expect(result.prompt).toBe('1girl, best quality')
    expect(result.negativePrompt).toBe('lowres')
    expect(result.parameters.cfgScale).toBe(5)
    expect(result.parameters.size).toBe('832x1216')
    // 归一化后不能与原始键并列出现
    expect(result.parameters['scale']).toBeUndefined()
    expect(result.parameters['width']).toBeUndefined()
  })

  it('白名单之外的 Comment 键要透传进 parameters', async () => {
    // 这才是"字段改名/新增时自动跟上"的落点:展示层已经在遍历 parameters,
    // 卡住的是解析器只放 11 个键进去。
    const result = await parseImageMetadata(
      pngFile([
        tEXt('Description', '1girl'),
        tEXt('Comment', naiCommentJson({ skip_cfg_above_sigma: 19, dynamic_thresholding: false, v4_model_preset: 'artistic' })),
      ])
    )
    expect(result.parameters['skip_cfg_above_sigma']).toBe(19)
    expect(result.parameters['dynamic_thresholding']).toBe(false)
    expect(result.parameters['v4_model_preset']).toBe('artistic')
  })

  it('Title / Software 这两个独立 chunk 不再丢弃', async () => {
    const result = await parseImageMetadata(
      pngFile([
        tEXt('Title', 'AI generated image'),
        tEXt('Software', 'NovelAI'),
        tEXt('Description', '1girl'),
        tEXt('Comment', naiCommentJson()),
      ])
    )
    expect(result.parameters['title']).toBe('AI generated image')
    expect(result.parameters['software']).toBe('NovelAI')
  })

  it('Comment 存成压缩 iTXt 时同样能解析', async () => {
    const result = await parseImageMetadata(
      pngFile([tEXt('Description', '1girl'), iTXt('Comment', naiCommentJson(), { compressed: true })])
    )
    expect(result.source).toBe('nai')
    expect(result.parameters.steps).toBe(28)
  })
})
