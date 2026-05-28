<script setup lang="ts">
import { ref, computed, nextTick, watch, useTemplateRef } from 'vue'
import {
  Plus, MoreHorizontal, Pencil, Trash2,
  ChevronLeft, ChevronRight, ArrowLeft, ArrowRight,
} from 'lucide-vue-next'
import { useArtistStore } from '@/stores/artistStore'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

const store = useArtistStore()
const { t } = useI18n()
const toast = useToast()

const PAGE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#64748b',
]

const scrollerEl = useTemplateRef<HTMLDivElement>('scrollerEl')
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

function updateScrollAffordance() {
  const el = scrollerEl.value
  if (!el) return
  canScrollLeft.value = el.scrollLeft > 4
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

function onScrollerScroll() {
  updateScrollAffordance()
}

function scrollByAmount(delta: number) {
  scrollerEl.value?.scrollBy({ left: delta, behavior: 'smooth' })
}

// Recompute scroll affordance whenever pages change
watch(() => store.sortedPages.length, async () => {
  await nextTick()
  updateScrollAffordance()
}, { immediate: true })

// Ensure selected tab is visible (when changed externally)
watch(() => store.selectedPageId, async (id) => {
  if (id == null) return
  await nextTick()
  const el = scrollerEl.value?.querySelector<HTMLElement>(`[data-page-id="${id}"]`)
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  updateScrollAffordance()
})

// ===== New / edit dialog =====
const dialogOpen = ref(false)
const editingPageId = ref<number | null>(null)
const formName = ref('')
const formColor = ref(PAGE_COLORS[0])

function openNew() {
  editingPageId.value = null
  formName.value = ''
  formColor.value = PAGE_COLORS[0]
  dialogOpen.value = true
}

function openEdit(id: number) {
  const page = store.pages.find(p => p.id === id)
  if (!page) return
  editingPageId.value = id
  formName.value = page.name
  formColor.value = page.color || PAGE_COLORS[0]
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

function selectPage(id: number) {
  store.selectedPageId = id
}
</script>

<template>
  <div class="relative flex items-center gap-1 border-b border-border/40">
    <!-- Left scroll affordance -->
    <button
      v-if="canScrollLeft"
      class="absolute left-0 top-0 bottom-0 z-10 flex w-8 items-center justify-center bg-linear-to-r from-background via-background/95 to-transparent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      :aria-label="t('common.scrollLeft')"
      @click="scrollByAmount(-200)"
    >
      <ChevronLeft class="h-4 w-4" />
    </button>

    <!-- Tab strip -->
    <div
      ref="scrollerEl"
      class="page-tab-scroller flex flex-1 items-stretch overflow-x-auto"
      @scroll="onScrollerScroll"
    >
      <div class="flex items-stretch gap-0.5 pr-2">
        <div
          v-for="page in store.sortedPages"
          :key="page.id"
          :data-page-id="page.id"
          role="tab"
          tabindex="0"
          class="group relative inline-flex shrink-0 cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          :class="store.selectedPageId === page.id
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'"
          :aria-selected="store.selectedPageId === page.id"
          @click="selectPage(page.id!)"
          @keydown.enter.prevent="selectPage(page.id!)"
          @keydown.space.prevent="selectPage(page.id!)"
        >
          <!-- Color dot -->
          <span
            class="h-2 w-2 shrink-0 rounded-full"
            :style="{ backgroundColor: page.color || '#6366f1' }"
          />
          <span class="max-w-[160px] truncate">{{ page.name }}</span>
          <span
            class="rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-normal"
            :class="store.selectedPageId === page.id
              ? 'bg-foreground/10 text-foreground'
              : 'bg-muted text-muted-foreground/80'"
          >
            {{ store.pageCounts[page.id!] ?? 0 }}
          </span>

          <!-- Per-tab actions menu (don't trigger select) -->
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="ml-0.5 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-foreground/10 transition-opacity"
                :class="store.selectedPageId === page.id && 'opacity-60'"
                :aria-label="t('common.more')"
                @click.stop
                @keydown.enter.stop
                @keydown.space.stop
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
                <ArrowLeft class="h-3.5 w-3.5" />
                {{ t('artistPage.moveUp') }}
              </DropdownMenuItem>
              <DropdownMenuItem class="gap-2" @click="store.movePageDown(page.id!)">
                <ArrowRight class="h-3.5 w-3.5" />
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

          <!-- Selected underline -->
          <span
            v-if="store.selectedPageId === page.id"
            class="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-foreground"
          />
        </div>
      </div>
    </div>

    <!-- Right scroll affordance -->
    <button
      v-if="canScrollRight"
      class="absolute right-12 top-0 bottom-0 z-10 flex w-8 items-center justify-center bg-linear-to-l from-background via-background/95 to-transparent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      :aria-label="t('common.scrollRight')"
      @click="scrollByAmount(200)"
    >
      <ChevronRight class="h-4 w-4" />
    </button>

    <!-- New page button (pinned right) -->
    <Button
      variant="ghost"
      size="icon"
      class="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
      :aria-label="t('artistPage.newPage')"
      @click="openNew"
    >
      <Plus class="h-4 w-4" />
    </Button>

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
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in PAGE_COLORS"
                :key="color"
                type="button"
                class="h-6 w-6 cursor-pointer rounded-full transition-transform hover:scale-110 ring-offset-2 ring-offset-background"
                :class="formColor === color && 'ring-2 ring-primary scale-110'"
                :style="{ backgroundColor: color }"
                :aria-label="color"
                @click="formColor = color"
              />
            </div>
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

<style scoped>
/* Hide native scrollbar but keep scroll behavior */
.page-tab-scroller {
  scrollbar-width: none;
}
.page-tab-scroller::-webkit-scrollbar {
  display: none;
}
</style>
