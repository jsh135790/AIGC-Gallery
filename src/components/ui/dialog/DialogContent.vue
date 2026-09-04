<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { X } from "lucide-vue-next"
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<DialogContentProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 bg-background/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <!--
      只用 fade + zoom。shadcn 原版还挂了两条 slide 类(横向 1/2、纵向 48%),这里刻意去掉:
      Tailwind v4 的 -translate-x-1/2 走的是 translate 属性,而 tw-animate-css 的
      enter/exit 关键帧动的是 transform —— 两者叠加,起始帧变成 -100% / -98%,
      对话框从左上角飞进来。只留 zoom 时 enter-translate 变量保持 0,
      transform-origin 默认在中心,于是从正中缩放弹出。
      (别把那两个类名原样写回注释里:Tailwind 扫的是文件纯文本,会照样编译出死规则。)
    -->
    <DialogContent
      v-bind="forwarded"
      :class="
        cn(
          'panel-float fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 p-6 duration-200 rounded-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          props.class,
        )"
    >
      <slot />

      <DialogClose
        class="absolute right-4 top-4 rounded-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none data-[state=open]:bg-accent"
      >
        <X class="w-4 h-4" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
