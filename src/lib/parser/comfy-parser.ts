import type { ParsedMetadata, ImageParameters } from '@/types'

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
export function parseComfyUI(workflowJson: string): ParsedMetadata {
  try {
    const data = JSON.parse(workflowJson)

    // Check if it's the full workflow format with nodes array
    if (data.nodes && Array.isArray(data.nodes)) {
      return parseComfyUIFullFormat(data as ComfyWorkflow, workflowJson)
    }

    // Otherwise, assume it's the API format (object with numeric keys)
    const keys = Object.keys(data)
    if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
      return parseComfyUIAPIFormat(data as ComfyAPIWorkflow, workflowJson)
    }

    return unknownResult(workflowJson)
  } catch (error) {
    return unknownResult(workflowJson)
  }
}

/**
 * Parse ComfyUI API format (from "prompt" chunk)
 * Format: { "1": { class_type: "CheckpointLoaderSimple", inputs: {...} }, ... }
 */
function parseComfyUIAPIFormat(workflow: ComfyAPIWorkflow, rawText: string): ParsedMetadata {
  const nodes = Object.entries(workflow).map(([id, node]) => ({
    id,
    ...node
  }))

  console.log('[ComfyUI API Parser] Total nodes:', nodes.length)
  console.log('[ComfyUI API Parser] Node types:', nodes.map(n => n.class_type))

  let prompt = ''
  const parameters: ImageParameters = {}

  // Add node statistics
  parameters.nodeCount = nodes.length
  parameters.nodeTypes = [...new Set(nodes.map(n => n.class_type))]

  // Extract prompts from CLIPTextEncode nodes (official only)
  const clipNodes = nodes.filter(n => n.class_type === 'CLIPTextEncode')
  console.log('[ComfyUI API Parser] Found CLIPTextEncode nodes:', clipNodes.length)
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
  console.log('[ComfyUI API Parser] Found KSampler:', !!samplerNode)
  if (samplerNode?.inputs) {
    console.log('[ComfyUI API Parser] KSampler inputs:', samplerNode.inputs)
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
  console.log('[ComfyUI API Parser] Found CheckpointLoaderSimple:', !!checkpointNode)
  if (checkpointNode?.inputs?.ckpt_name) {
    parameters.model = String(checkpointNode.inputs.ckpt_name)
  }

  // Extract LoRAs from LoraLoader nodes (official only)
  const loraNodes = nodes.filter(n => n.class_type === 'LoraLoader')
  console.log('[ComfyUI API Parser] Found LoraLoader nodes:', loraNodes.length)
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
  console.log('[ComfyUI API Parser] Found EmptyLatentImage:', !!latentNode)
  if (latentNode?.inputs) {
    console.log('[ComfyUI API Parser] EmptyLatentImage inputs:', latentNode.inputs)
    let width = latentNode.inputs.width
    let height = latentNode.inputs.height

    // Handle array inputs (node references)
    if (Array.isArray(width)) width = width[0]
    if (Array.isArray(height)) height = height[0]

    if (width !== undefined && height !== undefined) {
      parameters.size = `${width}x${height}`
    }
  }

  console.log('[ComfyUI API Parser] Final parameters:', parameters)

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
function parseComfyUIFullFormat(workflow: ComfyWorkflow, rawText: string): ParsedMetadata {
  const nodes = workflow.nodes || []

  // Filter to only core ComfyUI nodes
  const coreNodes = extractCoreNodes(nodes)

  // Extract prompts from all CLIPTextEncode nodes
  const prompt = extractPrompts(coreNodes)

  // Extract sampler parameters
  const parameters = extractSamplerParams(coreNodes)

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
 * Filter nodes to only those with cnr_id === "comfy-core"
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
