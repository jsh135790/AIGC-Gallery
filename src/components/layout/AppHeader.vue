<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Aperture, Palette, Images, Wrench, Github, Info, MessageCircle, Sparkle, Settings, User, FileText, PenTool } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import ThemeToggle from './ThemeToggle.vue'
import LanguageToggle from './LanguageToggle.vue'
import { useI18n } from '@/composables/useI18n'
import { useBlurEffect } from '@/composables/useBlurEffect'
import { useArtistSettings } from '@/composables/useArtistSettings'
import { useAccentColor, ACCENT_PRESETS } from '@/composables/useAccentColor'

const route = useRoute()
const router = useRouter()
const aboutOpen = ref(false)
const aboutTab = ref('settings')
const { t } = useI18n()
const { blurEnabled, toggleBlur } = useBlurEffect()
const { autoFillName, autoFillPrefix, customPrefix, canTogglePrefix, canEditPrefix, toggleAutoFillName, toggleAutoFillPrefix } = useArtistSettings()
const { accentColor, setAccent } = useAccentColor()

const navItems = computed(() => [
  { path: '/gallery', label: t('nav.artistGallery'), icon: Palette },
  { path: '/aigc', label: t('nav.aigcManager'), icon: Images },
  { path: '/toolbox', label: t('nav.toolbox'), icon: Wrench },
])

// 主题色预设:默认(null)以琥珀 #f5a623 作为展示色点
const accentPresets = ACCENT_PRESETS.map(p => ({
  ...p,
  swatch: p.hex ?? '#f5a623',
}))

function isActiveAccent(hex: string | null) {
  return (accentColor.value ?? null) === (hex ?? null)
}
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95"
  >
    <div class="flex h-[var(--header-height)] items-center px-4 md:px-6">
      <!-- Logo -->
      <button
        class="mr-6 flex items-center gap-2 transition-colors hover:text-primary"
        @click="router.push('/')"
      >
        <Aperture class="h-5 w-5 text-primary" />
        <span class="hidden font-mono text-sm font-medium uppercase tracking-[0.2em] sm:inline-block">AIGC Gallery</span>
      </button>

      <!-- Navigation:琥珀下划线式选中态 -->
      <nav class="flex h-full items-center">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="relative flex h-full items-center gap-2 px-3 text-sm font-medium transition-colors"
          :class="route.path === item.path
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'"
          @click="router.push(item.path)"
        >
          <component
            :is="item.icon"
            class="h-4 w-4"
            :class="route.path === item.path ? 'text-primary' : ''"
          />
          <span class="hidden sm:inline">{{ item.label }}</span>
          <span
            v-if="route.path === item.path"
            class="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
          />
        </button>
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
  <Dialog :open="aboutOpen" @update:open="v => { aboutOpen = v; if (!v) aboutTab = 'settings' }">
    <DialogContent class="max-w-md w-[calc(100vw-2rem)] glass-heavy">
      <DialogHeader>
        <DialogTitle class="text-lg">{{ t('about.title') }}</DialogTitle>
        <DialogDescription>{{ t('about.description') }}</DialogDescription>
      </DialogHeader>

      <Tabs v-model="aboutTab" class="mt-2">
        <TabsList class="grid w-full grid-cols-2">
          <TabsTrigger value="settings" class="gap-1.5">
            <Settings class="h-3.5 w-3.5" />
            {{ t('about.tabSettings') }}
          </TabsTrigger>
          <TabsTrigger value="author" class="gap-1.5">
            <User class="h-3.5 w-3.5" />
            {{ t('about.tabAuthor') }}
          </TabsTrigger>
        </TabsList>

        <!-- Settings Tab -->
        <TabsContent value="settings" class="mt-3 space-y-4">
          <!-- Global Settings -->
          <div class="space-y-1.5">
            <p class="font-mono text-2xs font-medium uppercase tracking-wider text-muted-foreground px-1">{{ t('settings.global') }}</p>
            <button
              class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm transition-colors hover:bg-muted/50"
              @click="toggleBlur"
            >
              <div class="flex items-center gap-2">
                <Sparkle class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span>{{ t('settings.blurEffect') }}</span>
              </div>
              <Switch :model-value="blurEnabled" class="pointer-events-none" tabindex="-1" />
            </button>

            <!-- Accent color -->
            <div class="rounded-lg px-3 py-2.5">
              <div class="flex items-center gap-2 mb-2.5">
                <Palette class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span class="text-xs sm:text-sm">{{ t('settings.accentColor') }}</span>
              </div>
              <div class="flex flex-wrap gap-2 pl-6">
                <button
                  v-for="preset in accentPresets"
                  :key="preset.name"
                  type="button"
                  class="h-6 w-6 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  :class="isActiveAccent(preset.hex) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110' : ''"
                  :style="{ backgroundColor: preset.swatch }"
                  :aria-label="preset.name"
                  :aria-pressed="isActiveAccent(preset.hex)"
                  @click="setAccent(preset.hex)"
                />
              </div>
            </div>
          </div>

          <!-- Artist Gallery Settings -->
          <div class="space-y-1.5">
            <p class="font-mono text-2xs font-medium uppercase tracking-wider text-muted-foreground px-1">{{ t('settings.artistGallery') }}</p>

            <!-- Auto-fill filename -->
            <button
              class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm transition-colors hover:bg-muted/50"
              @click="toggleAutoFillName"
            >
              <div class="flex items-center gap-2">
                <FileText class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span>{{ t('settings.autoFillName') }}</span>
              </div>
              <Switch :model-value="autoFillName" class="pointer-events-none" tabindex="-1" />
            </button>

            <!-- Auto-fill artist prefix -->
            <button
              class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm transition-colors"
              :class="canTogglePrefix ? 'hover:bg-muted/50' : 'opacity-40 cursor-not-allowed'"
              @click="toggleAutoFillPrefix"
            >
              <div class="flex items-center gap-2">
                <PenTool class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span>{{ t('settings.autoFillPrefix') }}</span>
              </div>
              <Switch :model-value="autoFillPrefix" :disabled="!canTogglePrefix" class="pointer-events-none" tabindex="-1" />
            </button>
            <p v-if="!canTogglePrefix" class="text-2xs text-muted-foreground/60 px-3">{{ t('settings.autoFillPrefixHint') }}</p>

            <!-- Custom prefix input -->
            <div class="px-3 pt-1">
              <label class="text-2xs text-muted-foreground mb-1 block">{{ t('settings.customPrefix') }}</label>
              <input
                v-model="customPrefix"
                :disabled="!canEditPrefix"
                type="text"
                class="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-40 disabled:cursor-not-allowed"
                placeholder="artist:"
              />
            </div>
          </div>
        </TabsContent>

        <!-- Author Tab -->
        <TabsContent value="author" class="mt-3 flex flex-col items-center gap-4">
          <!-- Avatar -->
          <img
            src="https://files.catbox.moe/ca2r4f.png"
            alt="Pilot1337"
            class="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-border/60 object-cover"
          />

          <!-- Info -->
          <div class="text-center space-y-1">
            <p class="text-sm sm:text-base font-semibold">Pilot1337</p>
            <a
              href="https://github.com/jsh135790"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github class="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              jsh135790
            </a>
          </div>

          <!-- QQ Group -->
          <div class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm">
            <MessageCircle class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            <span class="text-muted-foreground">{{ t('about.feedbackGroup') }}</span>
            <span class="font-mono font-medium">1046260326</span>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
