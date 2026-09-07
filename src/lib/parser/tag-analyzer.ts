/**
 * Tag Analyzer - extracts and categorizes tags from AI image prompts.
 */

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
 * Deduplicate tags while preserving order and return unique tag names.
 */
function deduplicateTags(tags: string[]): string[] {
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
