<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next'

const { toasts, removeToast } = useToast()

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

/*
 * 语义色只走「边框 + 图标/文字」,不再铺 10% 的色纱填充。
 * 底色统一由 .glass-panel 提供:关掉模糊时 --glass-alpha 自动翻成 1,于是永远是实底。
 * 此前这里是全站唯一没有实底回退的玻璃面 —— 关掉模糊后 Toast 变成 10% alpha
 * 的透明板,页面内容直接透过来。
 */
const colorMap = {
  success: 'text-success border-success/28',
  error: 'text-destructive border-destructive/28',
  warning: 'text-warning border-warning/28',
  info: 'text-info border-info/28',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      <TransitionGroup name="slide-up">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="glass-panel flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg"
          :class="colorMap[toast.type]"
        >
          <component :is="iconMap[toast.type]" class="h-4 w-4 shrink-0" />
          <span class="text-sm flex-1 text-foreground">{{ toast.message }}</span>
          <button
            class="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            @click="removeToast(toast.id)"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
