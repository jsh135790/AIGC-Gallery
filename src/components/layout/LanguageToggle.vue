<script setup lang="ts">
import { Languages, Check } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const { locale, setLocale, t } = useI18n()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="h-9 w-9">
        <Languages class="h-4 w-4" />
        <span class="sr-only">{{ t('language.label') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        @click="setLocale('zh-CN')"
        class="gap-2"
      >
        <Check class="h-4 w-4" :class="locale === 'zh-CN' ? 'opacity-100' : 'opacity-0'" />
        {{ t('language.zh') }}
      </DropdownMenuItem>
      <DropdownMenuItem
        @click="setLocale('en')"
        class="gap-2"
      >
        <Check class="h-4 w-4" :class="locale === 'en' ? 'opacity-100' : 'opacity-0'" />
        {{ t('language.en') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
