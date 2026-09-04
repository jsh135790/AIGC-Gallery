<script setup lang="ts">
import type { SwitchRootEmits, SwitchRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SwitchRoot, SwitchThumb, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<SwitchRootProps & { class?: HTMLAttributes['class'] }>()

const emits = defineEmits<SwitchRootEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SwitchRoot
    v-bind="forwarded"
    :class="cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
      props.class,
    )"
  >
    <!--
      拇指颜色必须跟着它脚下的轨道走,不能用 bg-foreground:
      浅色主题下 --foreground 近黑,开启态就是一颗黑点压在黄铜轨道上(约 1.6:1)。
      开启态用 --primary-foreground —— 它由 useAccentColor 的 contrastForeground()
      按强调色亮度算出近黑或近白,所以 9 个预设色全都读得清。
      关闭态用 --muted-foreground,深浅两个主题下对着 --input 轨道都有 3.5:1 以上。
      transition 里必须带 translate:v4 的 translate-x-* 走的是 translate 属性,
      只写 background-color 会让滑动变成瞬移。
    -->
    <SwitchThumb
      class="pointer-events-none block h-4 w-4 rounded-full shadow-sm ring-0 transition-[translate,background-color] data-[state=checked]:translate-x-[1.125rem] data-[state=checked]:bg-primary-foreground data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-muted-foreground"
    />
  </SwitchRoot>
</template>
