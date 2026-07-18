<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import AppShell from '@/components/layout/AppShell.vue'
import ToolboxSidebar from '@/components/toolbox/ToolboxSidebar.vue'
import MetadataEditor from '@/components/toolbox/MetadataEditor.vue'
import NaiToSd from '@/components/toolbox/NaiToSd.vue'
import SdToNai from '@/components/toolbox/SdToNai.vue'
import ImgToPrompt from '@/components/toolbox/ImgToPrompt.vue'

const { t } = useI18n()

const activeTool = ref<'metadata-editor' | 'nai-to-sd' | 'sd-to-nai' | 'img-to-prompt'>('metadata-editor')

const toolTitles = {
  'metadata-editor': 'toolbox.metadataEditor',
  'nai-to-sd': 'toolbox.naiToSd',
  'sd-to-nai': 'toolbox.sdToNai',
  'img-to-prompt': 'toolbox.imgToPrompt',
}
</script>

<template>
  <AppShell :title="t(toolTitles[activeTool])">
    <template #sidebar>
      <ToolboxSidebar v-model="activeTool" />
    </template>

    <MetadataEditor v-if="activeTool === 'metadata-editor'" />
    <NaiToSd v-else-if="activeTool === 'nai-to-sd'" />
    <SdToNai v-else-if="activeTool === 'sd-to-nai'" />
    <ImgToPrompt v-else-if="activeTool === 'img-to-prompt'" />
  </AppShell>
</template>
