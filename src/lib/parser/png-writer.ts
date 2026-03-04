import extract from 'png-chunks-extract'
import encode from 'png-chunks-encode'
import text from 'png-chunk-text'
import type { ParsedMetadata, ImageSource } from '@/types'

/**
 * Create a tEXt chunk manually
 */
function createTextChunk(keyword: string, content: string): any {
  const keywordBytes = new TextEncoder().encode(keyword)
  const contentBytes = new TextEncoder().encode(content)
  const data = new Uint8Array(keywordBytes.length + 1 + contentBytes.length)
  data.set(keywordBytes, 0)
  data[keywordBytes.length] = 0 // null separator
  data.set(contentBytes, keywordBytes.length + 1)

  return {
    name: 'tEXt',
    data: data
  }
}

/**
 * Write metadata back to PNG image
 * @param imageBlob Original PNG image blob
 * @param metadata Metadata to write
 * @param source Image source type (sd or nai)
 * @returns New PNG blob with updated metadata
 */
export async function writePNGMetadata(
  imageBlob: Blob,
  metadata: ParsedMetadata,
  source: ImageSource
): Promise<Blob> {
  // Read original PNG as ArrayBuffer
  const arrayBuffer = await imageBlob.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  // Extract all chunks
  const chunks = extract(uint8Array)

  // Remove old metadata chunks
  const filteredChunks = chunks.filter((chunk) => {
    const name = chunk.name
    if (source === 'sd') {
      return name !== 'tEXt' || !isSDParametersChunk(chunk.data)
    } else if (source === 'nai') {
      return name !== 'tEXt' || !isNAIChunk(chunk.data)
    }
    return true
  })

  // Create new metadata chunks based on source
  let newChunks: any[] = []
  if (source === 'sd') {
    newChunks = encodeSDMetadata(metadata)
  } else if (source === 'nai') {
    newChunks = encodeNAIMetadata(metadata)
  }

  // Insert new metadata chunks before IEND
  const iendIndex = filteredChunks.findIndex((chunk) => chunk.name === 'IEND')
  if (iendIndex !== -1) {
    filteredChunks.splice(iendIndex, 0, ...newChunks)
  } else {
    filteredChunks.push(...newChunks)
  }

  // Encode back to PNG
  const newBuffer = encode(filteredChunks)
  return new Blob([new Uint8Array(newBuffer)], { type: 'image/png' })
}

/**
 * Check if a tEXt chunk is SD parameters chunk
 */
function isSDParametersChunk(data: Uint8Array): boolean {
  const keyword = extractKeyword(data)
  return keyword.toLowerCase() === 'parameters'
}

/**
 * Check if a tEXt chunk is NAI chunk
 */
function isNAIChunk(data: Uint8Array): boolean {
  const keyword = extractKeyword(data)
  const lower = keyword.toLowerCase()
  return lower === 'description' || lower === 'comment' || lower === 'source' ||
         lower === 'software' || lower === 'title' || lower === 'generation time'
}

/**
 * Extract keyword from tEXt chunk data
 */
function extractKeyword(data: Uint8Array): string {
  let keywordEnd = 0
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0x00) {
      keywordEnd = i
      break
    }
  }
  return new TextDecoder().decode(data.slice(0, keywordEnd))
}

/**
 * Encode SD WebUI metadata to tEXt chunk
 */
function encodeSDMetadata(metadata: ParsedMetadata): any[] {
  const params: string[] = []

  // Build parameters string
  if (metadata.parameters.steps !== undefined) params.push(`Steps: ${metadata.parameters.steps}`)
  if (metadata.parameters.sampler) params.push(`Sampler: ${metadata.parameters.sampler}`)
  if (metadata.parameters.cfgScale !== undefined) params.push(`CFG scale: ${metadata.parameters.cfgScale}`)
  if (metadata.parameters.seed !== undefined) params.push(`Seed: ${metadata.parameters.seed}`)
  if (metadata.parameters.size) params.push(`Size: ${metadata.parameters.size}`)
  if (metadata.parameters.model) params.push(`Model: ${metadata.parameters.model}`)
  if (metadata.parameters.clipSkip !== undefined) params.push(`Clip skip: ${metadata.parameters.clipSkip}`)
  if (metadata.parameters.denoisingStrength !== undefined)
    params.push(`Denoising strength: ${metadata.parameters.denoisingStrength}`)

  // Format: prompt\nNegative prompt: xxx\nSteps: N, Sampler: xxx, ...
  let content = metadata.prompt || ''
  if (metadata.negativePrompt) {
    content += `\nNegative prompt: ${metadata.negativePrompt}`
  }
  if (params.length > 0) {
    content += `\n${params.join(', ')}`
  }

  return [createTextChunk('parameters', content)]
}

