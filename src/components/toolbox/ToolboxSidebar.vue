<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import SectionLabel from '@/components/common/SectionLabel.vue'
import SidebarItem from '@/components/layout/SidebarItem.vue'
import { TOOLS, type ToolId } from './tools'

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
