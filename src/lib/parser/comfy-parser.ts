import type { ParsedMetadata, ImageParameters, ParseReport } from '@/types'

/** 生产构建里不该有解析日志。诊断信息的正阵地是 diagnostics + 查看器 */
const debug: (...args: unknown[]) => void = import.meta.env.DEV
  ? (...args) => console.log('[ComfyUI Parser]', ...args)
  : () => {}

/**
 * 语义提取只认这些官方节点。自定义节点**只计入统计**,不参与参数推断 ——
 * 从任意第三方节点猜 steps / sampler 会在猜错时把元数据写坏,代价远大于收益。
 */
const SEMANTIC_NODE_TYPES = new Set([
  'CLIPTextEncode', 'KSampler', 'CheckpointLoaderSimple', 'LoraLoader', 'VAELoader', 'EmptyLatentImage',
])

interface ComfyNode {
  id: number
  type: string
  order?: number
  mode?: number
  properties?: {
    cnr_id?: string
    [key: string]: unknown
  }
  widgets_values?: unknown[]
}

interface ComfyWorkflow {
  nodes?: ComfyNode[]
  [key: string]: unknown
}

interface ComfyAPINode {
  class_type: string
  inputs?: Record<string, unknown>
  _meta?: {
    title?: string
  }
}

interface ComfyAPIWorkflow {
  [nodeId: string]: ComfyAPINode
}

/**
 * Parse ComfyUI workflow metadata from JSON.
 * ComfyUI has two formats:
 * 1. API format (prompt chunk): { "1": { class_type: "...", inputs: {...} }, "2": {...} }
 * 2. Full format (workflow chunk): { nodes: [...], links: [...] }
 */
export function parseComfyUI(workflowJson: string, report?: ParseReport): ParsedMetadata {
  try {
    const data = JSON.parse(workflowJson)

    // Check if it's the full workflow format with nodes array
    if (data.nodes && Array.isArray(data.nodes)) {
      return parseComfyUIFullFormat(data as ComfyWorkflow, workflowJson, report)
    }

    // Otherwise, assume it's the API format (object with numeric keys)
    const keys = Object.keys(data)
    if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
      return parseComfyUIAPIFormat(data as ComfyAPIWorkflow, workflowJson, report)
    }

    return unknownResult(workflowJson)
  } catch {
    return unknownResult(workflowJson)
  }
}

/** 参与统计但没参与语义提取的节点类型,记进诊断 */
function reportNonSemanticTypes(report: ParseReport | undefined, types: string[]): void {
  if (!report) return
  for (const type of new Set(types)) {
    if (!SEMANTIC_NODE_TYPES.has(type)) report.unconsumedKeys.push(`node:${type}`)
  }
}

/**
 * Parse ComfyUI API format (from "prompt" chunk)
 * Format: { "1": { class_type: "CheckpointLoaderSimple", inputs: {...} }, ... }
 */
