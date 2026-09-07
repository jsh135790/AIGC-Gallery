<script setup lang="ts">
import { Copy, Check, Users, MapPin } from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import SectionLabel from '@/components/common/SectionLabel.vue'
import MetadataRow from '@/components/common/MetadataRow.vue'
import { useI18n } from '@/composables/useI18n'
import { useCopyFeedback } from '@/composables/useCopyFeedback'
import { isAutoPosition } from '@/lib/parser/fields'
import type { AIGCImage } from '@/types'

const props = defineProps<{
  image: AIGCImage
}>()

const { t } = useI18n()
const { copiedKey, copy } = useCopyFeedback()

const paramEntries = computed(() =>
  Object.entries(props.image.parameters || {})
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .filter(([k]) => k !== 'nodeTypes') // Exclude nodeTypes from regular params
)

const nodeTypes = computed(() => props.image.parameters?.nodeTypes as string[] | undefined)

function formatCoord(val: number): string {
  return Math.round(val).toString()
}
</script>

<template>
  <div class="space-y-4 text-sm">
    <!-- Source chip — neutral mono, single-accent discipline -->
    <div class="flex items-center gap-2">
      <span class="text-muted-foreground">{{ t('metadata.source') }}</span>
      <span class="hair rounded-sm px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wide text-muted-foreground">
        {{ image.source === 'sd' ? 'Stable Diffusion' : image.source === 'nai' ? 'NovelAI' : image.source === 'comfyui' ? 'ComfyUI' : image.source }}
      </span>
    </div>

    <!-- Prompt -->
    <div v-if="image.prompt" class="space-y-1.5">
      <div class="flex items-center justify-between">
        <SectionLabel>{{ t('metadata.prompt') }}</SectionLabel>
        <Button
          variant="ghost"
          size="icon"
          class="h-6 w-6"
          @click="copy(image.prompt, 'prompt')"
        >
          <Check v-if="copiedKey === 'prompt'" class="h-3 w-3 text-success" />
          <Copy v-else class="h-3 w-3" />
        </Button>
      </div>
      <div class="border bg-background rounded-lg p-3 text-xs leading-relaxed max-h-32 overflow-y-auto font-mono">
        {{ image.prompt }}
      </div>
    </div>

    <!-- Negative Prompt -->
    <div v-if="image.negativePrompt" class="space-y-1.5">
      <div class="flex items-center justify-between">
        <SectionLabel>{{ t('metadata.negativePrompt') }}</SectionLabel>
        <Button
          variant="ghost"
          size="icon"
          class="h-6 w-6"
          @click="copy(image.negativePrompt, 'negative')"
        >
          <Check v-if="copiedKey === 'negative'" class="h-3 w-3 text-success" />
          <Copy v-else class="h-3 w-3" />
        </Button>
      </div>
      <div class="border bg-background rounded-lg p-3 text-xs leading-relaxed max-h-24 overflow-y-auto font-mono text-muted-foreground">
        {{ image.negativePrompt }}
      </div>
    </div>

    <!-- NovelAI v4 Character Prompts -->
    <div v-if="image.v4Data && image.v4Data.characters.length" class="space-y-2">
      <div class="flex items-center gap-1.5">
        <Users class="h-3.5 w-3.5 text-muted-foreground" />
        <SectionLabel>{{ t('metadata.characterPrompts') }}</SectionLabel>
        <Badge variant="outline" class="text-2xs px-1.5 py-0">
          {{ t('metadata.characterCount', { count: String(image.v4Data.characters.length) }) }}
        </Badge>
      </div>

      <!-- v4 Base Prompt (if different from main prompt) -->
      <div v-if="image.v4Data.basePrompt && image.v4Data.basePrompt !== image.prompt" class="space-y-1">
        <div class="flex items-center justify-between">
          <span class="text-2xs text-muted-foreground">{{ t('metadata.globalPrompt') }}</span>
          <Button
            variant="ghost"
            size="icon"
            class="h-5 w-5"
            @click="copy(image.v4Data.basePrompt, 'v4base')"
          >
            <Check v-if="copiedKey === 'v4base'" class="h-2.5 w-2.5 text-success" />
            <Copy v-else class="h-2.5 w-2.5" />
          </Button>
        </div>
        <div class="border bg-background rounded-md p-2 text-2xs leading-relaxed max-h-20 overflow-y-auto font-mono">
          {{ image.v4Data.basePrompt }}
        </div>
      </div>

      <!-- Per-character prompts -->
      <div
        v-for="char in image.v4Data.characters"
        :key="char.idx"
        class="rounded-lg border p-2.5 space-y-1.5"
      >
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium">{{ t('metadata.character', { idx: String(char.idx) }) }}</span>
          <div v-if="char.centers.length" class="flex items-center gap-1 text-2xs text-muted-foreground">
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
            <span class="text-2xs text-muted-foreground">Prompt</span>
            <Button
              variant="ghost"
              size="icon"
              class="h-5 w-5"
              @click="copy(char.prompt, `char${char.idx}p`)"
            >
              <Check v-if="copiedKey === `char${char.idx}p`" class="h-2.5 w-2.5 text-success" />
              <Copy v-else class="h-2.5 w-2.5" />
            </Button>
          </div>
          <div class="border bg-background rounded-md p-2 text-2xs leading-relaxed max-h-20 overflow-y-auto font-mono">
            {{ char.prompt }}
          </div>
        </div>

        <!-- Character negative prompt -->
        <div v-if="char.negative" class="space-y-0.5">
          <div class="flex items-center justify-between">
            <span class="text-2xs text-muted-foreground">Negative</span>
            <Button
              variant="ghost"
              size="icon"
              class="h-5 w-5"
              @click="copy(char.negative, `char${char.idx}n`)"
            >
              <Check v-if="copiedKey === `char${char.idx}n`" class="h-2.5 w-2.5 text-success" />
              <Copy v-else class="h-2.5 w-2.5" />
            </Button>
          </div>
          <div class="border bg-background rounded-md p-2 text-2xs leading-relaxed max-h-16 overflow-y-auto font-mono text-muted-foreground">
            {{ char.negative }}
          </div>
        </div>
      </div>

      <!-- v4 Meta flags -->
      <div class="flex flex-wrap gap-1.5">
        <Badge v-if="image.v4Data.useOrder" variant="outline" class="text-2xs">use_order</Badge>
        <Badge v-if="image.v4Data.useCoords" variant="outline" class="text-2xs">use_coords</Badge>
        <Badge v-if="image.v4Data.legacyUc" variant="outline" class="text-2xs">legacy_uc</Badge>
      </div>
    </div>

    <!-- Parameters -->
    <div v-if="paramEntries.length" class="space-y-1.5">
      <SectionLabel>{{ t('metadata.parameters') }}</SectionLabel>
      <div class="border bg-background rounded-lg p-3">
        <div class="grid grid-cols-2 gap-x-4 gap-y-2">
          <!-- 打字机读出:逐行错开 70ms,琥珀光标。reduced-motion 下直接出完整文本 -->
          <MetadataRow
            v-for="([key, value], i) in paramEntries"
            :key="key"
            :label="key"
            :value="value"
            :index="i"
          />
        </div>
      </div>
    </div>

    <!-- ComfyUI Node Types -->
    <div v-if="nodeTypes && nodeTypes.length" class="space-y-1.5">
      <SectionLabel>{{ t('metadata.nodeTypes') }}</SectionLabel>
      <div class="border bg-background rounded-lg p-3 max-h-40 overflow-y-auto">
        <div class="flex flex-wrap gap-1.5">
          <Badge
            v-for="nodeType in nodeTypes"
            :key="nodeType"
            variant="outline"
            class="text-2xs font-mono"
          >
            {{ nodeType }}
          </Badge>
        </div>
      </div>
    </div>

    <Separator v-if="image.prompt || paramEntries.length" />

    <!-- File info -->
    <div class="space-y-1.5">
      <SectionLabel>{{ t('metadata.fileInfo') }}</SectionLabel>
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
