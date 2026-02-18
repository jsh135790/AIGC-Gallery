<script setup lang="ts">
import { useThemeStore } from '@/stores/themeStore'
import { useI18n } from '@/composables/useI18n'
import { Sun, Moon, Monitor, Check } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const themeStore = useThemeStore()
const { t } = useI18n()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="relative h-9 w-9">
        <Sun
          class="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
        />
        <Moon
          class="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
        />
        <span class="sr-only">{{ t('theme.toggle') }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="glass-heavy">
      <DropdownMenuItem @click="themeStore.setTheme('light')" class="cursor-pointer gap-2">
        <Check class="h-4 w-4" :class="themeStore.theme === 'light' ? 'opacity-100' : 'opacity-0'" />
        <Sun class="h-4 w-4" />
        <span>{{ t('theme.light') }}</span>
      </DropdownMenuItem>
      <DropdownMenuItem @click="themeStore.setTheme('dark')" class="cursor-pointer gap-2">
        <Check class="h-4 w-4" :class="themeStore.theme === 'dark' ? 'opacity-100' : 'opacity-0'" />
        <Moon class="h-4 w-4" />
        <span>{{ t('theme.dark') }}</span>
      </DropdownMenuItem>
      <DropdownMenuItem @click="themeStore.setTheme('system')" class="cursor-pointer gap-2">
        <Check class="h-4 w-4" :class="themeStore.theme === 'system' ? 'opacity-100' : 'opacity-0'" />
        <Monitor class="h-4 w-4" />
        <span>{{ t('theme.system') }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
