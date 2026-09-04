<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { ChevronDown, Database, Download, Hash, RotateCcw, TriangleAlert } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import {
  cloneParsedMetadata,
  useMetadataEditor,
  type ChangedField,
  type ParamRow,
} from '@/composables/useMetadataEditor'
import { useAigcStore } from '@/stores/aigcStore'
import { useToast } from '@/composables/useToast'
import { parseImageMetadata } from '@/lib/parser'
import { MetadataWriteError, writePNGMetadata } from '@/lib/parser/png-writer'
import type { ImageSource } from '@/types'
import { Button } from '@/components/ui/button'
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
import DropZone from '@/components/common/DropZone.vue'
import ImageLightbox from '@/components/common/ImageLightbox.vue'
import SectionLabel from '@/components/common/SectionLabel.vue'
import MetadataCharacterCard from './MetadataCharacterCard.vue'
import MetadataEditorRail from './MetadataEditorRail.vue'
import MetadataParamsRail from './MetadataParamsRail.vue'
import MetadataPromptGroove from './MetadataPromptGroove.vue'

const { t } = useI18n()
const aigcStore = useAigcStore()
const { success, error, info } = useToast()
const {
  session,
  changedFields,
  isDirty,
  setEditingImage,
  resetAll,
  revertField,
} = useMetadataEditor()

/** 已知字段的规范拼写。参数名不翻译 —— 它们就是文件里那些键 */
const KNOWN_PARAM_LABELS: Record<string, string> = {
  steps: 'Steps',
  sampler: 'Sampler',
  scheduler: 'Schedule Type',
  cfgScale: 'CFG Scale',
  seed: 'Seed',
  size: 'Size',
  model: 'Model',
  vae: 'VAE',
  clipSkip: 'Clip Skip',
  denoisingStrength: 'Denoising',
}

/** 恒常显示的核心字段 —— 裸 PNG 也得能从零把参数填进去 */
const CORE_PARAM_FIELDS = ['steps', 'sampler', 'cfgScale', 'seed', 'size', 'model']

/** 值来自独立 tEXt chunk(原样透传),在这里改不会写进 Comment JSON */
const LOCKED_PARAM_FIELDS = new Set(['source', 'generation_time'])

/** 只给 UI 看的派生字段 */
const DERIVED_PARAM_FIELDS = new Set(['nodeCount', 'nodeTypes'])

const NOTICE_TONE_CLASS = {
  bad: 'bg-destructive/10 text-destructive',
  warn: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
} as const

const imageUrl = ref('')
const lightboxOpen = ref(false)
const busy = ref(false)
const confirmMode = ref<'reset' | 'replace' | null>(null)
const pendingFile = ref<File | null>(null)

/*
 * blob URL 的生命周期规矩:进来时建、卸载时撤。会话本身不随组件卸载消失,
 * 所以重新挂载时 immediate 的 watcher 会再建一个。
 */
watch(() => session.value?.blob, blob => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = blob ? URL.createObjectURL(blob) : ''
}, { immediate: true })

onUnmounted(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
})

const source = computed<ImageSource>(() => session.value?.source ?? 'unknown')
const isUnsupported = computed(() => source.value === 'comfyui')
const isBare = computed(() => source.value === 'unknown')
const canWriteBack = computed(() => Boolean(session.value?.id) && !isUnsupported.value && !isBare.value)
const characters = computed(() => session.value?.metadata.v4Data?.characters ?? [])

const sourceChip = computed(() => {
  const current = session.value
  if (!current) return ''
  if (current.source === 'nai') {
    const count = current.metadata.v4Data?.characters.length ?? 0
    return count ? `NAI · V4 · ${count} CHARS` : 'NOVELAI'
  }
  if (current.source === 'sd') return 'SD WEBUI'
  if (current.source === 'comfyui') return 'COMFYUI'
  return t('metadata.editor.noMetadata')
})

/*
 * v4 的 base_caption 与顶层 prompt 原本就分叉时,导出不会动 base_caption
 * (见 png-writer.ts 的同步规则)。把这件事摆出来,而不是静默。
 */
const showBaseCaptionNotice = computed(() => {
  const current = session.value
  const v4 = current?.metadata.v4Data
  if (!current || !v4) return false
  return Boolean(v4.basePrompt) && v4.basePrompt !== current.originalMetadata.prompt
})

const notices = computed(() => {
  const out: Array<{ tone: keyof typeof NOTICE_TONE_CLASS; text: string }> = []
  if (isUnsupported.value) out.push({ tone: 'bad', text: t('metadata.editor.unsupportedHint') })
  if (isBare.value) out.push({ tone: 'info', text: t('metadata.editor.bareHint') })
  if (session.value?.stealth) out.push({ tone: 'warn', text: t('metadata.editor.stealthHint') })
  if (showBaseCaptionNotice.value) out.push({ tone: 'warn', text: t('metadata.editor.baseCaptionHint') })
  return out
})