/**
 * Encode NovelAI metadata to tEXt chunks
 */
function encodeNAIMetadata(metadata: ParsedMetadata): any[] {
  const chunks: any[] = []

  // Description chunk (prompt)
  if (metadata.prompt) {
    chunks.push(createTextChunk('Description', metadata.prompt))
  }

  // Parse original Comment JSON to preserve all fields
  let comment: any = {}

  // Try to parse rawText to get original Comment JSON
  if (metadata.rawText) {
    try {
      comment = JSON.parse(metadata.rawText)
    } catch {
      // If parsing fails, start with empty object
      comment = {}
    }
  }

  // Update top-level prompt field (NAI stores prompt in both Description and Comment)
  comment.prompt = metadata.prompt || ''

  // Update basic parameters (overwrite existing values)
  if (metadata.parameters.steps !== undefined) comment.steps = metadata.parameters.steps
  if (metadata.parameters.sampler) comment.sampler = metadata.parameters.sampler
  if (metadata.parameters.cfgScale !== undefined) comment.scale = metadata.parameters.cfgScale
  if (metadata.parameters.seed !== undefined) comment.seed = metadata.parameters.seed

  // Extract width/height from size if available
  if (metadata.parameters.size) {
    const [w, h] = metadata.parameters.size.split('x').map(Number)
    if (w && h) {
      comment.width = w
      comment.height = h
    }
  }

  // Update negative prompt
  // For v4 images, we need to update both uc and v4_negative_prompt
  if (metadata.v4Data) {
    // Update uc (main negative prompt)
    comment.uc = metadata.negativePrompt || ''

    // Update v4_negative_prompt if it exists
    if (comment.v4_negative_prompt) {
      try {
        const v4Neg = typeof comment.v4_negative_prompt === 'string'
          ? JSON.parse(comment.v4_negative_prompt)
          : comment.v4_negative_prompt

        // Update base_caption in v4_negative_prompt
        if (v4Neg.caption) {
          v4Neg.caption.base_caption = metadata.negativePrompt || ''

          // Update character captions if they exist
          if (metadata.v4Data.characters && metadata.v4Data.characters.length > 0 && v4Neg.caption.char_captions) {
            v4Neg.caption.char_captions = metadata.v4Data.characters.map(char => ({
              char_caption: char.negative,
              centers: char.centers || []
            }))
          }
        }

        comment.v4_negative_prompt = JSON.stringify(v4Neg)
      } catch {
        // If parsing fails, keep original
      }
    }

    // Update v4_prompt if it exists (for prompt changes)
    if (comment.v4_prompt) {
      try {
        const v4Prompt = typeof comment.v4_prompt === 'string'
          ? JSON.parse(comment.v4_prompt)
          : comment.v4_prompt

        // Update base_caption in v4_prompt
        if (v4Prompt.caption) {
          v4Prompt.caption.base_caption = metadata.prompt || ''

          // Update character captions if they exist
          if (metadata.v4Data.characters && metadata.v4Data.characters.length > 0 && v4Prompt.caption.char_captions) {
            v4Prompt.caption.char_captions = metadata.v4Data.characters.map(char => ({
              char_caption: char.prompt,
              centers: char.centers || []
            }))
          }
        }

        comment.v4_prompt = JSON.stringify(v4Prompt)
      } catch {
        // If parsing fails, keep original
      }
    }
  } else {
    // Regular negative prompt (no v4 data)
    comment.uc = metadata.negativePrompt || ''
  }

  // Update other NAI-specific parameters if they exist in metadata
  if (metadata.parameters.noise_schedule) comment.noise_schedule = metadata.parameters.noise_schedule
  if (metadata.parameters.sm !== undefined) comment.sm = metadata.parameters.sm
  if (metadata.parameters.sm_dyn !== undefined) comment.sm_dyn = metadata.parameters.sm_dyn
  if (metadata.parameters.cfg_rescale !== undefined) comment.cfg_rescale = metadata.parameters.cfg_rescale

  if (Object.keys(comment).length > 0) {
    chunks.push(createTextChunk('Comment', JSON.stringify(comment)))
  }

  // Add Software and Source chunks for NAI
  chunks.push(createTextChunk('Software', 'NovelAI'))
  chunks.push(createTextChunk('Source', 'Stable Diffusion XL'))

  return chunks
}
