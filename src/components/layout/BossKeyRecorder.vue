<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'
import { DEFAULT_BINDING, isModifierCode, usePrivacyMode, type BindingError } from '@/composables/usePrivacyMode'

/*
 * 老板键录制行。监听挂在 window 的**捕获**阶段并截停:关于弹窗(reka Dialog)在 document 上听 Esc,
 * 不先截住的话,按 Esc 取消录制会顺手把整个弹窗关掉;录到的键也不该再触发页面上的其他快捷操作。
 * 录制期间 usePrivacyMode.recording 为真,全局老板键监听让路。
 */
const props = defineProps<{ disabled?: boolean }>()

const { t } = useI18n()
const { binding, bindingLabel, recording, validateBinding } = usePrivacyMode()
const error = ref<BindingError | null>(null)

const isDefault = computed(() => JSON.stringify(binding.value) === JSON.stringify(DEFAULT_BINDING))

function onKeydown(e: KeyboardEvent) {
  e.preventDefault()
  e.stopImmediatePropagation()
  if (e.code === 'Escape') {
    stop()
    return
  }
  if (isModifierCode(e.code)) return
  const result = validateBinding(e)
  if ('error' in result) {
    error.value = result.error
    return
  }
  binding.value = result.binding
  stop()
}

function start() {
  if (props.disabled || recording.value) return
  error.value = null
  recording.value = true
  window.addEventListener('keydown', onKeydown, true)
}

function stop() {
  recording.value = false
  window.removeEventListener('keydown', onKeydown, true)
}

function reset() {
  error.value = null
  binding.value = { ...DEFAULT_BINDING }
}

// 弹窗关闭时内容卸载,录制态不能遗留 —— 否则全局老板键会一直让路
onUnmounted(stop)
</script>

<template>
  <div class="space-y-1 px-3 py-1.5" :class="disabled && 'opacity-45'">
    <div class="flex items-center justify-between gap-2 text-xs sm:text-sm">
      <span class="pl-6 text-muted-foreground">{{ t('settings.bossKeyBinding') }}</span>
      <div class="flex items-center gap-1.5">
        <kbd
          class="hair min-w-[2rem] rounded-sm px-1.5 py-0.5 text-center font-mono text-2xs"
          :class="recording ? 'hair-amber text-primary' : 'text-foreground'"
        >
          {{ recording ? t('settings.bossKeyListening') : bindingLabel }}
        </kbd>
        <Button
          variant="outline"
          size="sm"
          class="h-7 px-2 text-xs"
          :disabled="disabled"
          @click="recording ? stop() : start()"
        >
          {{ recording ? t('common.cancel') : t('settings.bossKeyRecord') }}
        </Button>
        <Button
          v-if="!isDefault && !recording"
          variant="ghost"
          size="sm"
          class="h-7 px-2 text-xs text-muted-foreground"
          :disabled="disabled"
          @click="reset"
        >
          {{ t('settings.bossKeyReset') }}
        </Button>
      </div>
    </div>
    <p v-if="error" class="pl-6 text-2xs text-destructive" role="alert">{{ t(error) }}</p>
  </div>
</template>
