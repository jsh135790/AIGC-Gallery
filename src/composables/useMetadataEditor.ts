import { ref } from 'vue'
import type { ParsedMetadata, ImageSource } from '@/types'

interface EditingImage {
  id?: string
  blob?: Blob
  src: string
  metadata: ParsedMetadata
  source: ImageSource
  originalMetadata: ParsedMetadata
}

const editingImage = ref<EditingImage | null>(null)

export function useMetadataEditor() {
  const setEditingImage = (image: EditingImage) => {
    editingImage.value = image
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
