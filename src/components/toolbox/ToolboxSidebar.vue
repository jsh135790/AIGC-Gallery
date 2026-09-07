<script lang="ts">
import { FileEdit, FileSearch, ImagePlus } from 'lucide-vue-next'

/*
 * 工具清单的单一来源。侧栏条目、Toolbox 页的标题、`?tool=` 的白名单全从这里派生 ——
 * 之前 Toolbox.vue 的 toolTitles 与这里的 tools 各写一份,删一个工具要改两处,
 * 漏一处就得到「点不开的侧栏条目」或「没有标题的页面」。
 */
export const TOOLS = [
  {
    id: 'metadata-editor',
    icon: FileEdit,
    label: 'toolbox.metadataEditor',
    desc: 'toolbox.metadataEditorDesc',
  },
  {
    id: 'metadata-inspector',
    icon: FileSearch,
    label: 'toolbox.metadataInspector',
    desc: 'toolbox.metadataInspectorDesc',
  },
  {
    id: 'img-to-prompt',
    icon: ImagePlus,
    label: 'toolbox.imgToPrompt',
    desc: 'toolbox.imgToPromptDesc',
  },
] as const

export type ToolId = typeof TOOLS[number]['id']
</script>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import SectionLabel from '@/components/common/SectionLabel.vue'
import SidebarItem from '@/components/layout/SidebarItem.vue'

const { t } = useI18n()

const model = defineModel<ToolId>({ required: true })
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="p-4 pb-2">
      <SectionLabel>{{ t('toolbox.title') }}</SectionLabel>
    </div>

    <nav class="flex-1 space-y-0.5 px-2 pb-4">
      <SidebarItem
        v-for="tool in TOOLS"
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
