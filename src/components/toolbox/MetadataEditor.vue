<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useMetadataEditor } from '@/composables/useMetadataEditor'
import { useAigcStore } from '@/stores/aigcStore'
import { useToast } from '@/composables/useToast'
import { parseImageMetadata } from '@/lib/parser'
import { writePNGMetadata } from '@/lib/parser/png-writer'
import type { ParsedMetadata, ImageSource } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Upload, RotateCcw, Download, AlertCircle } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const { getEditingImage, clearEditingImage } = useMetadataEditor()
const aigcStore = useAigcStore()
const { success, error, info } = useToast()

const imageFile = ref<File | null>(null)
const imageSrc = ref<string>('')
const imageBlob = ref<Blob | null>(null)
const source = ref<ImageSource | null>(null)
const metadata = ref<ParsedMetadata>({
  source: 'unknown',
  prompt: '',
  negativePrompt: '',
  parameters: {},
  rawText: ''
})
const originalMetadata = ref<ParsedMetadata>({
  source: 'unknown',
  prompt: '',
  negativePrompt: '',
  parameters: {},
  rawText: ''
})
const isUnsupported = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// Load image from AIGC store or editing state
onMounted(async () => {
  const imageId = route.query.imageId as string | undefined

  if (imageId) {
    const image = aigcStore.images.find(img => img.id === Number(imageId))
    if (image) {
      imageSrc.value = URL.createObjectURL(image.imageData)
      imageBlob.value = image.imageData
      source.value = image.source
      metadata.value = {
        source: image.source,
        prompt: image.prompt,
        negativePrompt: image.negativePrompt,
        parameters: { ...image.parameters },
        rawText: image.rawMetadata,
        v4Data: image.v4Data
      }
      originalMetadata.value = { ...metadata.value }
      isUnsupported.value = image.source === 'comfyui'
    }
  } else {
    const editing = getEditingImage()
    if (editing) {
      // Use the blob to create a fresh URL or use existing src
      if (editing.blob) {
        imageSrc.value = URL.createObjectURL(editing.blob)
      } else {
        imageSrc.value = editing.src
      }
      imageBlob.value = editing.blob || null
      source.value = editing.source
      metadata.value = { ...editing.metadata }
      originalMetadata.value = { ...editing.originalMetadata }
      isUnsupported.value = editing.source === 'comfyui'
    }
  }
})

// Cleanup blob URL on unmount
onUnmounted(() => {
  if (imageSrc.value && imageSrc.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageSrc.value)
  }
  clearEditingImage()
})

// Handle file upload
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    await loadImage(target.files[0])
  }
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    await loadImage(event.dataTransfer.files[0])
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const loadImage = async (file: File) => {
  if (!file.type.startsWith('image/png')) {
    error(t('metadata.editor.onlyPng'))
    return
  }

  // Revoke old blob URL if exists
  if (imageSrc.value && imageSrc.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageSrc.value)
  }

  imageFile.value = file
  imageSrc.value = URL.createObjectURL(file)
  imageBlob.value = file

  // Parse metadata
  const parsed = await parseImageMetadata(file, imageSrc.value)
  source.value = parsed.source
  metadata.value = { ...parsed }
  originalMetadata.value = { ...parsed }
  isUnsupported.value = parsed.source === 'comfyui'

  if (isUnsupported.value) {
    error(t('metadata.editor.unsupported'))
  }
}

// Reset to original metadata
const handleReset = () => {
  metadata.value = { ...originalMetadata.value }
  info(t('metadata.editor.reset'))
}

