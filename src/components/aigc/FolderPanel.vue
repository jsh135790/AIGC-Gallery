<script setup lang="ts">
import { ref } from 'vue'
import {
  Images, Inbox, Heart, Folder, FolderPlus,
  MoreHorizontal, Pencil, Trash2, Palette,
} from 'lucide-vue-next'
import { useAigcStore } from '@/stores/aigcStore'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FolderNavItem } from '@/types'
import { DEFAULT_SWATCH } from '@/lib/colors'
import SectionLabel from '@/components/common/SectionLabel.vue'
import ColorSwatchPicker from '@/components/common/ColorSwatchPicker.vue'
import SidebarItem from '@/components/layout/SidebarItem.vue'

const store = useAigcStore()
const { t } = useI18n()

const ICON_MAP: Record<string, any> = {
  Images, Inbox, Heart, Folder, FolderPlus, Palette,
}

// New folder dialog
const newFolderOpen = ref(false)
const newFolderName = ref('')
const newFolderColor = ref<string>(DEFAULT_SWATCH)
const editingFolderId = ref<number | null>(null)

function getIcon(name: string) {
  return ICON_MAP[name] || Folder
}

function selectFolder(item: FolderNavItem) {
  store.selectedFolderId = item.id
}

function openNewFolder() {
  editingFolderId.value = null
  newFolderName.value = ''
  newFolderColor.value = DEFAULT_SWATCH
  newFolderOpen.value = true
}

function openEditFolder(item: FolderNavItem) {
  if (item.isSystem) return
  editingFolderId.value = item.id as number
  newFolderName.value = item.name
  newFolderColor.value = item.color || DEFAULT_SWATCH
  newFolderOpen.value = true
}

async function saveFolder() {
  const name = newFolderName.value.trim()
  if (!name) return

  if (editingFolderId.value) {
    await store.updateFolder(editingFolderId.value, {
      name,
      color: newFolderColor.value,
    })
  } else {
    await store.addFolder({
      name,
      description: '',
      color: newFolderColor.value,
      icon: 'Folder',
    })
  }
  newFolderOpen.value = false
}

async function handleDeleteFolder(id: number) {
  await store.deleteFolder(id)
  if (store.selectedFolderId === id) {
    store.selectedFolderId = 'all'
  }
}
// Translate system folder names
function getFolderName(item: FolderNavItem): string {
  if (item.id === 'all') return t('aigc.allImages')
  if (item.id === 'uncategorized') return t('aigc.uncategorized')
  if (item.id === 'favorites') return t('common.favorites')
  return item.name
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="p-4 pb-2">
      <SectionLabel>{{ t('folder.categories') }}</SectionLabel>
    </div>

    <ScrollArea class="flex-1 px-2">
      <nav class="space-y-0.5 pb-4">
        <template v-for="item in store.folderNavItems" :key="item.id">
          <!-- System separator before user folders -->
          <Separator
            v-if="!item.isSystem && store.folderNavItems.indexOf(item) === 3"
            class="my-2"
          />

          <SidebarItem
            :active="store.selectedFolderId === item.id"
            :label="getFolderName(item)"
            :count="item.count"
            :color="!item.isSystem ? item.color : undefined"
            @click="selectFolder(item)"
          >
            <template v-if="item.isSystem || !item.color" #icon>
              <component :is="getIcon(item.icon)" />
            </template>
            <template v-if="!item.isSystem" #trailing>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <button
                    type="button"
                    class="flex h-5 w-5 cursor-pointer items-center justify-center rounded hover:bg-accent transition-colors"
                    :aria-label="t('common.more')"
                  >
                    <MoreHorizontal class="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-36">
                  <DropdownMenuItem class="gap-2" @click="openEditFolder(item)">
                    <Pencil class="h-3.5 w-3.5" />
                    {{ t('common.rename') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem class="gap-2 text-destructive" @click="handleDeleteFolder(item.id as number)">
                    <Trash2 class="h-3.5 w-3.5" />
                    {{ t('common.delete') }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </template>
          </SidebarItem>
        </template>
      </nav>
    </ScrollArea>

    <!-- Add folder button -->
    <div class="border-t border-sidebar-border p-3">
      <Button
        variant="ghost"
        size="sm"
        class="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        @click="openNewFolder"
      >
        <FolderPlus class="h-4 w-4" />
        {{ t('folder.newFolder') }}
      </Button>
    </div>

    <!-- New/Edit Folder Dialog -->
    <Dialog :open="newFolderOpen" @update:open="newFolderOpen = $event">
      <DialogContent class="max-w-sm w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>{{ editingFolderId ? t('folder.editFolder') : t('folder.newFolder') }}</DialogTitle>
          <DialogDescription>{{ t('folder.createDescription') }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <Input
            v-model="newFolderName"
            :placeholder="t('folder.folderName')"
            @keydown.enter="saveFolder"
          />
          <div class="space-y-2">
            <label class="text-sm text-muted-foreground">{{ t('folder.folderColor') }}</label>
            <ColorSwatchPicker v-model="newFolderColor" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="newFolderOpen = false">{{ t('common.cancel') }}</Button>
          <Button @click="saveFolder" :disabled="!newFolderName.trim()">
            {{ editingFolderId ? t('common.save') : t('common.create') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
