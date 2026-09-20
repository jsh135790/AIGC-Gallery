<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import AppShell from '@/components/layout/AppShell.vue'
import ToolboxSidebar from '@/components/toolbox/ToolboxSidebar.vue'
import { TOOLS, resolveTool } from '@/components/toolbox/tools'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

/*
 * `?tool=` 真的生效。ImageDetailPanel 早就在 push('/toolbox?tool=metadata-editor'),
 * 但这里从来不读 query —— 能落到编辑器纯属它是默认值的巧合。
 *
 * 白名单、标题、要渲染的组件全从 tools.ts 的注册表派生:这一页对具体工具无感知。
 */
const activeTool = ref(resolveTool(route.query.tool))

// 已经停在 /toolbox 时再 push 一次不会重建组件,所以 query 要看着
watch(() => route.query.tool, value => {
  if (typeof value === 'string') activeTool.value = resolveTool(value)
})

/*
 * 反向也同步:侧栏切换只改内存的话,从详情面板跳进查看器再点到编辑器,一刷新又回到查看器;
 * 非法的 ?tool=xxx 也会一直留在地址栏。immediate 让首次进入就把缺失/非法值归一化。
 * 用 replace 不刷历史栈;两个 watch 收敛到同一个值后互不触发。
 */
watch(activeTool, id => {
  if (route.query.tool !== id) void router.replace({ query: { ...route.query, tool: id } })
}, { immediate: true })

const activeDefinition = computed(() => TOOLS.find(tool => tool.id === activeTool.value) ?? TOOLS[0])
const title = computed(() => t(activeDefinition.value.label))

/*
 * 内容区 padded=false:元数据编辑器**载入了图之后**是三栏工作台,要自己吃满高度、三栏各自
 * 滚动,不能被 p-4 md:p-6 包住。所以内边距由各工具自管 —— 居中一栏的工具(以及编辑器的空态)
 * 自己包一层 p-4 md:p-6,这一页不再 import 任何工具的 composable 来做特判。
 *
 * 这段说明只能待在 script 里。dev 构建保留模板注释,顶层注释 + 根元素会让本
 * 组件编译成 fragment 根;App.vue 的 <transition mode="out-in"> 移除 fragment
 * 时走 removeFragment(),leave/afterLeave 都不会触发,isLeaving 卡在 true ——
 * 离开工具箱之后整个应用永久空白,而且不报错。别把注释挪回 <template> 顶层。
 */
</script>

<template>
  <AppShell :title="title" :padded="false">
    <template #sidebar>
      <ToolboxSidebar v-model="activeTool" />
    </template>

    <component :is="activeDefinition.component" />
  </AppShell>
</template>
