<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Aperture, Palette, Images, Wrench, Github, Info, MessageCircle, Sparkle, Settings, User, FileText, PenTool, Tags, Copy, Check, ExternalLink, GitBranch } from 'lucide-vue-next'
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
import { Separator } from '@/components/ui/separator'
import SectionLabel from '@/components/common/SectionLabel.vue'
import ThemeToggle from './ThemeToggle.vue'
import LanguageToggle from './LanguageToggle.vue'
import { useI18n } from '@/composables/useI18n'
import { useCopyFeedback } from '@/composables/useCopyFeedback'
import { useBlurEffect } from '@/composables/useBlurEffect'
import { useArtistSettings } from '@/composables/useArtistSettings'
import { useAigcSettings } from '@/composables/useAigcSettings'
import { useAccentColor, ACCENT_PRESETS } from '@/composables/useAccentColor'

const route = useRoute()
const router = useRouter()
const aboutOpen = ref(false)
const aboutTab = ref('settings')
const { t } = useI18n()
const { blurEnabled, toggleBlur } = useBlurEffect()
const { autoFillName, autoFillPrefix, customPrefix, canTogglePrefix, canEditPrefix, toggleAutoFillName, toggleAutoFillPrefix } = useArtistSettings()
const { autoParseTags, toggleAutoParseTags } = useAigcSettings()
const { accentColor, setAccent } = useAccentColor()

/* vite.config.ts 的 define 注入,跟 package.json 同源。模板看不到全局 const,得转一手 */
const appVersion = __APP_VERSION__

const QQ_GROUP = '1046260326'

/* 行内换图标而不是弹 toast —— 弹窗开着时 toast 会被遮住(见 useCopyFeedback) */
const { copiedKey: groupCopied, copy: copyGroup } = useCopyFeedback()

const navItems = computed(() => [
  { path: '/gallery', label: t('nav.artistGallery'), icon: Palette },
  { path: '/aigc', label: t('nav.aigcManager'), icon: Images },
  { path: '/toolbox', label: t('nav.toolbox'), icon: Wrench },
])

/*
 * 子 tab 归位放在**开启**这一侧,不能放在 @update:open 的关闭分支里。
 * 关闭时改 aboutTab,弹窗还在播 200ms 的退场动画,于是肉眼能看到它先跳回
 * "功能设置"再淡出 —— 从"关于作者"关闭时尤其明显。
 */
function openAbout() {
  aboutTab.value = 'settings'
  aboutOpen.value = true
}

// 主题色预设:默认(null)以琥珀 #ffb000 作为展示色点(= --primary 深色值,与主页同源)
const accentPresets = ACCENT_PRESETS.map(p => ({
  ...p,
  swatch: p.hex ?? '#ffb000',
}))

function isActiveAccent(hex: string | null) {
  return (accentColor.value ?? null) === (hex ?? null)
}
</script>