function toText(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value) ?? ''
}

/*
 * NAI 把模型标识放在 Source chunk / Comment.source 里,Comment 通常没有 model 键。
 * 写侧不凭空造键,所以这种图上改 MODEL 不会落进文件 —— 与其留一个改了不生效的
 * 输入框,不如锁上并说明:真正的模型名就在下面那条只读的 SOURCE 里。
 */
const naiModelLocked = computed(() => {
  if (session.value?.source !== 'nai') return false
  const raw = session.value.originalMetadata.rawText
  if (!raw) return true
  try {
    return !('model' in (JSON.parse(raw) as Record<string, unknown>))
  } catch {
    return true
  }
})

const paramRows = computed<ParamRow[]>(() => {
  const params = session.value?.metadata.parameters ?? {}
  const rows: ParamRow[] = []
  const seen = new Set<string>()

  for (const field of CORE_PARAM_FIELDS) {
    seen.add(field)
    const modelLocked = field === 'model' && naiModelLocked.value
    rows.push({
      key: field,
      label: KNOWN_PARAM_LABELS[field] ?? field,
      value: toText(params[field]),
      kind: 'known',
      locked: modelLocked,
      ...(modelLocked ? { lockReason: 'metadata.editor.lockedModelNai' } : {}),
    })
  }

  for (const [field, value] of Object.entries(params)) {
    if (seen.has(field) || DERIVED_PARAM_FIELDS.has(field)) continue
    if (value === undefined || value === null || value === '') continue
    const known = KNOWN_PARAM_LABELS[field]
    rows.push({
      key: field,
      label: known ?? field,
      value: toText(value),
      kind: known ? 'known' : 'extra',
      locked: LOCKED_PARAM_FIELDS.has(field),
    })
  }

  return rows
})

const changedParamKeys = computed(() => {
  const keys = new Set<string>()
  for (const field of changedFields.value) {
    if (field.kind === 'param') keys.add(field.key)
  }
  return keys
})

function diffLabel(field: ChangedField): string {
  if (field.kind === 'prompt') return t('metadata.prompt')
  if (field.kind === 'negativePrompt') return t('metadata.negativePrompt')
  if (field.kind === 'param') return KNOWN_PARAM_LABELS[field.key] ?? field.key
  const name = t('metadata.character', { idx: String(field.idx) })
  return `${name} · ${field.sub === 'prompt' ? 'Prompt' : 'Negative'}`
}

const diffRows = computed(() => changedFields.value.map(field => ({
  field,
  label: diffLabel(field),
  delta: field.delta === 0
    ? t('metadata.editor.diffChanged')
    : t('metadata.editor.diffDelta', { n: `${field.delta > 0 ? '+' : ''}${field.delta}` }),
})))

const exportTargets = computed<Array<{ target: ImageSource; label: string }>>(() => isBare.value
  ? [
      { target: 'sd', label: t('metadata.editor.exportAsSd') },
      { target: 'nai', label: t('metadata.editor.exportAsNai') },
    ]
  : [{ target: source.value, label: t('metadata.editor.exportPng') }])

/** 用原始值当类型参照:清空再重填时类型不会来回跳 */
function coerceParam(raw: string, reference: unknown): unknown {
  if (raw === '') return ''
  if (typeof reference === 'number') {
    const num = Number(raw)
    return Number.isFinite(num) ? num : raw
  }
  if (typeof reference === 'boolean') {
    if (raw === 'true') return true
    if (raw === 'false') return false
  }
  return raw
}

function setParam(key: string, raw: string) {
  const current = session.value
  if (!current) return
  current.metadata.parameters[key] = coerceParam(raw, current.originalMetadata.parameters[key])
}

function setCharacter(idx: number, field: 'prompt' | 'negative', value: string) {
  const target = session.value?.metadata.v4Data?.characters.find(item => item.idx === idx)
  if (target) target[field] = value
}

async function loadFile(file: File) {
  if (file.type !== 'image/png') {
    error(t('metadata.editor.onlyPng'))
    return
  }

  let parseUrl = ''
  try {
    parseUrl = URL.createObjectURL(file)
    const parsed = await parseImageMetadata(file, parseUrl)
    setEditingImage({
      filename: file.name,
      blob: file,
      source: parsed.source,
      metadata: parsed,
      originalMetadata: parsed,
    })
    if (parsed.source === 'comfyui') error(t('metadata.editor.unsupported'))
  } catch (err) {
    console.error('Failed to parse image metadata:', err)
    error(t('metadata.editor.parseFailed'))
  } finally {
    if (parseUrl) URL.revokeObjectURL(parseUrl)
  }
}

