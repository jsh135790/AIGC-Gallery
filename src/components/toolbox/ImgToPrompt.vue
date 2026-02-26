<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const { t } = useI18n()
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <Card>
      <CardHeader>
        <CardTitle>{{ t('toolbox.imgToPrompt') }}</CardTitle>
        <CardDescription>{{ t('toolbox.imgToPromptDesc') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="text-sm text-muted-foreground">
          功能开发中...
        </div>
      </CardContent>
    </Card>
  </div>
</template>
