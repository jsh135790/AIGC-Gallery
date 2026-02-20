import extractChunks from 'png-chunks-extract'
import { decode as decodeTextChunk } from 'png-chunk-text'
import type { PngTextChunk } from '@/types'

/**
 * Extract text chunks (tEXt / iTXt) from a PNG file buffer.
 */
export async function extractPngTextChunks(file: File): Promise<PngTextChunk[]> {
  const buffer = await file.arrayBuffer()
  let chunks: Array<{ name: string; data: Uint8Array }>

  try {
    chunks = extractChunks(new Uint8Array(buffer))
  } catch {
    return []
  }

  const textChunks = chunks
    .filter(chunk => chunk.name === 'tEXt' || chunk.name === 'iTXt')
    .map(chunk => {
      if (chunk.name === 'iTXt') {
        return decodeITXtChunk(chunk.data)
      } else {
        return decodeTextChunk(chunk.data)
      }
    })

  return textChunks
}

/**
 * Decode an iTXt chunk, properly extracting the keyword.
 * iTXt format: keyword\0compression_flag\0compression_method\0language_tag\0translated_keyword\0text
 */
function decodeITXtChunk(data: Uint8Array): PngTextChunk {
  // Find the first null byte (end of keyword)
  let keywordEnd = 0
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0x00) {
      keywordEnd = i
      break
    }
  }

  const keyword = new TextDecoder().decode(data.slice(0, keywordEnd))

  // Skip: keyword\0 + compression_flag(1) + compression_method(1) + language_tag\0 + translated_keyword\0
  let textStart = keywordEnd + 1

  // Skip compression flag and method (2 bytes)
  textStart += 2

  // Skip language tag (find next null)
  while (textStart < data.length && data[textStart] !== 0x00) {
    textStart++
  }
  textStart++ // skip the null

  // Skip translated keyword (find next null)
  while (textStart < data.length && data[textStart] !== 0x00) {
    textStart++
  }
  textStart++ // skip the null

  const text = new TextDecoder().decode(data.slice(textStart))

  return { keyword, text }
}

/**
 * Read EXIF UserComment from JPEG/WebP files using ExifReader.
 */
export async function extractExifMetadata(file: File): Promise<string | null> {
  try {
    const ExifReader = await import('exifreader')
    const data = await ExifReader.load(file) as Record<string, { value?: unknown }>
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
