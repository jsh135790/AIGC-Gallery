<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { PanelLeft, PanelLeftClose } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'
import { useBlurEffect } from '@/composables/useBlurEffect'

withDefaults(defineProps<{
  /** toolbar 标题(mono 呈现);也可用 #toolbar 插槽完全自定义 */
  title?: string
  /** 内容区 padding,传 false 由页面自管(如需要全幅内容) */
  padded?: boolean
}>(), {
  title: '',
  padded: true,
})

const { t } = useI18n()
const { blurEnabled } = useBlurEffect()
const route = useRoute()

const isMobile = useMediaQuery('(max-width: 767px)')
const sidebarOpen = ref(!isMobile.value)

// 视口跨越断点时同步侧栏状态
watch(isMobile, (mobile) => {
  sidebarOpen.value = !mobile
})

// 移动端导航后自动收起
watch(() => route.fullPath, () => {
  if (isMobile.value) sidebarOpen.value = false
})

defineExpose({ sidebarOpen, isMobile })

function closeSidebarOnMobile() {
  if (isMobile.value) sidebarOpen.value = false
}
</script>

<template>
  <div class="flex h-[calc(100vh-var(--header-height))] overflow-hidden">
    <!-- Sidebar -->
    <Transition name="slide-left">
      <aside
        v-if="sidebarOpen"
        class="w-60 shrink-0 border-r border-sidebar-border md:relative fixed top-[var(--header-height)] md:top-0 bottom-0 left-0 z-40"
        :class="blurEnabled ? 'bg-sidebar/60 backdrop-blur-lg' : 'bg-sidebar'"
        @click="closeSidebarOnMobile"
      >
        <slot name="sidebar" />
      </aside>
    </Transition>

    <!-- Mobile overlay(须位于侧栏之下,否则会拦截侧栏点击) -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen && isMobile"
        class="fixed inset-0 z-30 bg-black/50 md:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Main -->
    <main class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- Toolbar -->
      <div class="shrink-0 border-b border-border/40 bg-background/95">
        <div class="flex h-12 items-center gap-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 shrink-0"
            :aria-label="t('common.toggleSidebar')"
            @click="sidebarOpen = !sidebarOpen"
          >
            <PanelLeft v-if="!sidebarOpen" class="h-4 w-4" />
            <PanelLeftClose v-else class="h-4 w-4" />
          </Button>

          <h2 v-if="title" class="shrink-0 font-mono text-xs font-medium uppercase tracking-wider text-foreground">
            {{ title }}
          </h2>

          <slot name="toolbar" />

          <div class="ml-auto flex shrink-0 items-center gap-1.5">
            <slot name="toolbar-end" />
          </div>
        </div>

        <!-- 附加行:上传进度、标签筛选等 -->
        <slot name="toolbar-extra" />
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto" :class="padded ? 'p-4 md:p-6' : ''">
        <slot />
      </div>
    </main>
  </div>
</template>
