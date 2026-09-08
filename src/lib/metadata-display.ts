/** 展示顺序与名称只影响界面，不改变文件中的字段。 */
export const COMMON_PARAMETER_KEYS = ['model', 'sampler', 'steps', 'cfgScale', 'seed', 'size'] as const

export const PARAMETER_LABEL_KEYS: Record<string, string> = {
  model: 'metadata.param.model',
  sampler: 'metadata.param.sampler',
  steps: 'metadata.param.steps',
  cfgScale: 'metadata.param.cfgScale',
  seed: 'metadata.param.seed',
  size: 'metadata.param.size',
  scheduler: 'metadata.param.scheduler',
  vae: 'metadata.param.vae',
  clipSkip: 'metadata.param.clipSkip',
  denoisingStrength: 'metadata.param.denoisingStrength',
}

export function formatMetadataValue(value: unknown, pretty = false): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') return JSON.stringify(value, null, pretty ? 2 : undefined) ?? ''
  return String(value)
}
