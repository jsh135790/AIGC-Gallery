<script setup lang="ts">
import { inject } from 'vue'
import { cn } from '@/lib/utils'
import SteppedNumber from '@/components/common/SteppedNumber.vue'
import { SIDEBAR_NAVIGATE } from './sidebar-navigate'

withDefaults(defineProps<{
  active?: boolean
  label: string
  description?: string
  count?: number
  color?: string
}>(), {
  active: false,
})

const emit = defineEmits<{
  click: []
}>()

/*
 * 移动端点导航项后收起侧栏。这里主动上报,而不是让 AppShell 在 `<aside>` 上兜着 ——
 * 面板里的「新建文件夹」按钮不是导航,不该把整个面板连同它的对话框一起卸载。
 * 不在 AppShell 里(单元测试 / 其他容器)时 inject 拿不到,那就什么都不做。
 */
const notifyNavigate = inject(SIDEBAR_NAVIGATE, null)

function handleClick() {
  emit('click')
  notifyNavigate?.()
}
</script>

<template>
  <button
    type="button"
    :class="cn(
      'group flex w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm transition-colors',
      description ? 'py-2' : 'h-9',
      active
        ? 'bg-primary/10 text-primary'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
    )"
    @click="handleClick"
  >
    <!-- 图标或色点 -->
    <span v-if="$slots.icon" class="shrink-0 [&_svg]:h-4 [&_svg]:w-4">
      <slot name="icon" />
    </span>
    <span
      v-else-if="color"
      class="h-2.5 w-2.5 shrink-0 rounded-full"
      :style="{ backgroundColor: color }"
    />

    <span class="min-w-0 flex-1">
      <span class="block truncate font-medium">{{ label }}</span>
      <span v-if="description" class="block truncate text-xs text-muted-foreground">{{ description }}</span>
    </span>

    <!-- 计数:步进跳变而非平滑补间 -->
    <SteppedNumber
      v-if="count !== undefined"
      :value="count"
      class="shrink-0 font-mono text-2xs"
      :class="active ? 'text-primary' : 'text-dim'"
    />

    <!-- 尾部操作(⋯ 菜单等,悬停显现) -->
    <span
      v-if="$slots.trailing"
      class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
      @click.stop
    >
      <slot name="trailing" />
    </span>
  </button>
</template>