// Export PNG with modified metadata
const handleExport = async () => {
  if (!imageBlob.value || !source.value || isUnsupported.value) {
    return
  }

  try {
    const newBlob = await writePNGMetadata(imageBlob.value, metadata.value, source.value)

    // Trigger download
    const url = URL.createObjectURL(newBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `edited_${imageFile.value?.name || 'image.png'}`
    a.click()
    URL.revokeObjectURL(url)

    success(t('metadata.editor.export'))
  } catch (err) {
    console.error('Export failed:', err)
    error('Export failed')
  }
}

const getSourceBadgeVariant = (src: ImageSource) => {
  if (src === 'sd') return 'default'
  if (src === 'nai') return 'secondary'
  return 'destructive'
}

const getSourceLabel = (src: ImageSource) => {
  if (src === 'sd') return 'SD WebUI'
  if (src === 'nai') return 'NovelAI'
  if (src === 'comfyui') return 'ComfyUI'
  return 'Unknown'
}

const handleClearImage = () => {
  if (imageSrc.value && imageSrc.value.startsWith('blob:')) {
    URL.revokeObjectURL(imageSrc.value)
  }
  imageSrc.value = ''
  imageFile.value = null
  clearEditingImage()
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <Card>
      <CardHeader>
        <CardTitle>{{ t('metadata.editor.title') }}</CardTitle>
        <CardDescription>{{ t('toolbox.metadataEditorDesc') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <!-- Upload Area -->
        <div
          v-if="!imageSrc"
          class="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
          @drop="handleDrop"
          @dragover="handleDragOver"
          @click="() => fileInput?.click()"
        >
          <Upload class="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p class="text-sm text-muted-foreground mb-2">{{ t('metadata.editor.uploadHint') }}</p>
          <p class="text-xs text-muted-foreground">{{ t('metadata.editor.onlyPng') }}</p>
          <input
            ref="fileInput"
            type="file"
            accept="image/png"
            class="hidden"
            @change="handleFileSelect"
          />
        </div>

        <!-- Editor Layout -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left: Image Preview -->
          <div class="space-y-4">
            <div class="relative rounded-lg overflow-hidden border bg-muted">
              <img :src="imageSrc" alt="Preview" class="w-full h-auto" />
            </div>

            <div class="flex items-center gap-2">
              <Badge v-if="source" :variant="getSourceBadgeVariant(source)">
                {{ getSourceLabel(source) }}
              </Badge>
              <Button size="sm" variant="outline" @click="handleClearImage">
                <Upload class="w-4 h-4 mr-2" />
                {{ t('metadata.editor.upload') }}
              </Button>
            </div>

            <!-- Unsupported Warning -->
            <div v-if="isUnsupported" class="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle class="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p class="text-sm">{{ t('metadata.editor.unsupported') }}</p>
            </div>
          </div>

          <!-- Right: Editable Form -->
          <div class="space-y-4">
            <div class="space-y-2">
              <Label>{{ t('metadata.prompt') }}</Label>
              <Textarea
                v-model="metadata.prompt"
                :disabled="isUnsupported"
                :rows="4"
                class="resize-none"
              />
            </div>

            <div class="space-y-2">
              <Label>{{ t('metadata.negativePrompt') }}</Label>
              <Textarea
                v-model="metadata.negativePrompt"
                :disabled="isUnsupported"
                :rows="3"
                class="resize-none"
              />
            </div>

            <!-- NAI v4 Character Prompts -->
            <div v-if="source === 'nai' && metadata.v4Data && metadata.v4Data.characters.length > 0" class="space-y-3">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-medium">{{ t('metadata.characterPrompts') }}</h3>
                <Badge variant="outline" class="text-xs">
                  {{ t('metadata.characterCount', { count: String(metadata.v4Data.characters.length) }) }}
                </Badge>
              </div>

              <div
                v-for="(char, idx) in metadata.v4Data.characters"
                :key="idx"
                class="rounded-lg border p-3 space-y-2 bg-muted/20"
              >
                <div class="text-xs font-medium text-muted-foreground">
                  {{ t('metadata.character', { idx: String(char.idx) }) }}
                </div>

                <div v-if="char.prompt" class="space-y-1">
                  <Label class="text-xs">Prompt</Label>
                  <Textarea
                    v-model="char.prompt"
                    :disabled="isUnsupported"
                    :rows="2"
                    class="resize-none text-xs"
                  />
                </div>

                <div v-if="char.negative" class="space-y-1">
                  <Label class="text-xs">Negative</Label>
                  <Textarea
                    v-model="char.negative"
                    :disabled="isUnsupported"
                    :rows="2"
                    class="resize-none text-xs"
                  />
                </div>
              </div>
            </div>

            <!-- SD Parameters -->
            <div v-if="source === 'sd'" class="space-y-3">
              <h3 class="text-sm font-medium">{{ t('metadata.parameters') }}</h3>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <Label class="text-xs">Steps</Label>
                  <Input v-model.number="metadata.parameters.steps" type="number" :disabled="isUnsupported" />
                </div>
                <div class="space-y-1">
                  <Label class="text-xs">CFG Scale</Label>
                  <Input v-model.number="metadata.parameters.cfgScale" type="number" step="0.1" :disabled="isUnsupported" />
                </div>
                <div class="space-y-1">
                  <Label class="text-xs">Seed</Label>
                  <Input v-model="metadata.parameters.seed" type="text" :disabled="isUnsupported" />
                </div>
                <div class="space-y-1">
                  <Label class="text-xs">Clip Skip</Label>
                  <Input v-model.number="metadata.parameters.clipSkip" type="number" :disabled="isUnsupported" />
                </div>
                <div class="space-y-1 col-span-2">
                  <Label class="text-xs">Sampler</Label>
                  <Input v-model="metadata.parameters.sampler" :disabled="isUnsupported" />
                </div>
                <div class="space-y-1 col-span-2">
                  <Label class="text-xs">Model</Label>
                  <Input v-model="metadata.parameters.model" :disabled="isUnsupported" />
                </div>
              </div>
            </div>

            <!-- NAI Parameters -->
            <div v-if="source === 'nai'" class="space-y-3">
              <h3 class="text-sm font-medium">{{ t('metadata.parameters') }}</h3>
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <Label class="text-xs">Steps</Label>
                  <Input v-model.number="metadata.parameters.steps" type="number" :disabled="isUnsupported" />
                </div>
                <div class="space-y-1">
                  <Label class="text-xs">Scale</Label>
                  <Input v-model.number="metadata.parameters.cfgScale" type="number" step="0.1" :disabled="isUnsupported" />
                </div>
                <div class="space-y-1 col-span-2">
                  <Label class="text-xs">Seed</Label>
                  <Input v-model="metadata.parameters.seed" type="text" :disabled="isUnsupported" />
                </div>
                <div class="space-y-1 col-span-2">
                  <Label class="text-xs">Sampler</Label>
                  <Input v-model="metadata.parameters.sampler" :disabled="isUnsupported" />
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-2 pt-4">
              <Button @click="handleReset" variant="outline" :disabled="isUnsupported">
                <RotateCcw class="w-4 h-4 mr-2" />
                {{ t('metadata.editor.reset') }}
              </Button>
              <Button @click="handleExport" :disabled="isUnsupported">
                <Download class="w-4 h-4 mr-2" />
                {{ t('metadata.editor.export') }}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
