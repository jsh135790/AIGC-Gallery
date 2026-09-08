import { describe, expect, it } from 'vitest'
import { isAutoPosition } from '../fields'
import { formatCoordinates } from '../../format'
import { parseImageMetadata } from '../index'
import { writePNGMetadata } from '../png-writer'
import { naiCommentJson, pngFile, tEXt } from './fixtures'

describe('角色位置', () => {
  it.each([0.5, 0.25, 0.123456789, 0.000001, 1])('保留坐标 %s 的精度', value => {
    const centers = [{ x: value, y: value }]
    expect(formatCoordinates(centers)).toBe(`(${value}, ${value})`)
    expect(isAutoPosition(centers)).toBe(false)
  })

  it('只有单个零坐标表示自动位置', () => {
    expect(isAutoPosition([{ x: 0, y: 0 }])).toBe(true)
    expect(isAutoPosition([{ x: 0, y: 0.25 }])).toBe(false)
    expect(isAutoPosition([{ x: 0.25, y: 0 }])).toBe(false)
    expect(isAutoPosition([])).toBe(false)
    expect(isAutoPosition([{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }])).toBe(false)
    expect(formatCoordinates([])).toBe('')
    expect(formatCoordinates([{ x: 0, y: 0 }, { x: 0.25, y: 0.5 }])).toBe('(0, 0) (0.25, 0.5)')
  })

  it('未启用 use_coords 时仍读取小数位置，编辑角色提示词不改变正负坐标', async () => {
    const centers = [{ x: 0.5, y: 0.5 }, { x: 0.25, y: 0.123456789 }]
    const block = (prompt: string) => ({
      use_coords: false,
      caption: { base_caption: '', char_captions: [{ char_caption: prompt, centers }] },
    })
    const file = pngFile([tEXt('Comment', naiCommentJson({
      v4_prompt: block('character'),
      v4_negative_prompt: block('negative'),
    }))])
    const parsed = await parseImageMetadata(file)
    expect(parsed.v4Data?.useCoords).toBe(false)
    expect(parsed.v4Data?.characters[0].centers).toEqual(centers)
    parsed.v4Data!.characters[0].prompt = 'new character prompt'
    parsed.v4Data!.characters[0].negative = 'new character negative'
    const written = await writePNGMetadata(file, parsed, 'nai')
    const after = await parseImageMetadata(written)
    const comment = JSON.parse(after.rawText)
    expect(after.v4Data?.characters[0].centers).toEqual(centers)
    expect(comment.v4_prompt.caption.char_captions[0]).toEqual({ char_caption: 'new character prompt', centers })
    expect(comment.v4_negative_prompt.caption.char_captions[0]).toEqual({ char_caption: 'new character negative', centers })
    expect(comment.v4_prompt.use_coords).toBe(false)
  })
})
