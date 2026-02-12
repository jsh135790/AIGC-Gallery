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
 * Decode an iTXt chunk, handling the NovelAI Description format.
 */
function decodeITXtChunk(data: Uint8Array): PngTextChunk {
  const filtered = data.filter(x => x !== 0x00)
  const header = new TextDecoder().decode(filtered.slice(0, 11))

  if (header === 'Description') {
    const text = new TextDecoder().decode(filtered.slice(11))
    return { keyword: 'Description', text }
  }

  const text = new TextDecoder().decode(filtered)
  return { keyword: 'Unknown', text }
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
