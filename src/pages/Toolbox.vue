<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PanelLeftClose, PanelLeft } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import ToolboxSidebar from '@/components/toolbox/ToolboxSidebar.vue'
import MetadataEditor from '@/components/toolbox/MetadataEditor.vue'
import NaiToSd from '@/components/toolbox/NaiToSd.vue'
import SdToNai from '@/components/toolbox/SdToNai.vue'
import ImgToPrompt from '@/components/toolbox/ImgToPrompt.vue'

const { t } = useI18n()

const sidebarOpen = ref(true)
const isMobile = ref(false)
const isInitialized = ref(false)
const activeTool = ref<'metadata-editor' | 'nai-to-sd' | 'sd-to-nai' | 'img-to-prompt'>('metadata-editor')

const toolTitles = {
  'metadata-editor': 'toolbox.metadataEditor',
  'nai-to-sd': 'toolbox.naiToSd',
  'sd-to-nai': 'toolbox.sdToNai',
  'img-to-prompt': 'toolbox.imgToPrompt',
}

function handleToolChange(tool: string) {
  activeTool.value = tool as typeof activeTool.value
  // Auto-close sidebar on mobile after selecting a tool
  if (isMobile.value) {
    sidebarOpen.value = false
  }
}

onMounted(() => {
  // Check if mobile on mount
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    sidebarOpen.value = false
  }
  // Mark as initialized after setting initial state
  setTimeout(() => {
    isInitialized.value = true
  }, 0)
  // Listen for resize
  const handleResize = () => {
    isMobile.value = window.innerWidth < 768
  }
  window.addEventListener('resize', handleResize)
})
</script>

<template>
  <div class="flex h-[calc(100vh-3.5rem)]">
    <!-- Sidebar -->
    <Transition :name="isInitialized ? 'slide-left' : ''">
      <aside
        v-if="sidebarOpen"
        class="w-56 shrink-0 border-r border-border/40 bg-sidebar/50 backdrop-blur-lg md:relative fixed top-[3.5rem] md:top-0 bottom-0 left-0 z-[45]"
      >
        <ToolboxSidebar v-model="activeTool" @update:model-value="handleToolChange" />
      </aside>
    </Transition>

    <!-- Overlay for mobile -->
    <Transition name="fade">
      <div
        v-if="sidebarOpen && isMobile"
        class="fixed inset-0 bg-black/50 z-[44] md:hidden"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Toolbar -->
      <div class="border-b border-border/40 bg-background/60 backdrop-blur-sm px-4 py-3">
        <div class="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            class="h-8 w-8 shrink-0"
            @click="sidebarOpen = !sidebarOpen"
          >
            <PanelLeft v-if="!sidebarOpen" class="h-4 w-4" />
            <PanelLeftClose v-else class="h-4 w-4" />
          </Button>

          <h2 class="text-sm font-semibold">{{ t(toolTitles[activeTool]) }}</h2>
        </div>
      </div>

      <!-- Tool Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <MetadataEditor v-if="activeTool === 'metadata-editor'" />
        <NaiToSd v-else-if="activeTool === 'nai-to-sd'" />
        <SdToNai v-else-if="activeTool === 'sd-to-nai'" />
        <ImgToPrompt v-else-if="activeTool === 'img-to-prompt'" />
      </div>
    </main>
  </div>
</template>