function parseComfyUIAPIFormat(workflow: ComfyAPIWorkflow, rawText: string, report?: ParseReport): ParsedMetadata {
  const nodes = Object.entries(workflow).map(([id, node]) => ({
    id,
    ...node
  }))

  debug('api format, nodes:', nodes.length)

  let prompt = ''
  const parameters: ImageParameters = {}

  // Add node statistics
  parameters.nodeCount = nodes.length
  parameters.nodeTypes = [...new Set(nodes.map(n => n.class_type))]
  reportNonSemanticTypes(report, parameters.nodeTypes)

  // Extract prompts from CLIPTextEncode nodes (official only)
  const clipNodes = nodes.filter(n => n.class_type === 'CLIPTextEncode')
  const prompts: string[] = []
  for (const node of clipNodes) {
    const text = node.inputs?.text
    if (text && typeof text === 'string') {
      prompts.push(text.trim())
    }
  }
  prompt = prompts.join('\n---\n')

  // Extract sampler parameters from KSampler (official only)
  const samplerNode = nodes.find(n => n.class_type === 'KSampler')
  if (samplerNode?.inputs) {
    const inputs = samplerNode.inputs
    if (inputs.seed !== undefined) {
      // Handle array inputs (node references)
      const seed = Array.isArray(inputs.seed) ? inputs.seed[0] : inputs.seed
      parameters.seed = String(seed)
    }
    if (inputs.steps !== undefined) {
      const steps = Array.isArray(inputs.steps) ? inputs.steps[0] : inputs.steps
      parameters.steps = Number(steps)
    }
    if (inputs.cfg !== undefined) {
      const cfg = Array.isArray(inputs.cfg) ? inputs.cfg[0] : inputs.cfg
      parameters.cfgScale = Number(cfg)
    }
    if (inputs.sampler_name !== undefined) parameters.sampler = String(inputs.sampler_name)
    if (inputs.scheduler !== undefined) parameters.scheduler = String(inputs.scheduler)
    if (inputs.denoise !== undefined) {
      const denoise = Array.isArray(inputs.denoise) ? inputs.denoise[0] : inputs.denoise
      parameters.denoisingStrength = Number(denoise)
    }
  }

  // Extract model from CheckpointLoaderSimple (official only)
  const checkpointNode = nodes.find(n => n.class_type === 'CheckpointLoaderSimple')
  if (checkpointNode?.inputs?.ckpt_name) {
    parameters.model = String(checkpointNode.inputs.ckpt_name)
  }

  // Extract LoRAs from LoraLoader nodes (official only)
  const loraNodes = nodes.filter(n => n.class_type === 'LoraLoader')
  const loras: string[] = []
  for (const node of loraNodes) {
    if (node.inputs?.lora_name) {
      const name = String(node.inputs.lora_name)
      const weight = node.inputs.strength_model !== undefined
        ? Number(node.inputs.strength_model).toFixed(2)
        : '1.00'
      loras.push(`${name} (${weight})`)
    }
  }
  if (loras.length > 0) {
    parameters.loras = loras.join(', ')
  }

  // Extract VAE from VAELoader (official only)
  const vaeNode = nodes.find(n => n.class_type === 'VAELoader')
  if (vaeNode?.inputs?.vae_name) {
    parameters.vae = String(vaeNode.inputs.vae_name)
  }

  // Extract dimensions from EmptyLatentImage
  const latentNode = nodes.find(n => n.class_type === 'EmptyLatentImage')
  if (latentNode?.inputs) {
    let width = latentNode.inputs.width
    let height = latentNode.inputs.height

    // Handle array inputs (node references)
    if (Array.isArray(width)) width = width[0]
    if (Array.isArray(height)) height = height[0]

    if (width !== undefined && height !== undefined) {
      parameters.size = `${width}x${height}`
    }
  }

  return {
    source: 'comfyui',
    prompt,
    negativePrompt: '',
    parameters,
    rawText,
  }
}

/**
 * Parse ComfyUI full workflow format (from "workflow" chunk)
 * Format: { nodes: [...], links: [...] }
 */
function parseComfyUIFullFormat(workflow: ComfyWorkflow, rawText: string, report?: ParseReport): ParsedMetadata {
  const nodes = workflow.nodes || []

  /*
   * 统计覆盖**全部**节点。旧实现先过滤到 cnr_id === 'comfy-core' 才做任何事,
   * 于是所有自定义节点(LoRA 加载器、放大、第三方采样器…)在 UI 上完全隐形 ——
   * 对 ComfyUI 用户来说这是最大的一处丢数据。
   */
  const allTypes = [...new Set(nodes.map(node => node.type).filter(Boolean))]

  // 语义提取仍只认核心节点,不从自定义节点猜参数
  const coreNodes = extractCoreNodes(nodes)
  debug('full workflow, nodes:', nodes.length, 'core:', coreNodes.length)

  const prompt = extractPrompts(coreNodes)
  const parameters = extractSamplerParams(coreNodes)

  parameters.nodeCount = nodes.length
  parameters.nodeTypes = allTypes
  reportNonSemanticTypes(report, allTypes)

  // Extract model information
  const models = extractModels(coreNodes)
  if (models.model) parameters.model = models.model
  if (models.loras) parameters.loras = models.loras
  if (models.vae) parameters.vae = models.vae

  // Extract image dimensions
  const dimensions = extractDimensions(coreNodes)
  if (dimensions) parameters.size = dimensions

  return {
    source: 'comfyui',
    prompt,
    negativePrompt: '',
    parameters,
    rawText,
  }
}

