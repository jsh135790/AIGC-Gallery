<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { cloneParsedMetadata, useMetadataEditor } from '@/composables/useMetadataEditor'
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
import DropZone from '@/components/common/DropZone.vue'
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

function createEmptyMetadata(): ParsedMetadata {
  return {
    source: 'unknown',
    prompt: '',
    negativePrompt: '',
    parameters: {},
    rawText: '',
  }
}

const metadata = ref<ParsedMetadata>(createEmptyMetadata())
const originalMetadata = ref<ParsedMetadata>(createEmptyMetadata())
const isUnsupported = ref(false)

function replaceImageBlob(blob: Blob | null) {
  const previousSrc = imageSrc.value
  const nextSrc = blob ? URL.createObjectURL(blob) : ''

  imageBlob.value = blob
  imageSrc.value = nextSrc

  if (previousSrc) {
    URL.revokeObjectURL(previousSrc)
  }
}

function initializeMetadata(nextMetadata: ParsedMetadata) {
  metadata.value = cloneParsedMetadata(nextMetadata)
  originalMetadata.value = cloneParsedMetadata(nextMetadata)
}

// Load image from AIGC store or editing state
onMounted(async () => {
  const imageId = route.query.imageId as string | undefined

  if (imageId) {
    const image = aigcStore.images.find(img => img.id === Number(imageId))
    if (image) {
      replaceImageBlob(image.imageData)
      source.value = image.source
      initializeMetadata({
        source: image.source,
        prompt: image.prompt,
        negativePrompt: image.negativePrompt,
        parameters: image.parameters,
        rawText: image.rawMetadata,
        v4Data: image.v4Data,
      })
      isUnsupported.value = image.source === 'comfyui'
    }
  } else {
    const editing = getEditingImage()
    if (editing) {
      replaceImageBlob(editing.blob)
      source.value = editing.source
      metadata.value = cloneParsedMetadata(editing.metadata)
      originalMetadata.value = cloneParsedMetadata(editing.originalMetadata)
      isUnsupported.value = editing.source === 'comfyui'
    }
  }
})

// Cleanup blob URL on unmount
onUnmounted(() => {
  replaceImageBlob(null)
  clearEditingImage()
})

// Handle file upload (via common DropZone)
const loadImage = async (file: File) => {
  if (!file.type.startsWith('image/png')) {
    error(t('metadata.editor.onlyPng'))
    return
  }

  let parseUrl = ''

  try {
    parseUrl = URL.createObjectURL(file)
    const parsed = await parseImageMetadata(file, parseUrl)

    imageFile.value = file
    replaceImageBlob(file)
    source.value = parsed.source
    initializeMetadata(parsed)
    isUnsupported.value = parsed.source === 'comfyui'

    if (isUnsupported.value) {
      error(t('metadata.editor.unsupported'))
    }
  } catch (err) {
    console.error('Failed to parse image metadata:', err)
    error(t('metadata.editor.parseFailed'))
  } finally {
    if (parseUrl) {
      URL.revokeObjectURL(parseUrl)
    }
  }
}

// Reset to original metadata
const handleReset = () => {
  metadata.value = cloneParsedMetadata(originalMetadata.value)
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
    error(t('metadata.editor.exportFailed'))
  }
}

const getSourceLabel = (src: ImageSource) => {
  if (src === 'sd') return 'SD WebUI'
  if (src === 'nai') return 'NovelAI'
  if (src === 'comfyui') return 'ComfyUI'
  return 'Unknown'
}

const handleClearImage = () => {
  replaceImageBlob(null)
  imageFile.value = null
  source.value = null
  initializeMetadata(createEmptyMetadata())
  isUnsupported.value = false
  clearEditingImage()
}
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <Card>
      <CardHeader>
        <CardTitle class="text-base">{{ t('metadata.editor.title') }}</CardTitle>
        <CardDescription>{{ t('toolbox.metadataEditorDesc') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <!-- Upload Area -->
        <DropZone
          v-if="!imageSrc"
          accept="image/png"
          :multiple="false"
          :label="t('metadata.editor.uploadHint')"
          :sublabel="t('metadata.editor.onlyPng')"
          @files="files => loadImage(files[0])"
        />

        <!-- Editor Layout -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left: Image Preview -->
          <div class="space-y-4">
            <div class="relative rounded-lg overflow-hidden border bg-muted">
              <img :src="imageSrc" alt="Preview" class="w-full h-auto" />
            </div>

            <div class="flex items-center gap-2">
              <span
                v-if="source"
                class="rounded-sm border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wide text-foreground/80"
              >
                {{ getSourceLabel(source) }}
              </span>
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
                class="resize-none font-mono text-xs"
              />
            </div>

            <div class="space-y-2">
              <Label>{{ t('metadata.negativePrompt') }}</Label>
              <Textarea
                v-model="metadata.negativePrompt"
                :disabled="isUnsupported"
                :rows="3"
                class="resize-none font-mono text-xs"
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
                    class="resize-none font-mono text-xs"
                  />
                </div>

                <div v-if="char.negative" class="space-y-1">
                  <Label class="text-xs">Negative</Label>
                  <Textarea
                    v-model="char.negative"
                    :disabled="isUnsupported"
                    :rows="2"
                    class="resize-none font-mono text-xs"
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
