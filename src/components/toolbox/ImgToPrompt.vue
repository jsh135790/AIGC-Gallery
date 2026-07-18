<script setup lang="ts">
import { ImagePlus } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import EmptyState from '@/components/common/EmptyState.vue'

const { t } = useI18n()
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <EmptyState :title="t('toolbox.imgToPrompt')" :description="t('toolbox.wip')">
      <template #icon>
        <ImagePlus />
      </template>
    </EmptyState>
  </div>
</template>
