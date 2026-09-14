import { describe, it, expect, vi } from 'vitest'
import { createMockStorage, MOCK_USER } from './mock'
import { MAX_SHARE_TTL_MS } from './shareExpiry'

const fast = () =>
  createMockStorage({ latencyMs: 0, uploadDurationMs: 0, createObjectUrl: () => 'blob:mock' })

describe('mock storage', () => {
  it('starts with seed files in the user folder', async () => {
    const files = await fast().listFiles()
    expect(files.length).toBeGreaterThan(0)
    expect(files.every((f) => f.path.startsWith(`${MOCK_USER.oid}/`))).toBe(true)
  })

  it('uploads, reports progress, lists and deletes', async () => {
    const storage = fast()
    const onProgress = vi.fn()
    const file = new File(['hello world'], 'hello.txt', { type: 'text/plain' })

    const stored = await storage.upload(file, { name: 'hello.txt', onProgress })
    expect(stored).toMatchObject({ name: 'hello.txt', size: 11 })
    expect(onProgress).toHaveBeenLastCalledWith(11)
    expect((await storage.listFiles()).map((f) => f.name)).toContain('hello.txt')

    await storage.deleteFile(stored.path)
    expect((await storage.listFiles()).map((f) => f.name)).not.toContain('hello.txt')
  })

  it('creates a share link whose expiry is clamped to 7 days', async () => {
    const storage = fast()
    const [file] = await storage.listFiles()
    const before = Date.now()
    const link = await storage.createShareLink(file.path, 30 * 24 * 60 * 60 * 1000)
    expect(link.fileName).toBe(file.name)
    expect(link.expiresOn.getTime() - before).toBeLessThanOrEqual(MAX_SHARE_TTL_MS + 1000)
  })

  it('rejects operations on missing files with a 404', async () => {
    await expect(fast().deleteFile('nope')).rejects.toMatchObject({ statusCode: 404 })
  })
})
