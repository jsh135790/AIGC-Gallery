import { extractPngTextChunks, extractExifMetadata } from './png-parser'
import { parseSDWebUI } from './sd-parser'
import { parseNovelAI, parseNovelAIStealth, extractStealthPng } from './nai-parser'
import { getTagsFromPrompt } from './tag-analyzer'
import type { ParsedMetadata, PngTextChunk } from '@/types'

export { getTagsFromPrompt, analyzeTags, extractTags } from './tag-analyzer'
export type { AnalyzedTag, TagCategory } from './tag-analyzer'

/**
 * Main entry point: parse an image file and extract all metadata.
 * Supports PNG (SD-WebUI, NovelAI, Stealth PNG) and JPEG/WebP (EXIF).
 */
export async function parseImageMetadata(
  file: File,
  imageSrc?: string
): Promise<ParsedMetadata> {
  const fileType = file.type

  if (fileType === 'image/png') {
    return parsePngMetadata(file, imageSrc)
  } else if (
    fileType === 'image/jpeg' ||
    fileType === 'image/webp' ||
    fileType === 'image/avif'
  ) {
    return parseExifMetadata(file)
  }

  return unknownResult()
}

async function parsePngMetadata(file: File, imageSrc?: string): Promise<ParsedMetadata> {
  const chunks: PngTextChunk[] = await extractPngTextChunks(file)

  if (chunks.length === 0) {
    // No standard metadata -- try Stealth PNG (NovelAI hidden metadata)
    if (imageSrc) {
      const stealthData = await extractStealthPng(imageSrc)
      if (stealthData) {
        return parseNovelAIStealth(stealthData)
      }
    }
    return unknownResult()
  }

  // Single chunk with "parameters" keyword → SD-WebUI format
  if (chunks.length === 1 && chunks[0].keyword === 'parameters') {
    return parseSDWebUI(chunks[0].text)
  }

  // If there's a Description or Comment chunk → likely NovelAI
  const hasDescription = chunks.some(c => c.keyword === 'Description')
  const hasComment = chunks.some(c => c.keyword === 'Comment')
  if (hasDescription || hasComment) {
    return parseNovelAI(chunks)
  }

  // Single chunk with other keyword that looks like SD format (contains "Steps:")
  if (chunks.length === 1 && chunks[0].text.includes('Steps:')) {
    return parseSDWebUI(chunks[0].text)
  }

  // Fallback: try SD-WebUI parse on concatenated text
  const allText = chunks.map(c => c.text).join('\n')
  if (allText.includes('Steps:')) {
    return parseSDWebUI(allText)
  }

  return unknownResult(allText)
}

async function parseExifMetadata(file: File): Promise<ParsedMetadata> {
  const metadata = await extractExifMetadata(file)
  if (metadata && metadata.includes('Steps:')) {
    return parseSDWebUI(metadata)
  }
  if (metadata) {
    return { source: 'unknown', prompt: metadata, negativePrompt: '', parameters: {}, rawText: metadata }
  }
  return unknownResult()
}

function unknownResult(rawText = ''): ParsedMetadata {
  return {
    source: 'unknown',
    prompt: '',
    negativePrompt: '',
    parameters: {},
    rawText,
  }
}

/**
 * Generate a thumbnail blob from an image file using Canvas.
 */
export async function generateThumbnail(file: File, maxWidth = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio = maxWidth / img.width
      const width = img.width > maxWidth ? maxWidth : img.width
      const height = img.width > maxWidth ? Math.round(img.height * ratio) : img.height

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (blob) resolve(blob)
          else reject(new Error('Failed to generate thumbnail'))
        },
        'image/webp',
        0.8
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}
