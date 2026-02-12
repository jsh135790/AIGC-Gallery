import type { ParsedMetadata, ImageParameters } from '@/types'

/**
 * Parse SD-WebUI format metadata text.
 * Format: prompt\nNegative prompt: ...\nSteps: N, Sampler: xxx, CFG scale: N, ...
 */
export function parseSDWebUI(text: string): ParsedMetadata {
  let prompt = ''
  let negativePrompt = ''
  const parameters: ImageParameters = {}

  // Split into prompt / negative / params sections
  const stepsSplit = text.split(/\nSteps:\s*/)
  const promptSection = stepsSplit[0] || ''
  const paramsSection = stepsSplit[1] ? 'Steps: ' + stepsSplit[1] : ''

  // Extract negative prompt
  const negativeSplit = promptSection.split(/\nNegative prompt:\s*/)
  prompt = negativeSplit[0]?.trim() || ''
  negativePrompt = negativeSplit[1]?.trim() || ''

  // Parse parameters from "Steps: N, Sampler: xxx, CFG scale: N, ..."
  if (paramsSection) {
    const paramPairs = paramsSection.split(',').map(s => s.trim())
    for (const pair of paramPairs) {
      const colonIndex = pair.indexOf(':')
      if (colonIndex === -1) continue
      const key = pair.slice(0, colonIndex).trim()
      const value = pair.slice(colonIndex + 1).trim()

      switch (key.toLowerCase()) {
        case 'steps':
          parameters.steps = parseInt(value) || undefined
          break
        case 'sampler':
          parameters.sampler = value
          break
        case 'cfg scale':
          parameters.cfgScale = parseFloat(value) || undefined
          break
        case 'seed':
          parameters.seed = value
          break
        case 'size':
          parameters.size = value
          break
        case 'model':
        case 'model hash':
          parameters.model = parameters.model || value
          break
        case 'clip skip':
          parameters.clipSkip = parseInt(value) || undefined
          break
        case 'denoising strength':
          parameters.denoisingStrength = parseFloat(value) || undefined
          break
        default:
          parameters[key] = value
      }
    }
  }

  return {
    source: 'sd',
    prompt,
    negativePrompt,
    parameters,
    rawText: text,
  }
}
