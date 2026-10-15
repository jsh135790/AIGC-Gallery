<script setup lang="ts">
import { EyeOff } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import { usePrivacyMode } from '@/composables/usePrivacyMode'

/*
 * 「以 NSFW 导入」:AIGC 导入是拖进来立刻入库的,没有上传弹窗可勾,标记只能在落库前就定好。
 * 状态本机记住(usePrivacyMode.uploadAsNsfw)—— 忘了关的代价只是多标几张,没标上的还有全遮档兜底。
 */
const { t } = useI18n()
const { uploadAsNsfw } = usePrivacyMode()
</script>

<template>
  <button
    type="button"
    class="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors"
    :class="uploadAsNsfw ? 'hair-amber bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
    :aria-pressed="uploadAsNsfw"
    :title="t('privacy.uploadAsNsfwHint')"
    @click="uploadAsNsfw = !uploadAsNsfw"
  >
    <EyeOff class="h-3.5 w-3.5" />
    {{ t('privacy.uploadAsNsfw') }}
  </button>
</template>
