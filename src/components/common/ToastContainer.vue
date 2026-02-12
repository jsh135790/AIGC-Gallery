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

const colorMap = {
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
      <TransitionGroup name="slide-up">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-lg"
          :class="colorMap[toast.type]"
        >
          <component :is="iconMap[toast.type]" class="h-4 w-4 shrink-0" />
          <span class="text-sm flex-1">{{ toast.message }}</span>
          <button
            class="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
            @click="removeToast(toast.id)"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
