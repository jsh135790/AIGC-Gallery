/**
 * Tag Analyzer - extracts and categorizes tags from AI image prompts.
 */

export interface AnalyzedTag {
  name: string
  category: TagCategory
  weight?: number
}

export type TagCategory =
  | 'quality'
  | 'artist'
  | 'character'
  | 'content'
  | 'style'
  | 'meta'
  | 'other'

// Known quality tags
const QUALITY_TAGS = new Set([
  'masterpiece', 'best quality', 'high quality', 'absurdres', 'highres',
  'incredibly absurdres', 'very aesthetic', 'aesthetic',
  'newest', 'recent', 'mid', 'early', 'oldest',
  'safe', 'sensitive', 'nsfw', 'general', 'questionable', 'explicit',
  'amazing quality', 'great quality', 'normal quality', 'low quality',
  'worst quality', 'very displeasing', 'displeasing', 'very aesthetic',
])

// Known style / meta tags
const STYLE_TAGS = new Set([
  'anime', 'illustration', 'photorealistic', 'realistic',
  'digital art', 'oil painting', 'watercolor', 'sketch',
  'concept art', 'pixel art', 'line art', 'flat color',
  'cel shading', 'monochrome', 'greyscale', 'sepia',
  'no humans', 'comic', 'manga', '4koma',
])

/**
 * Parse a prompt string into individual tags.
 */
export function extractTags(prompt: string): string[] {
  if (!prompt) return []

  // Split on commas that are NOT inside bracket groups (parentheses, curly braces, square brackets)
  const parts: string[] = []
  let current = ''
  let depth = 0
  for (const ch of prompt) {
    if (ch === '(' || ch === '{' || ch === '[') {
      depth++
      current += ch
    } else if (ch === ')' || ch === '}' || ch === ']') {
      depth = Math.max(0, depth - 1)
      current += ch
    } else if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current) parts.push(current)

  return parts
    .map(tag => tag.trim())
    .map(tag => {
      // Remove weight markers like (tag:1.2) -> tag
      const weightMatch = tag.match(/^\((.+?)(?::[\d.]+)?\)$/)
      if (weightMatch) return weightMatch[1].trim()
      // Remove curly brace weights {tag}
      const curlyMatch = tag.match(/^\{+(.+?)\}+$/)
      if (curlyMatch) return curlyMatch[1].trim()
      // Remove square bracket downweights [tag]
      const bracketMatch = tag.match(/^\[(.+?)\]$/)
      if (bracketMatch) return bracketMatch[1].trim()
      return tag
    })
    .filter(tag => tag.length > 0)
}

/**
 * Analyze and categorize extracted tags.
 */
export function analyzeTags(tags: string[]): AnalyzedTag[] {
  return tags.map(tag => {
    const lower = tag.toLowerCase()
    let category: TagCategory = 'other'

    if (QUALITY_TAGS.has(lower)) {
      category = 'quality'
    } else if (lower.startsWith('artist:') || lower.startsWith('by ')) {
      category = 'artist'
    } else if (STYLE_TAGS.has(lower)) {
      category = 'style'
    } else if (
      lower.includes('girl') || lower.includes('boy') ||
      lower.includes('woman') || lower.includes('man') ||
      lower.includes('hair') || lower.includes('eyes') ||
      lower.includes('dress') || lower.includes('shirt') ||
      lower.includes('skirt') || lower.includes('body')
    ) {
      category = 'content'
    } else if (lower.startsWith('year ') || lower.match(/^\d{4}$/)) {
      category = 'meta'
    }

    return { name: tag, category }
  })
}

/**
 * Deduplicate tags while preserving order and return unique tag names.
 */
export function deduplicateTags(tags: string[]): string[] {
  const seen = new Set<string>()
  return tags.filter(tag => {
    const lower = tag.toLowerCase()
    if (seen.has(lower)) return false
    seen.add(lower)
    return true
  })
}

/**
 * Full pipeline: extract tags from prompt, deduplicate, and return clean tag list.
 */
export function getTagsFromPrompt(prompt: string): string[] {
  const tags = extractTags(prompt)
  return deduplicateTags(tags)
}
