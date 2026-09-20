import { describe, expect, it } from 'vitest'
import {
  LATEST_RELEASE_API,
  UPDATE_CHECK_TTL_MS,
  fetchLatestRelease,
  isFreshCache,
  isNewerVersion,
  parseLatestRelease,
  parseVersion,
} from '../update-check'

describe('version comparison', () => {
  it('parses plain and v-prefixed semver, rejects anything else', () => {
    expect(parseVersion('3.1.0')).toEqual([3, 1, 0])
    expect(parseVersion('v3.10.2')).toEqual([3, 10, 2])
    expect(parseVersion('3.1.0-beta.1')).toBeNull()
    expect(parseVersion('latest')).toBeNull()
    expect(parseVersion('')).toBeNull()
  })

  it('reports only a strictly newer release as an update', () => {
    expect(isNewerVersion('v3.1.0', '3.0.0')).toBe(true)
    expect(isNewerVersion('3.0.0', '3.0.0')).toBe(false)
    // 本地 dev 领先发布版时不响
    expect(isNewerVersion('3.0.0', '3.1.0')).toBe(false)
  })

  it('compares numerically, not lexically', () => {
    expect(isNewerVersion('3.10.0', '3.9.0')).toBe(true)
    expect(isNewerVersion('10.0.0', '9.99.99')).toBe(true)
  })

  it('never treats an unparsable tag as an update', () => {
    expect(isNewerVersion('nightly', '3.0.0')).toBe(false)
    expect(isNewerVersion('3.1.0', 'dev')).toBe(false)
  })
})

describe('parseLatestRelease', () => {
  const release = { tag_name: 'v3.1.0', html_url: 'https://github.com/jsh135790/AIGC-Gallery/releases/tag/v3.1.0', published_at: '2026-09-20T00:00:00Z', draft: false, prerelease: false }

  it('extracts tag, bare version, page url and publish date', () => {
    expect(parseLatestRelease(release)).toEqual({
      tag: 'v3.1.0',
      version: '3.1.0',
      url: release.html_url,
      publishedAt: release.published_at,
    })
  })

  it('rejects drafts, prereleases, malformed tags and non-objects', () => {
    expect(parseLatestRelease({ ...release, draft: true })).toBeNull()
    expect(parseLatestRelease({ ...release, prerelease: true })).toBeNull()
    expect(parseLatestRelease({ ...release, tag_name: 'nightly' })).toBeNull()
    expect(parseLatestRelease({ ...release, html_url: 'ftp://nope' })).toBeNull()
    expect(parseLatestRelease(null)).toBeNull()
    expect(parseLatestRelease('v3.1.0')).toBeNull()
  })
})

describe('isFreshCache', () => {
  const now = Date.parse('2026-09-20T12:00:00Z')
  const cache = { tag: 'v3.1.0', version: '3.1.0', url: 'https://github.com/x/y/releases/tag/v3.1.0', publishedAt: '2026-09-19T00:00:00Z', checkedAt: '2026-09-20T10:00:00Z' }

  it('accepts a well-formed result checked within the TTL', () => {
    expect(isFreshCache(cache, now)).toBe(true)
  })

  it('expires after the TTL and rejects malformed or future-dated entries', () => {
    const stale = new Date(now - UPDATE_CHECK_TTL_MS - 1).toISOString()
    expect(isFreshCache({ ...cache, checkedAt: stale }, now)).toBe(false)
    expect(isFreshCache({ ...cache, checkedAt: 'yesterday' }, now)).toBe(false)
    expect(isFreshCache({ ...cache, checkedAt: '2026-09-21T00:00:00Z' }, now)).toBe(false)
    expect(isFreshCache({ ...cache, tag: 42 }, now)).toBe(false)
    expect(isFreshCache(undefined, now)).toBe(false)
  })
})

describe('fetchLatestRelease', () => {
  const body = { tag_name: 'v3.1.0', html_url: 'https://github.com/jsh135790/AIGC-Gallery/releases/tag/v3.1.0', published_at: '2026-09-20T00:00:00Z', draft: false, prerelease: false }

  it('calls the latest-release endpoint with the CORS-safelisted GitHub accept header only', async () => {
    const calls: { url: string; headers: Record<string, string> }[] = []
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), headers: { ...(init?.headers as Record<string, string>) } })
      return new Response(JSON.stringify(body), { status: 200 })
    }) as typeof fetch
    await expect(fetchLatestRelease(fetchImpl)).resolves.toEqual({ tag: 'v3.1.0', version: '3.1.0', url: body.html_url, publishedAt: body.published_at })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(LATEST_RELEASE_API)
    // 只允许 CORS 安全列表里的头:多一个 X-GitHub-Api-Version 就会触发预检
    expect(Object.keys(calls[0].headers)).toEqual(['Accept'])
  })

  it('returns null on a non-2xx response instead of throwing', async () => {
    const fetchImpl = (async () => new Response('{"message":"rate limited"}', { status: 403 })) as typeof fetch
    await expect(fetchLatestRelease(fetchImpl)).resolves.toBeNull()
  })

  it('returns null when the body is not a valid release', async () => {
    const fetchImpl = (async () => new Response('[]', { status: 200 })) as typeof fetch
    await expect(fetchLatestRelease(fetchImpl)).resolves.toBeNull()
  })
})
