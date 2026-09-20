import type { Component } from 'vue'
import { FileEdit, FileSearch } from 'lucide-vue-next'
import MetadataEditor from './MetadataEditor.vue'
import MetadataInspector from './MetadataInspector.vue'

/*
 * 工具清单的单一来源。侧栏条目、Toolbox 页的标题、`?tool=` 的白名单、要渲染的组件全从
 * 这里派生 —— 之前 Toolbox.vue 的 toolTitles 与侧栏的 tools 各写一份,后来 id→组件的映射
 * 又在 Toolbox.vue 里手写了一条 v-if 链,删一个工具要改三处,漏一处就得到「点不开的侧栏
 * 条目」或「没有标题的页面」。现在新增工具 = 一个组件文件 + 这里一条注册项 + 两语 i18n key。
 *
 * component 用静态 import 而不是 defineAsyncComponent:vite-plugin-singlefile 会把动态 chunk
 * 内联回同一个 html,异步拿不到任何收益,反而让模块级单例 composable(useMetadataEditor 等)
 * 的初始化时机变得微妙。
 */
export interface ToolDefinition {
  id: string
  icon: Component
  /** i18n key */
  label: string
  /** i18n key */
  desc: string
  /** 零 props 组件;自己包一层 `p-4 md:p-6` + `mx-auto max-w-5xl` 居中盒(见 CLAUDE.md「New tool」) */
  component: Component
}

export const TOOLS = [
  {
    id: 'metadata-editor',
    icon: FileEdit,
    label: 'toolbox.metadataEditor',
    desc: 'toolbox.metadataEditorDesc',
    component: MetadataEditor,
  },
  {
    id: 'metadata-inspector',
    icon: FileSearch,
    label: 'toolbox.metadataInspector',
    desc: 'toolbox.metadataInspectorDesc',
    component: MetadataInspector,
  },
] as const satisfies readonly ToolDefinition[]

export type ToolId = typeof TOOLS[number]['id']

export const DEFAULT_TOOL: ToolId = 'metadata-editor'

/** `?tool=` 白名单:删掉一个工具时不会留下一个「能进但渲染不出东西」的 id */
export function resolveTool(value: unknown): ToolId {
  return TOOLS.some(tool => tool.id === value) ? value as ToolId : DEFAULT_TOOL
}
