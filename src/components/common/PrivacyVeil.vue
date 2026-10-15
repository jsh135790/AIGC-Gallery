<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'

/*
 * 盖在被遮图片上的一层。图本身的模糊由使用处给 <img> 挂 .privacy-mask,这里只负责图标和揭开入口。
 * 不写 NSFW 字样:工位上一个醒目的「NSFW」本身就是在广播。
 *
 * card:中间一个不可点的中性图标 + 右下角小眼睛按钮。揭开入口刻意做小、放在角上 ——
 *       卡片其余部分照常是「打开详情」,点偏了不能误揭开。
 * panel:只画图标和「显示」提示,不接收点击 —— 预览区本身(详情面板里它已经是个 <button>)负责揭开,
 *        这里再套一层 button 就成了嵌套交互元素。
 */
withDefaults(defineProps<{
  variant?: 'card' | 'panel'
}>(), {
  variant: 'card',
})

const emit = defineEmits<{ reveal: [] }>()
const { t } = useI18n()
</script>

<template>
  <template v-if="variant === 'card'">
    <div class="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <EyeOff class="h-5 w-5 text-white/60" />
    </div>
    <button
      type="button"
      class="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
      :aria-label="t('privacy.reveal')"
      :title="t('privacy.reveal')"
      @click.stop="emit('reveal')"
    >
      <Eye class="h-3.5 w-3.5" />
    </button>
  </template>
  <div
    v-else
    class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white/80"
    aria-hidden="true"
  >
    <EyeOff class="h-6 w-6" />
    <span class="flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs text-foreground backdrop-blur-sm">
      <Eye class="h-3 w-3" />
      {{ t('privacy.reveal') }}
    </span>
  </div>
</template>