<template>
  <header
    class="glass-surface sticky top-0 z-50 w-full border-b"
  >
    <div class="flex h-[var(--header-height)] items-center px-4 md:px-6">
      <!-- Logo -->
      <button
        class="mr-6 flex items-center gap-2 transition-colors hover:text-primary"
        @click="router.push('/')"
      >
        <Aperture class="h-5 w-5 text-primary" />
        <!-- .display = Big Shoulders 压缩体大写。纯拉丁串才安全(line-height .86 会裁中文) -->
        <span class="display hidden text-[19px] sm:inline-block">AIGC Gallery</span>
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
          @click="openAbout"
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
  <Dialog v-model:open="aboutOpen">
    <DialogContent class="max-w-md w-[calc(100vw-2rem)]">
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
            <SectionLabel class="px-1">{{ t('settings.global') }}</SectionLabel>
            <button
              class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm transition-colors hover:bg-accent"
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
                  class="h-6 w-6 rounded-full transition-transform hover:scale-110"
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
            <SectionLabel class="px-1">{{ t('settings.artistGallery') }}</SectionLabel>

            <!-- Auto-fill filename -->
            <button
              class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm transition-colors hover:bg-accent"
              @click="toggleAutoFillName"
            >
              <div class="flex items-center gap-2">
                <FileText class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span>{{ t('settings.autoFillName') }}</span>
              </div>
              <Switch :model-value="autoFillName" class="pointer-events-none" tabindex="-1" />
            </button>

            <!-- Auto-fill artist prefix -->
            <!-- 禁用态只在按钮这一层压一次:此前外层 opacity-40 里又套了一个
                 disabled:opacity-50 的 Switch,实际渲染 0.20,比旁边的行明显更淡 -->
            <button
              class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm transition-colors"
              :class="canTogglePrefix ? 'hover:bg-accent' : 'opacity-45 cursor-not-allowed'"
              :disabled="!canTogglePrefix"
              @click="toggleAutoFillPrefix"
            >
              <div class="flex items-center gap-2">
                <PenTool class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span>{{ t('settings.autoFillPrefix') }}</span>
              </div>
              <Switch :model-value="autoFillPrefix" class="pointer-events-none" tabindex="-1" />
            </button>
            <p v-if="!canTogglePrefix" class="text-2xs text-dim px-3">{{ t('settings.autoFillPrefixHint') }}</p>

            <!-- Custom prefix input -->
            <div class="px-3 pt-1">
              <label class="text-2xs text-muted-foreground mb-1 block">{{ t('settings.customPrefix') }}</label>
              <input
                v-model="customPrefix"
                :disabled="!canEditPrefix"
                type="text"
                class="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs font-mono transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                placeholder="artist:"
              />
            </div>
          </div>

          <!-- AIGC Library Settings -->
          <div class="space-y-1.5">
            <SectionLabel class="px-1">{{ t('settings.aigcManager') }}</SectionLabel>

            <!-- Auto-extract tags on upload -->
            <button
              class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm transition-colors hover:bg-accent"
              @click="toggleAutoParseTags"
            >
              <div class="flex items-center gap-2">
                <Tags class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span>{{ t('settings.autoParseTags') }}</span>
              </div>
              <Switch :model-value="autoParseTags" class="pointer-events-none" tabindex="-1" />
            </button>
          </div>
        </TabsContent>

        <!-- Author Tab -->
        <TabsContent value="author" class="mt-3 space-y-3">
          <!--
            铭牌。.display 自带 uppercase,所以 markup 里留可读的 Pilot1337;
            line-height .86 裁中日韩字形那条限制不适用 —— 这是纯拉丁串。
            字标不上琥珀:单强调色只留给 hover 的外链箭头和复制成功的对勾。
          -->
          <div class="px-1">
            <SectionLabel>{{ t('about.authorEyebrow') }}</SectionLabel>
            <p class="display mt-1 text-[28px] sm:text-[34px]">Pilot1337</p>
          </div>

          <Separator />

          <!--
            四条读出行沿用「功能设置」的行骨架,但主次反过来:这里值才是主体,
            所以标签压成 text-muted-foreground,值用默认前景色。
          -->
          <div class="space-y-1">
            <!-- Homepage -->
            <a
              href="https://github.com/jsh135790"
              target="_blank"
              rel="noopener noreferrer"
              class="group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm transition-colors hover:bg-accent"
            >
              <span class="flex items-center gap-2">
                <Github class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span class="text-muted-foreground">{{ t('about.homepage') }}</span>
              </span>
              <span class="flex items-center gap-1.5 font-mono">
                jsh135790
                <ExternalLink class="h-3 w-3 text-dim transition-colors group-hover:text-primary" />
              </span>
            </a>

            <!-- Repository -->
            <a
              href="https://github.com/jsh135790/aigc-gallery"
              target="_blank"
              rel="noopener noreferrer"
              class="group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm transition-colors hover:bg-accent"
            >
              <span class="flex items-center gap-2">
                <GitBranch class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span class="text-muted-foreground">{{ t('about.repository') }}</span>
              </span>
              <span class="flex items-center gap-1.5 font-mono">
                aigc-gallery
                <ExternalLink class="h-3 w-3 text-dim transition-colors group-hover:text-primary" />
              </span>
            </a>

            <!-- QQ Group -->
            <div class="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm">
              <span class="flex items-center gap-2">
                <MessageCircle class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span class="text-muted-foreground">{{ t('about.feedbackGroup') }}</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="readout font-mono font-medium">{{ QQ_GROUP }}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-6 w-6"
                  :aria-label="t('common.copy')"
                  @click="copyGroup(QQ_GROUP)"
                >
                  <Check v-if="groupCopied" class="h-3 w-3 text-primary" />
                  <Copy v-else class="h-3 w-3" />
                </Button>
              </span>
            </div>

            <!-- Version -->
            <div class="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs sm:text-sm">
              <span class="flex items-center gap-2">
                <Aperture class="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                <span class="text-muted-foreground">{{ t('about.version') }}</span>
              </span>
              <span class="readout font-mono text-dim">v{{ appVersion }}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>
