<script setup lang="ts">
import { useThemeStore } from '@/stores/themeStore'
import { useBrandFavicon } from '@/composables/useBrandFavicon'
import AppHeader from '@/components/layout/AppHeader.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { startStorageStatus } from '@/composables/useStorageStatus'
import { libraryCoordinator } from '@/lib/storage/coordination'
import { useI18n } from '@/composables/useI18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

startStorageStatus()
const { t } = useI18n()
const stale = libraryCoordinator.remoteStale
function reloadLibrary() { location.reload() }

/*
 * 这个调用本身就是副作用:themeStore 在 setup 里同步跑一次 applyTheme(),
 * 首帧就带上 .dark。返回值没人用,但**不能删调用** —— 删了主题就不会初始化。
 */
useThemeStore()
useBrandFavicon()
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <AppHeader />
    <router-view v-slot="{ Component, route }">
      <transition name="fade" mode="out-in">
        <component :is="Component" :key="route.path" />
      </transition>
    </router-view>
    <ToastContainer />
    <Dialog :open="stale">
      <DialogContent @escape-key-down.prevent @interact-outside.prevent>
        <DialogHeader>
          <DialogTitle>{{ t('storage.staleTitle') }}</DialogTitle>
          <DialogDescription>{{ t('storage.staleNote') }}</DialogDescription>
        </DialogHeader>
        <Button @click="reloadLibrary">{{ t('storage.reload') }}</Button>
      </DialogContent>
    </Dialog>
  </div>
</template>
