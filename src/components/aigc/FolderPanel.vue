<script setup lang="ts">
import { ref, computed } from 'vue'
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

const store = useAigcStore()
const { t } = useI18n()

const ICON_MAP: Record<string, any> = {
  Images, Inbox, Heart, Folder, FolderPlus, Palette,
}

// New folder dialog
const newFolderOpen = ref(false)
const newFolderName = ref('')
const newFolderColor = ref('#6366f1')
const editingFolderId = ref<number | null>(null)

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#64748b',
]

function getIcon(name: string) {
  return ICON_MAP[name] || Folder
}

function selectFolder(item: FolderNavItem) {
  store.selectedFolderId = item.id
}

function openNewFolder() {
  editingFolderId.value = null
  newFolderName.value = ''
  newFolderColor.value = '#6366f1'
  newFolderOpen.value = true
}

function openEditFolder(item: FolderNavItem) {
  if (item.isSystem) return
  editingFolderId.value = item.id as number
  newFolderName.value = item.name
  newFolderColor.value = item.color || '#6366f1'
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
      <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{{ t('folder.categories') }}</h2>
    </div>

    <ScrollArea class="flex-1 px-2">
      <nav class="space-y-0.5 pb-4">
        <template v-for="item in store.folderNavItems" :key="item.id">
          <!-- System separator before user folders -->
          <Separator
            v-if="!item.isSystem && store.folderNavItems.indexOf(item) === 3"
            class="my-2"
          />

          <div
            class="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all cursor-pointer"
            :class="[
              store.selectedFolderId === item.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            ]"
            @click="selectFolder(item)"
          >
            <!-- Color dot for user folders -->
            <div
              v-if="!item.isSystem && item.color"
              class="h-2.5 w-2.5 rounded-full shrink-0"
              :style="{ backgroundColor: item.color }"
            />
            <component
              v-else
              :is="getIcon(item.icon)"
              class="h-4 w-4 shrink-0"
            />

            <span class="flex-1 truncate">{{ getFolderName(item) }}</span>

            <span
              class="text-xs tabular-nums"
              :class="store.selectedFolderId === item.id ? 'text-primary/70' : 'text-muted-foreground/50'"
            >
              {{ item.count }}
            </span>

            <!-- Context menu for user folders -->
            <DropdownMenu v-if="!item.isSystem">
              <DropdownMenuTrigger as-child>
                <button
                  class="flex h-5 w-5 items-center justify-center rounded opacity-30 group-hover:opacity-100 hover:bg-muted transition-all"
                  @click.stop
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
          </div>
        </template>
      </nav>
    </ScrollArea>

    <!-- Add folder button -->
    <div class="border-t border-border/40 p-3">
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
      <DialogContent class="max-w-sm glass-heavy">
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
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in COLORS"
                :key="color"
                class="h-6 w-6 rounded-full transition-transform hover:scale-110 ring-offset-2 ring-offset-background"
                :class="newFolderColor === color && 'ring-2 ring-primary scale-110'"
                :style="{ backgroundColor: color }"
                @click="newFolderColor = color"
              />
            </div>
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
