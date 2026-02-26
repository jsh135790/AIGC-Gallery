<script setup lang="ts">
import { FileEdit, ArrowRightLeft, ArrowLeftRight, ImagePlus } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import { cn } from '@/lib/utils'

const { t } = useI18n()

const model = defineModel<string>({ required: true })

const tools = [
  {
    id: 'metadata-editor',
    icon: FileEdit,
    label: 'toolbox.metadataEditor',
    desc: 'toolbox.metadataEditorDesc',
  },
  {
    id: 'nai-to-sd',
    icon: ArrowRightLeft,
    label: 'toolbox.naiToSd',
    desc: 'toolbox.naiToSdDesc',
  },
  {
    id: 'sd-to-nai',
    icon: ArrowLeftRight,
    label: 'toolbox.sdToNai',
    desc: 'toolbox.sdToNaiDesc',
  },
  {
    id: 'img-to-prompt',
    icon: ImagePlus,
    label: 'toolbox.imgToPrompt',
    desc: 'toolbox.imgToPromptDesc',
  },
]
</script>

<template>
  <div class="flex flex-col h-full py-4">
    <div class="px-4 mb-3">
      <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {{ t('toolbox.title') }}
      </h3>
    </div>

    <nav class="flex-1 px-2 space-y-1">
      <button
        v-for="tool in tools"
        :key="tool.id"
        :class="cn(
          'w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
          'hover:bg-accent/50',
          model === tool.id && 'bg-accent text-accent-foreground'
        )"
        @click="model = tool.id"
      >
        <component :is="tool.icon" class="h-4 w-4 mt-0.5 shrink-0" />
        <div class="flex-1 text-left">
          <div class="font-medium">{{ t(tool.label) }}</div>
          <div class="text-xs text-muted-foreground mt-0.5">{{ t(tool.desc) }}</div>
        </div>
      </button>
    </nav>
  </div>
</template>
