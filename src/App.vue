<script setup lang="ts">
import { useThemeStore } from '@/stores/themeStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'

/*
 * 这个调用本身就是副作用:themeStore 在 setup 里同步跑一次 applyTheme(),
 * 首帧就带上 .dark。返回值没人用,但**不能删调用** —— 删了主题就不会初始化。
 */
useThemeStore()
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
  </div>
</template>
