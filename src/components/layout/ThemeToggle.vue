<script setup lang="ts">
import { useThemeStore } from '@/stores/themeStore'
import { Sun, Moon, Monitor } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const themeStore = useThemeStore()
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
        <span class="sr-only">切换主题</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="glass-heavy">
      <DropdownMenuItem @click="themeStore.setTheme('light')" class="cursor-pointer gap-2">
        <Sun class="h-4 w-4" />
        <span>亮色</span>
      </DropdownMenuItem>
      <DropdownMenuItem @click="themeStore.setTheme('dark')" class="cursor-pointer gap-2">
        <Moon class="h-4 w-4" />
        <span>暗色</span>
      </DropdownMenuItem>
      <DropdownMenuItem @click="themeStore.setTheme('system')" class="cursor-pointer gap-2">
        <Monitor class="h-4 w-4" />
        <span>跟随系统</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
