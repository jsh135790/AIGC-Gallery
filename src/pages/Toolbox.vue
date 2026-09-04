<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import AppShell from '@/components/layout/AppShell.vue'
import ToolboxSidebar from '@/components/toolbox/ToolboxSidebar.vue'
import MetadataEditor from '@/components/toolbox/MetadataEditor.vue'
import NaiToSd from '@/components/toolbox/NaiToSd.vue'
import SdToNai from '@/components/toolbox/SdToNai.vue'
import ImgToPrompt from '@/components/toolbox/ImgToPrompt.vue'

type ToolId = 'metadata-editor' | 'nai-to-sd' | 'sd-to-nai' | 'img-to-prompt'

const TOOL_IDS: string[] = ['metadata-editor', 'nai-to-sd', 'sd-to-nai', 'img-to-prompt']

const { t } = useI18n()
const route = useRoute()

/*
 * `?tool=` 真的生效。ImageDetailPanel 早就在 push('/toolbox?tool=metadata-editor'),
 * 但这里从来不读 query —— 能落到编辑器纯属它是默认值的巧合。
 */
function resolveTool(value: unknown): ToolId {
  return typeof value === 'string' && TOOL_IDS.includes(value)
    ? value as ToolId
    : 'metadata-editor'
}

const activeTool = ref<ToolId>(resolveTool(route.query.tool))

// 已经停在 /toolbox 时再 push 一次不会重建组件,所以 query 要看着
watch(() => route.query.tool, value => {
  if (typeof value === 'string') activeTool.value = resolveTool(value)
})

const toolTitles = {
  'metadata-editor': 'toolbox.metadataEditor',
  'nai-to-sd': 'toolbox.naiToSd',
  'sd-to-nai': 'toolbox.sdToNai',
  'img-to-prompt': 'toolbox.imgToPrompt',
}

/*
 * 元数据编辑器是三栏工作台,要自己吃满高度、三栏各自滚动,不能被内容区的
 * p-4 md:p-6 包住;另外三个工具的 max-w-5xl mx-auto 居中不受影响。
 *
 * 这段说明只能待在 script 里。dev 构建保留模板注释,顶层注释 + 根元素会让本
 * 组件编译成 fragment 根;App.vue 的 <transition mode="out-in"> 移除 fragment
 * 时走 removeFragment(),leave/afterLeave 都不会触发,isLeaving 卡在 true ——
 * 离开工具箱之后整个应用永久空白,而且不报错。别把注释挪回 <template> 顶层。
 */
const padded = computed(() => activeTool.value !== 'metadata-editor')
</script>

<template>
  <AppShell :title="t(toolTitles[activeTool])" :padded="padded">
    <template #sidebar>
      <ToolboxSidebar v-model="activeTool" />
    </template>

    <MetadataEditor v-if="activeTool === 'metadata-editor'" />
    <NaiToSd v-else-if="activeTool === 'nai-to-sd'" />
    <SdToNai v-else-if="activeTool === 'sd-to-nai'" />
    <ImgToPrompt v-else-if="activeTool === 'img-to-prompt'" />
  </AppShell>
</template>
