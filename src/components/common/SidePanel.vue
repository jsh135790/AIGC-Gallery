<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { X } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'

withDefaults(defineProps<{
  open: boolean
  title?: string
  /** 面板宽度(覆盖默认 sm:max-w-md,如 ArtistForm 传 sm:max-w-lg) */
  widthClass?: HTMLAttributes['class']
}>(), {
  title: '',
  widthClass: 'sm:max-w-md',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()
</script>

<template>
  <Sheet :open="open" @update:open="v => emit('update:open', v)">
    <!-- 底色/模糊/遮罩全部由 sheetVariants 的 .glass-surface + SheetContent 默认遮罩提供,
         关掉模糊时 --glass-alpha 自动翻成 1,这里不需要再写 blurEnabled 三元。
         border-l 由 sheetVariants 给,这里不重复。 -->
    <SheetContent
      side="right"
      class="flex w-full flex-col"
      :class="widthClass"
    >
      <!-- Header -->
      <div class="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
        <SheetTitle class="truncate text-sm font-semibold text-foreground">{{ title }}</SheetTitle>
        <div class="flex shrink-0 items-center gap-1">
          <slot name="header-actions" />
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :aria-label="t('common.close')"
            @click="emit('update:open', false)"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto">
        <slot />
      </div>

      <!-- Footer -->
      <div v-if="$slots.footer" class="shrink-0 border-t px-4 py-3">
        <slot name="footer" />
      </div>
    </SheetContent>
  </Sheet>
</template>
