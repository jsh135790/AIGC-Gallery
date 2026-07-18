<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Plus, MoreHorizontal, Pencil, Trash2, ArrowUp, ArrowDown,
} from 'lucide-vue-next'
import { useArtistStore } from '@/stores/artistStore'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import SectionLabel from '@/components/common/SectionLabel.vue'
import ColorSwatchPicker from '@/components/common/ColorSwatchPicker.vue'
import SidebarItem from '@/components/layout/SidebarItem.vue'
import { DEFAULT_SWATCH } from '@/lib/colors'

const store = useArtistStore()
const { t } = useI18n()
const toast = useToast()

// ===== New / edit dialog =====
const dialogOpen = ref(false)
const editingPageId = ref<number | null>(null)
const formName = ref('')
const formColor = ref<string>(DEFAULT_SWATCH)

function openNew() {
  editingPageId.value = null
  formName.value = ''
  formColor.value = DEFAULT_SWATCH
  dialogOpen.value = true
}

function openEdit(id: number) {
  const page = store.pages.find(p => p.id === id)
  if (!page) return
  editingPageId.value = id
  formName.value = page.name
  formColor.value = page.color || DEFAULT_SWATCH
  dialogOpen.value = true
}

async function savePage() {
  const name = formName.value.trim()
  if (!name) return
  if (editingPageId.value != null) {
    await store.updatePage(editingPageId.value, { name, color: formColor.value })
    toast.success(t('artistPage.renamed'))
  } else {
    const id = await store.addPage({ name, color: formColor.value })
    store.selectedPageId = id
    toast.success(t('artistPage.created'))
  }
  dialogOpen.value = false
}

// ===== Delete confirm =====
const deleteConfirmOpen = ref(false)
const deletingPageId = ref<number | null>(null)
const deletingPageName = computed(() => {
  const p = store.pages.find(pg => pg.id === deletingPageId.value)
  return p?.name ?? ''
})
const fallbackPageName = computed(() => {
  // Page that will receive orphaned artists (first remaining by sortOrder)
  const remaining = store.sortedPages.filter(p => p.id !== deletingPageId.value)
  return remaining[0]?.name ?? ''
})

function requestDelete(id: number) {
  if (store.pages.length <= 1) {
    toast.error(t('artistPage.cannotDeleteLast'))
    return
  }
  deletingPageId.value = id
  deleteConfirmOpen.value = true
}

async function confirmDelete() {
  if (deletingPageId.value == null) return
  const res = await store.deletePage(deletingPageId.value)
  if (!res.ok && res.reason === 'last') {
    toast.error(t('artistPage.cannotDeleteLast'))
  } else if (res.ok) {
    toast.success(t('artistPage.deleted'))
  }
  deleteConfirmOpen.value = false
  deletingPageId.value = null
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="p-4 pb-2">
      <SectionLabel>{{ t('artistPage.title') }}</SectionLabel>
    </div>

    <ScrollArea class="flex-1 px-2">
      <nav class="space-y-0.5 pb-4">
        <SidebarItem
          v-for="page in store.sortedPages"
          :key="page.id"
          :active="store.selectedPageId === page.id"
          :label="page.name"
          :count="store.pageCounts[page.id!] ?? 0"
          :color="page.color || DEFAULT_SWATCH"
          @click="store.selectedPageId = page.id!"
        >
          <template #trailing>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <button
                  type="button"
                  class="flex h-5 w-5 cursor-pointer items-center justify-center rounded hover:bg-foreground/10 transition-colors"
                  :aria-label="t('common.more')"
                >
                  <MoreHorizontal class="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-40">
                <DropdownMenuItem class="gap-2" @click="openEdit(page.id!)">
                  <Pencil class="h-3.5 w-3.5" />
                  {{ t('artistPage.editPage') }}
                </DropdownMenuItem>
                <DropdownMenuItem class="gap-2" @click="store.movePageUp(page.id!)">
                  <ArrowUp class="h-3.5 w-3.5" />
                  {{ t('artistPage.moveUp') }}
                </DropdownMenuItem>
                <DropdownMenuItem class="gap-2" @click="store.movePageDown(page.id!)">
                  <ArrowDown class="h-3.5 w-3.5" />
                  {{ t('artistPage.moveDown') }}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  class="gap-2 text-destructive focus:text-destructive"
                  @click="requestDelete(page.id!)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                  {{ t('artistPage.deletePage') }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </template>
        </SidebarItem>
      </nav>
    </ScrollArea>

    <!-- New page button -->
    <div class="border-t border-sidebar-border p-3">
      <Button
        variant="ghost"
        size="sm"
        class="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        @click="openNew"
      >
        <Plus class="h-4 w-4" />
        {{ t('artistPage.newPage') }}
      </Button>
    </div>

    <!-- New / edit dialog -->
    <Dialog :open="dialogOpen" @update:open="dialogOpen = $event">
      <DialogContent class="max-w-sm w-[calc(100vw-2rem)] glass-heavy">
        <DialogHeader>
          <DialogTitle>
            {{ editingPageId != null ? t('artistPage.editPage') : t('artistPage.newPage') }}
          </DialogTitle>
          <DialogDescription>{{ t('artistPage.dialogDescription') }}</DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <Input
            v-model="formName"
            :placeholder="t('artistPage.nameLabel')"
            @keydown.enter="savePage"
          />
          <div class="space-y-2">
            <label class="text-sm text-muted-foreground">{{ t('artistPage.colorLabel') }}</label>
            <ColorSwatchPicker v-model="formColor" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="dialogOpen = false">{{ t('common.cancel') }}</Button>
          <Button @click="savePage" :disabled="!formName.trim()">
            {{ editingPageId != null ? t('common.save') : t('common.create') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete confirm dialog -->
    <Dialog :open="deleteConfirmOpen" @update:open="deleteConfirmOpen = $event">
      <DialogContent class="max-w-sm w-[calc(100vw-2rem)] glass-heavy">
        <DialogHeader>
          <DialogTitle>{{ t('artistPage.deletePage') }}</DialogTitle>
          <DialogDescription>
            {{ t('artistPage.deleteConfirm', { name: deletingPageName, target: fallbackPageName }) }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="deleteConfirmOpen = false">{{ t('common.cancel') }}</Button>
          <Button variant="destructive" @click="confirmDelete">{{ t('common.delete') }}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
