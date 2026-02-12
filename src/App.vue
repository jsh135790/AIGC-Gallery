<script setup lang="ts">
import { useThemeStore } from '@/stores/themeStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useRouter } from 'vue-router'

const themeStore = useThemeStore()
const router = useRouter()
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