function requestReset() {
  if (!isDirty.value) return
  confirmMode.value = 'reset'
}

function requestReplace(file: File) {
  if (isDirty.value) {
    pendingFile.value = file
    confirmMode.value = 'replace'
    return
  }
  void loadFile(file)
}

function cancelConfirm() {
  confirmMode.value = null
  pendingFile.value = null
}

function acceptConfirm() {
  const mode = confirmMode.value
  confirmMode.value = null

  if (mode === 'reset') {
    resetAll()
    info(t('metadata.editor.resetDone'))
    return
  }

  const file = pendingFile.value
  pendingFile.value = null
  if (file) void loadFile(file)
}

function exportFilename(name: string): string {
  const base = name.replace(/\.png$/i, '') || 'image'
  return `${base}_edited.png`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  // Firefox 要求 <a> 先进 DOM 才响应 click()
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // 紧跟着 revoke 会让下载在部分浏览器上落空,挪到下一个 tick
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function reportWriteError(err: unknown, fallbackKey: string) {
  if (err instanceof MetadataWriteError) {
    error(t(err.code === 'nothing-to-write'
      ? 'metadata.editor.nothingToWrite'
      : 'metadata.editor.unsupported'))
    return
  }
  console.error('Metadata write failed:', err)
  error(t(fallbackKey))
}

async function handleExport(target: ImageSource) {
  const current = session.value
  if (!current || isUnsupported.value || busy.value) return

  busy.value = true
  try {
    const blob = await writePNGMetadata(current.blob, current.metadata, target)
    downloadBlob(blob, exportFilename(current.filename))
    success(t('metadata.editor.export'))
  } catch (err) {
    reportWriteError(err, 'metadata.editor.exportFailed')
  } finally {
    busy.value = false
  }
}

async function handleWriteBack() {
  const current = session.value
  if (!current?.id || !canWriteBack.value || busy.value) return

  busy.value = true
  try {
    const blob = await writePNGMetadata(current.blob, current.metadata, current.source)
    /*
     * 重新解析刚写出来的文件,拿它的读数入库 —— 库里存的和文件里躺的必须是同一份。
     * 顺带是一次自检:往返真丢了东西,这里立刻看得见。像素没变,缩略图不用重生成。
     */
    const reparsed = await parseImageMetadata(
      new File([blob], current.filename, { type: 'image/png' })
    )
    await aigcStore.updateImage(Number(current.id), {
      prompt: reparsed.prompt,
      negativePrompt: reparsed.negativePrompt,
      parameters: reparsed.parameters,
      rawMetadata: reparsed.rawText,
      v4Data: reparsed.v4Data,
      imageData: blob,
    })
    current.blob = blob
    current.metadata = cloneParsedMetadata(reparsed)
    current.originalMetadata = cloneParsedMetadata(reparsed)
    success(t('metadata.editor.writeBackDone'))
  } catch (err) {
    reportWriteError(err, 'metadata.editor.writeBackFailed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div v-if="session" class="flex h-full flex-col">
    <!--
      三栏工作台:自己吃满高度、三栏各自滚动(Toolbox 对它关掉了 AppShell 的内边距)。
      注释放在根元素里面 —— 顶层注释会让组件编译成 fragment 根。
    -->
    <!-- 顶栏 —— 标题只在 AppShell 工具栏那一处,这里放状态与操作 -->
    <div
      class="glass-surface sticky top-0 z-30 flex h-11 shrink-0 items-center gap-2.5 overflow-x-auto border-b pr-3 pl-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <Hash class="h-3.5 w-3.5 shrink-0 text-primary" />
      <span class="hair micro shrink-0 rounded-sm px-1.5 py-0.5 text-muted-foreground">
        {{ sourceChip }}
      </span>

      <span v-if="isDirty" class="flex shrink-0 items-center gap-1.5 text-primary">
        <span class="pulse-amber h-1.5 w-1.5 rounded-full bg-primary" />
        <span class="readout text-2xs">
          {{ t('metadata.editor.dirtyCount', { count: String(changedFields.length) }) }}
        </span>
      </span>
      <span v-else class="micro shrink-0">{{ t('metadata.editor.clean') }}</span>

      <span class="ml-auto" />

      <Button
        variant="outline"
        size="sm"
        class="shrink-0 text-xs"
        :disabled="!isDirty || isUnsupported"
        @click="requestReset"
      >
        <RotateCcw class="h-3.5 w-3.5" />
        {{ t('metadata.editor.reset') }}
      </Button>

      <Button
        v-if="session.id"
        variant="outline"
        size="sm"
        class="shrink-0 text-xs"
        :disabled="!isDirty || !canWriteBack || busy"
        @click="handleWriteBack"
      >
        <Database class="h-3.5 w-3.5" />
        {{ t('metadata.editor.writeBack') }}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button size="sm" class="shrink-0 text-xs" :disabled="isUnsupported || busy">
            <Download class="h-3.5 w-3.5" />
            {{ t('metadata.editor.exportAction') }}
            <ChevronDown class="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-60">
          <DropdownMenuItem
            v-for="item in exportTargets"
            :key="item.target"
            class="text-xs"
            @select="handleExport(item.target)"
          >
            <Download class="h-3.5 w-3.5" />
            {{ item.label }}
          </DropdownMenuItem>
          <p class="border-t px-2 pt-2 pb-1 text-2xs leading-relaxed text-dim">
            {{ t('metadata.editor.exportNote') }}
          </p>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- 三栏。lg 以下塌成单栏,整片一起滚 -->
    <div
      class="flex-1 overflow-y-auto lg:grid lg:min-h-0 lg:grid-cols-[12rem_minmax(0,1fr)_16rem] lg:overflow-visible xl:grid-cols-[14rem_minmax(0,1fr)_18.5rem]"
    >
      <MetadataEditorRail
        :image-url="imageUrl"
        :filename="session.filename"
        :file-size="session.blob.size"
        :source="session.source"
        @expand="lightboxOpen = true"
        @pick-file="requestReplace"
      >
        <template #notices>
          <div
            v-for="(notice, index) in notices"
            :key="index"
            class="flex gap-2 rounded-md p-2.5 text-xs leading-relaxed"
            :class="NOTICE_TONE_CLASS[notice.tone]"
          >
            <TriangleAlert class="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{{ notice.text }}</span>
          </div>
        </template>
      </MetadataEditorRail>

      <!-- 中栏:提示词 -->
      <div class="flex flex-col gap-4 p-4 lg:min-h-0 lg:overflow-y-auto">
        <MetadataPromptGroove
          label="Positive"
          :aria-label="t('metadata.prompt')"
          :model-value="session.metadata.prompt"
          :disabled="isUnsupported"
          :min-rows="4"
          :placeholder="isUnsupported ? '' : t('metadata.editor.promptPlaceholder')"
          @update:model-value="session.metadata.prompt = $event"
        />

        <MetadataPromptGroove
          negative
          label="Negative"
          :aria-label="t('metadata.negativePrompt')"
          :model-value="session.metadata.negativePrompt"
          :disabled="isUnsupported"
          :min-rows="3"
          :placeholder="isUnsupported ? '' : t('metadata.editor.promptPlaceholder')"
          @update:model-value="session.metadata.negativePrompt = $event"
        />

        <div v-if="characters.length" class="flex flex-col gap-2.5">
          <div class="flex items-center gap-2">
            <SectionLabel>{{ t('metadata.characterPrompts') }}</SectionLabel>
            <span class="hair micro ml-auto rounded-sm px-1.5 py-0.5 text-muted-foreground">
              {{ t('metadata.characterCount', { count: String(characters.length) }) }}
            </span>
          </div>
          <MetadataCharacterCard
            v-for="character in characters"
            :key="character.idx"
            :character="character"
            :disabled="isUnsupported"
            @update="setCharacter"
          />
        </div>
      </div>

      <MetadataParamsRail
        :rows="paramRows"
        :changed-keys="changedParamKeys"
        :disabled="isUnsupported"
        :raw-text="session.metadata.rawText"
        :diff-rows="diffRows"
        @update:param="setParam"
        @revert="revertField"
      />
    </div>
  </div>

  <!-- 空态 -->
  <div v-else class="flex h-full items-center justify-center p-4 md:p-6">
    <div class="w-full max-w-lg">
      <DropZone
        accept="image/png"
        :multiple="false"
        :label="t('metadata.editor.uploadHint')"
        :sublabel="t('metadata.editor.uploadSublabel')"
        @files="files => loadFile(files[0])"
      />
    </div>
  </div>

  <Dialog :open="confirmMode !== null" @update:open="value => !value && cancelConfirm()">
    <DialogContent class="w-[calc(100vw-2rem)] max-w-sm">
      <DialogHeader>
        <DialogTitle>
          {{ confirmMode === 'replace'
            ? t('metadata.editor.confirmReplaceTitle', { count: String(changedFields.length) })
            : t('metadata.editor.confirmResetTitle', { count: String(changedFields.length) }) }}
        </DialogTitle>
        <DialogDescription>
          {{ confirmMode === 'replace'
            ? t('metadata.editor.confirmReplaceBody')
            : t('metadata.editor.confirmResetBody') }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="cancelConfirm">{{ t('common.cancel') }}</Button>
        <Button @click="acceptConfirm">{{ t('common.confirm') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ImageLightbox
    v-if="session"
    :open="lightboxOpen"
    :src="imageUrl"
    :filename="session.filename"
    @update:open="lightboxOpen = $event"
  />
</template>
