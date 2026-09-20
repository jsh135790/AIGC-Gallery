/*
 * 启动检查更新的纯逻辑层:没有 DOM、没有状态,方便在 node 下测。
 * 这是 App 唯一一处对外请求 —— 只发一次版本查询,不带任何用户数据。
 */
export const REPO = 'jsh135790/AIGC-Gallery'
export const RELEASES_URL = `https://github.com/${REPO}/releases`
/** `latest` 端点自动排除 draft / prerelease */
export const LATEST_RELEASE_API = `https://api.github.com/repos/${REPO}/releases/latest`
/** 未授权 GitHub API 限额 60 次/小时/IP;6 小时内重复启动直接复用上次结果 */
export const UPDATE_CHECK_TTL_MS = 6 * 60 * 60 * 1000

export interface ReleaseInfo {
  tag: string
  /** 去掉 v 前缀的 x.y.z */
  version: string
  /** Release 页面(html_url),不是下载直链 —— 说明和资产都在那 */
  url: string
  publishedAt: string
}

export interface UpdateCheckCache extends ReleaseInfo {
  checkedAt: string
}

export function parseVersion(input: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(input.trim())
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

/** 严格更新才算:相等、本地 dev 领先发布版、任一方解析不了,都不响 */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parseVersion(candidate)
  const b = parseVersion(current)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseLatestRelease(json: unknown): ReleaseInfo | null {
  if (!record(json) || json.draft === true || json.prerelease === true) return null
  const { tag_name: tag, html_url: url, published_at: publishedAt } = json
  if (typeof tag !== 'string' || typeof url !== 'string' || typeof publishedAt !== 'string') return null
  const version = parseVersion(tag)
  if (!version || !url.startsWith('https://')) return null
  return { tag, version: version.join('.'), url, publishedAt }
}

export function isFreshCache(value: unknown, now = Date.now()): value is UpdateCheckCache {
  if (!record(value) || typeof value.version !== 'string' || typeof value.checkedAt !== 'string') return false
  if (!parseLatestRelease({ tag_name: value.tag, html_url: value.url, published_at: value.publishedAt })) return false
  const checkedAt = Date.parse(value.checkedAt)
  return Number.isFinite(checkedAt) && checkedAt <= now && now - checkedAt <= UPDATE_CHECK_TTL_MS
}

export async function fetchLatestRelease(fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<ReleaseInfo | null> {
  // 只带 CORS 安全列表里的 Accept。别加 X-GitHub-Api-Version:那会触发预检,file:// 下更没必要冒险
  const response = await fetchImpl(LATEST_RELEASE_API, { headers: { Accept: 'application/vnd.github+json' }, signal })
  if (!response.ok) return null
  return parseLatestRelease(await response.json().catch(() => null))
}
