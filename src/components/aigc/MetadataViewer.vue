<script setup lang="ts">
import { Copy, Check, Users, MapPin } from 'lucide-vue-next'
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/composables/useI18n'
import type { AIGCImage } from '@/types'

const props = defineProps<{
  image: AIGCImage
}>()

const { t } = useI18n()
const copiedField = ref<string | null>(null)

async function copyText(text: string, field: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = field
    setTimeout(() => { copiedField.value = null }, 1500)
  } catch { /* ignore */ }
}

const paramEntries = computed(() =>
  Object.entries(props.image.parameters || {})
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .filter(([k]) => k !== 'nodeTypes') // Exclude nodeTypes from regular params
)

const nodeTypes = computed(() => props.image.parameters?.nodeTypes as string[] | undefined)

function formatCoord(val: number): string {
  return Math.round(val).toString()
}

function isAutoPosition(centers: { x: number; y: number }[]): boolean {
  return centers.length === 1 && Math.round(centers[0].x) === 0 && Math.round(centers[0].y) === 0
}
</script>

<template>
  <div class="space-y-4 text-sm">
    <!-- Source badge -->
    <div class="flex items-center gap-2">
      <span class="text-muted-foreground">{{ t('metadata.source') }}</span>
      <Badge
        variant="outline"
        :class="{
          'bg-blue-500/10 text-blue-500 border-blue-500/30': image.source === 'sd',
          'bg-purple-500/10 text-purple-500 border-purple-500/30': image.source === 'nai',
          'bg-green-500/10 text-green-500 border-green-500/30': image.source === 'comfyui',
        }"
      >
        {{ image.source === 'sd' ? 'Stable Diffusion' : image.source === 'nai' ? 'NovelAI' : image.source === 'comfyui' ? 'ComfyUI' : image.source }}
      </Badge>
    </div>

    <!-- Prompt -->
    <div v-if="image.prompt" class="space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="font-medium text-xs uppercase tracking-wider text-muted-foreground">{{ t('metadata.prompt') }}</span>
        <Button
          variant="ghost"
          size="icon"
          class="h-6 w-6"
          @click="copyText(image.prompt, 'prompt')"
        >
          <Check v-if="copiedField === 'prompt'" class="h-3 w-3 text-green-500" />
          <Copy v-else class="h-3 w-3" />
        </Button>
      </div>
      <div class="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed max-h-32 overflow-y-auto font-mono">
        {{ image.prompt }}
      </div>
    </div>

    <!-- Negative Prompt -->
    <div v-if="image.negativePrompt" class="space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="font-medium text-xs uppercase tracking-wider text-muted-foreground">{{ t('metadata.negativePrompt') }}</span>
        <Button
          variant="ghost"
          size="icon"
          class="h-6 w-6"
          @click="copyText(image.negativePrompt, 'negative')"
        >
          <Check v-if="copiedField === 'negative'" class="h-3 w-3 text-green-500" />
          <Copy v-else class="h-3 w-3" />
        </Button>
      </div>
      <div class="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed max-h-24 overflow-y-auto font-mono text-muted-foreground">
        {{ image.negativePrompt }}
      </div>
    </div>

    <!-- NovelAI v4 Character Prompts -->
    <div v-if="image.v4Data && image.v4Data.characters.length" class="space-y-2">
      <div class="flex items-center gap-1.5">
        <Users class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="font-medium text-xs uppercase tracking-wider text-muted-foreground">
          {{ t('metadata.characterPrompts') }}
        </span>
        <Badge variant="outline" class="text-[10px] px-1.5 py-0">
          {{ t('metadata.characterCount', { count: String(image.v4Data.characters.length) }) }}
        </Badge>
      </div>

      <!-- v4 Base Prompt (if different from main prompt) -->
      <div v-if="image.v4Data.basePrompt && image.v4Data.basePrompt !== image.prompt" class="space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-[11px] text-muted-foreground">{{ t('metadata.globalPrompt') }}</span>
          <Button
            variant="ghost"
            size="icon"
            class="h-5 w-5"
            @click="copyText(image.v4Data.basePrompt, 'v4base')"
          >
            <Check v-if="copiedField === 'v4base'" class="h-2.5 w-2.5 text-green-500" />
            <Copy v-else class="h-2.5 w-2.5" />
          </Button>
        </div>
        <div class="rounded-md bg-muted/40 p-2 text-[11px] leading-relaxed max-h-20 overflow-y-auto font-mono">
          {{ image.v4Data.basePrompt }}
        </div>
      </div>

      <!-- Per-character prompts -->
      <div
        v-for="char in image.v4Data.characters"
        :key="char.idx"
        class="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-1.5"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium">{{ t('metadata.character', { idx: String(char.idx) }) }}</span>
          <div v-if="char.centers.length" class="flex items-center gap-1 text-[10px] text-muted-foreground">
            <MapPin class="h-3 w-3" />
            <span v-if="isAutoPosition(char.centers)">{{ t('metadata.autoPosition') }}</span>
            <span
              v-else
              v-for="(pt, pi) in char.centers"
              :key="pi"
            >
              ({{ formatCoord(pt.x) }}, {{ formatCoord(pt.y) }}){{ pi < char.centers.length - 1 ? ', ' : '' }}
            </span>
          </div>
        </div>

        <!-- Character positive prompt -->
        <div v-if="char.prompt" class="space-y-0.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-muted-foreground">Prompt</span>
            <Button
              variant="ghost"
              size="icon"
              class="h-5 w-5"
              @click="copyText(char.prompt, `char${char.idx}p`)"
            >
              <Check v-if="copiedField === `char${char.idx}p`" class="h-2.5 w-2.5 text-green-500" />
              <Copy v-else class="h-2.5 w-2.5" />
            </Button>
          </div>
          <div class="rounded-md bg-background/60 p-2 text-[11px] leading-relaxed max-h-20 overflow-y-auto font-mono">
            {{ char.prompt }}
          </div>
        </div>

        <!-- Character negative prompt -->
        <div v-if="char.negative" class="space-y-0.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] text-muted-foreground">Negative</span>
            <Button
              variant="ghost"
              size="icon"
              class="h-5 w-5"
              @click="copyText(char.negative, `char${char.idx}n`)"
            >
              <Check v-if="copiedField === `char${char.idx}n`" class="h-2.5 w-2.5 text-green-500" />
              <Copy v-else class="h-2.5 w-2.5" />
            </Button>
          </div>
          <div class="rounded-md bg-background/60 p-2 text-[11px] leading-relaxed max-h-16 overflow-y-auto font-mono text-muted-foreground">
            {{ char.negative }}
          </div>
        </div>
      </div>

      <!-- v4 Meta flags -->
      <div class="flex flex-wrap gap-1.5">
        <Badge v-if="image.v4Data.useOrder" variant="outline" class="text-[10px]">use_order</Badge>
        <Badge v-if="image.v4Data.useCoords" variant="outline" class="text-[10px]">use_coords</Badge>
        <Badge v-if="image.v4Data.legacyUc" variant="outline" class="text-[10px]">legacy_uc</Badge>
      </div>
    </div>

    <!-- Parameters -->
    <div v-if="paramEntries.length" class="space-y-1.5">
      <span class="font-medium text-xs uppercase tracking-wider text-muted-foreground">{{ t('metadata.parameters') }}</span>
      <div class="rounded-lg bg-muted/50 p-3">
        <div class="grid grid-cols-2 gap-x-4 gap-y-2">
          <div v-for="[key, value] in paramEntries" :key="key" class="flex items-baseline justify-between gap-2">
            <span class="text-xs text-muted-foreground capitalize">{{ key }}</span>
            <span class="text-xs font-mono font-medium truncate max-w-[120px]">{{ value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ComfyUI Node Types -->
    <div v-if="nodeTypes && nodeTypes.length" class="space-y-1.5">
      <span class="font-medium text-xs uppercase tracking-wider text-muted-foreground">{{ t('metadata.nodeTypes') }}</span>
      <div class="rounded-lg bg-muted/50 p-3 max-h-40 overflow-y-auto">
        <div class="flex flex-wrap gap-1.5">
          <Badge
            v-for="nodeType in nodeTypes"
            :key="nodeType"
            variant="outline"
            class="text-[10px] font-mono"
          >
            {{ nodeType }}
          </Badge>
        </div>
      </div>
    </div>

    <Separator v-if="image.prompt || paramEntries.length" />

    <!-- File info -->
    <div class="space-y-1.5">
      <span class="font-medium text-xs uppercase tracking-wider text-muted-foreground">{{ t('metadata.fileInfo') }}</span>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span class="text-muted-foreground">{{ t('metadata.filename') }}</span>
          <p class="font-medium truncate">{{ image.filename }}</p>
        </div>
        <div>
          <span class="text-muted-foreground">{{ t('metadata.addedTime') }}</span>
          <p class="font-medium">{{ new Date(image.createdAt).toLocaleDateString() }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
