import { describe, it, expect, beforeEach } from 'vitest'
import { createMockStorage, MOCK_USER } from '../storage/mock'
import { withAudit } from './auditedStorage'
import { createMockAudit } from './mock'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('audited storage', () => {
  let audit: ReturnType<typeof createMockAudit>
  let storage: ReturnType<typeof withAudit>

  beforeEach(() => {
    audit = createMockAudit({ user: MOCK_USER, storage: memoryStorage() })
    storage = withAudit(
      createMockStorage({ latencyMs: 0, uploadDurationMs: 0, createObjectUrl: () => 'blob:x' }),
      audit,
    )
  })

  it('records upload, share, download and delete newest first', async () => {
    const stored = await storage.upload(new File(['abc'], 'a.txt'), { name: 'a.txt' })
    await storage.createShareLink(stored.path, 60 * 60 * 1000)
    await storage.getDownloadUrl(stored.path)
    await storage.deleteFile(stored.path)

    const events = await audit.list()
    expect(events.map((e) => e.action)).toEqual([
      'file.deleted',
      'file.downloaded',
      'share.created',
      'file.uploaded',
    ])
    expect(events[0].actor).toEqual({ oid: MOCK_USER.oid, name: MOCK_USER.name })
    expect(events[2].details?.expiresOn).toBeInstanceOf(Date)
    expect(events[3].details?.size).toBe(3)
  })

  it('does not record failed operations', async () => {
    await expect(storage.deleteFile('missing')).rejects.toBeTruthy()
    expect(await audit.list()).toEqual([])
  })
})
