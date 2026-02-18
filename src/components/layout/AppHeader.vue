<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Sparkles, Palette, Images, Github, Info, X, MessageCircle } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import ThemeToggle from './ThemeToggle.vue'
import LanguageToggle from './LanguageToggle.vue'
import { useI18n } from '@/composables/useI18n'

const route = useRoute()
const router = useRouter()
const aboutOpen = ref(false)
const { t } = useI18n()

const navItems = computed(() => [
  { path: '/gallery', label: t('nav.artistGallery'), icon: Palette },
  { path: '/aigc', label: t('nav.aigcManager'), icon: Images },
])
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xl supports-backdrop-filter:bg-background/40"
  >
    <div class="flex h-14 items-center px-4 md:px-6">
      <!-- Logo -->
      <button
        class="mr-6 flex items-center gap-2 font-semibold tracking-tight transition-colors hover:text-primary"
        @click="router.push('/')"
      >
        <Sparkles class="h-5 w-5 text-primary" />
        <span class="hidden text-lg sm:inline-block">AIGC Gallery</span>
      </button>

      <!-- Navigation -->
      <nav class="flex items-center gap-1">
        <Button
          v-for="item in navItems"
          :key="item.path"
          :variant="route.path === item.path ? 'secondary' : 'ghost'"
          size="sm"
          class="gap-2 transition-all"
          :class="[
            route.path === item.path
              ? 'bg-secondary/80 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          ]"
          @click="router.push(item.path)"
        >
          <component :is="item.icon" class="h-4 w-4" />
          <span class="hidden sm:inline">{{ item.label }}</span>
        </Button>
      </nav>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Actions -->
      <div class="flex items-center gap-1">
        <!-- GitHub -->
        <Button
          variant="ghost"
          size="icon"
          class="h-9 w-9"
          as="a"
          href="https://github.com/jsh135790/aigc-gallery"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Github class="h-4 w-4" />
          <span class="sr-only">GitHub</span>
        </Button>

        <!-- About -->
        <Button
          variant="ghost"
          size="icon"
          class="h-9 w-9"
          @click="aboutOpen = true"
        >
          <Info class="h-4 w-4" />
          <span class="sr-only">{{ t('nav.about') }}</span>
        </Button>

        <!-- Language -->
        <LanguageToggle />

        <!-- Theme -->
        <ThemeToggle />
      </div>
    </div>
  </header>

  <!-- About Dialog -->
  <Dialog :open="aboutOpen" @update:open="aboutOpen = $event">
    <DialogContent class="max-w-sm glass-heavy">
      <DialogHeader>
        <DialogTitle class="text-lg">{{ t('about.title') }}</DialogTitle>
        <DialogDescription>{{ t('about.description') }}</DialogDescription>
      </DialogHeader>

      <div class="mt-4 flex flex-col items-center gap-4">
        <!-- Avatar -->
        <img
          src="https://files.catbox.moe/ca2r4f.png"
          alt="Pilot1337"
          class="h-20 w-20 rounded-full border-2 border-border/60 object-cover shadow-md"
        />

        <!-- Info -->
        <div class="text-center space-y-1">
          <p class="text-base font-semibold">Pilot1337</p>
          <a
            href="https://github.com/jsh135790"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github class="h-3.5 w-3.5" />
            jsh135790
          </a>
        </div>

        <!-- QQ Group -->
        <div class="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5 text-sm">
          <MessageCircle class="h-4 w-4 text-muted-foreground shrink-0" />
          <span class="text-muted-foreground">{{ t('about.feedbackGroup') }}</span>
          <span class="font-mono font-medium">1046260326</span>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
