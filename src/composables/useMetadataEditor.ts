import { ref } from 'vue'
import type { ParsedMetadata, ImageSource, ImageParameters } from '@/types'

interface EditingImage {
  id?: string
  blob: Blob
  metadata: ParsedMetadata
  source: ImageSource
  originalMetadata: ParsedMetadata
}

const editingImage = ref<EditingImage | null>(null)

function cloneParameterValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneParameterValue)
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, cloneParameterValue(nestedValue)])
    )
  }

  return value
}

export function cloneParsedMetadata(meta: ParsedMetadata): ParsedMetadata {
  const parameters = Object.fromEntries(
    Object.entries(meta.parameters).map(([key, value]) => [key, cloneParameterValue(value)])
  ) as ImageParameters

  return {
    source: meta.source,
    prompt: meta.prompt,
    negativePrompt: meta.negativePrompt,
    parameters,
    rawText: meta.rawText,
    v4Data: meta.v4Data
      ? {
          basePrompt: meta.v4Data.basePrompt,
          baseNegative: meta.v4Data.baseNegative,
          characters: meta.v4Data.characters.map(character => ({
            idx: character.idx,
            prompt: character.prompt,
            negative: character.negative,
            centers: character.centers.map(center => ({
              x: center.x,
              y: center.y,
            })),
          })),
          useOrder: meta.v4Data.useOrder,
          useCoords: meta.v4Data.useCoords,
          legacyUc: meta.v4Data.legacyUc,
        }
      : undefined,
  }
}

export function useMetadataEditor() {
  const setEditingImage = (image: EditingImage) => {
    editingImage.value = {
      ...image,
      metadata: cloneParsedMetadata(image.metadata),
      originalMetadata: cloneParsedMetadata(image.originalMetadata),
    }
  }

  const getEditingImage = () => {
    return editingImage.value
  }

  const clearEditingImage = () => {
    editingImage.value = null
  }

  return {
    editingImage,
    setEditingImage,
    getEditingImage,
    clearEditingImage
  }
}
