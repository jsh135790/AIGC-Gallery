<script setup lang="ts">
import type { TabsContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { TabsContent } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<TabsContentProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")
</script>

<template>
  <!--
    入场动画必须挂在 data-[state=active] 上。reka 的 TabsContent 走 force-mount 的
    Presence:两块面板一直在 DOM 里,靠 hidden 切换 —— 不加前缀的 animate-in 会在
    首次挂载时就播完,之后切 tab 再也不动。加了前缀,类是在状态翻成 active 那一刻
    才出现的,于是每次切换都重新触发。
    刻意不给退场动画:一旦有,Presence 会等动画结束才 hidden,两块面板同时可见并在
    normal flow 里上下堆叠,弹窗高度会先撑高再收回。
  -->
  <TabsContent
    :class="cn(
      'mt-2 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300 data-[state=active]:ease-out',
      props.class,
    )"
    v-bind="delegatedProps"
  >
    <slot />
  </TabsContent>
</template>