/**
 * 过滤出核心节点。
 * 注意:这只用于**语义提取**。节点统计走全量,别再把这个过滤器提到统计前面。
 */
function extractCoreNodes(nodes: ComfyNode[]): ComfyNode[] {
  return nodes.filter(node => node.properties?.cnr_id === 'comfy-core')
}

/**
 * Find all nodes of a specific type
 */
function findNodesByType(nodes: ComfyNode[], type: string): ComfyNode[] {
  return nodes.filter(node => node.type === type)
}

/**
 * Extract and combine all prompts from CLIPTextEncode nodes
 */
function extractPrompts(nodes: ComfyNode[]): string {
  const clipNodes = findNodesByType(nodes, 'CLIPTextEncode')
  const prompts: string[] = []

  for (const node of clipNodes) {
    if (node.widgets_values && node.widgets_values[0]) {
      const text = String(node.widgets_values[0]).trim()
      if (text) prompts.push(text)
    }
  }

  return prompts.join('\n---\n')
}

/**
 * Extract sampler parameters from KSampler node
 */
function extractSamplerParams(nodes: ComfyNode[]): ImageParameters {
  const samplerNodes = findNodesByType(nodes, 'KSampler')

  // Use the last sampler node (highest order)
  const sampler = samplerNodes.sort((a, b) => (b.order || 0) - (a.order || 0))[0]

  if (!sampler || !sampler.widgets_values) {
    return {}
  }

  const params: ImageParameters = {}
  const values = sampler.widgets_values

  // KSampler widgets_values format: [seed, seed_control, steps, cfg, sampler_name, scheduler, denoise]
  if (values[0] !== undefined) params.seed = String(values[0])
  if (values[2] !== undefined) params.steps = Number(values[2])
  if (values[3] !== undefined) params.cfgScale = Number(values[3])
  if (values[4] !== undefined) params.sampler = String(values[4])
  if (values[5] !== undefined) params.scheduler = String(values[5])
  if (values[6] !== undefined) params.denoisingStrength = Number(values[6])

  return params
}

/**
 * Extract model, LoRA, and VAE information
 */
function extractModels(nodes: ComfyNode[]): { model?: string; loras: string; vae?: string } {
  const result: { model?: string; loras: string; vae?: string } = { loras: '' }

  // Extract checkpoint model
  const checkpointNodes = findNodesByType(nodes, 'CheckpointLoaderSimple')
  if (checkpointNodes.length > 0 && checkpointNodes[0].widgets_values?.[0]) {
    result.model = String(checkpointNodes[0].widgets_values[0])
  }

  // Extract LoRAs (filter out disabled nodes with mode: 4)
  const loraNodes = findNodesByType(nodes, 'LoraLoader')
    .filter(node => node.mode !== 4)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  const loras: string[] = []
  for (const node of loraNodes) {
    if (node.widgets_values && node.widgets_values[0]) {
      const name = String(node.widgets_values[0])
      const weight = node.widgets_values[1] !== undefined ? Number(node.widgets_values[1]).toFixed(2) : '1.00'
      loras.push(`${name} (${weight})`)
    }
  }
  result.loras = loras.join(', ')

  // Extract VAE
  const vaeNodes = findNodesByType(nodes, 'VAELoader')
  if (vaeNodes.length > 0 && vaeNodes[0].widgets_values?.[0]) {
    result.vae = String(vaeNodes[0].widgets_values[0])
  }

  return result
}

/**
 * Extract image dimensions from EmptyLatentImage node
 */
function extractDimensions(nodes: ComfyNode[]): string | undefined {
  const latentNodes = findNodesByType(nodes, 'EmptyLatentImage')

  if (latentNodes.length > 0 && latentNodes[0].widgets_values) {
    const values = latentNodes[0].widgets_values
    const width = values[0]
    const height = values[1]
    if (width !== undefined && height !== undefined) {
      return `${width}x${height}`
    }
  }

  return undefined
}

function unknownResult(rawText: string): ParsedMetadata {
  return {
    source: 'unknown',
    prompt: '',
    negativePrompt: '',
    parameters: {},
    rawText,
  }
}
