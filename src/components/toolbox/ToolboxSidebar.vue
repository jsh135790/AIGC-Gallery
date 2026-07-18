<script setup lang="ts">
import { FileEdit, ArrowRightLeft, ArrowLeftRight, ImagePlus } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import SectionLabel from '@/components/common/SectionLabel.vue'
import SidebarItem from '@/components/layout/SidebarItem.vue'

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
  <div class="flex h-full flex-col">
    <div class="p-4 pb-2">
      <SectionLabel>{{ t('toolbox.title') }}</SectionLabel>
    </div>

    <nav class="flex-1 space-y-0.5 px-2 pb-4">
      <SidebarItem
        v-for="tool in tools"
        :key="tool.id"
        :active="model === tool.id"
        :label="t(tool.label)"
        :description="t(tool.desc)"
        @click="model = tool.id"
      >
        <template #icon>
          <component :is="tool.icon" />
        </template>
      </SidebarItem>
    </nav>
  </div>
</template>
