import { fileNameFromPath, userPrefix } from './paths'
import { shareWindow } from './shareExpiry'
import type { StorageService, StoredFile, UserIdentity } from './types'

export const MOCK_USER: UserIdentity = {
  oid: '00000000-0000-0000-0000-00000000demo',
  name: 'Demo User',
  username: 'demo.user@contoso.com',
}

interface MockEntry {
  meta: StoredFile
  blob: Blob
}

export interface MockStorageOptions {
  user?: UserIdentity
  /** Simulated network latency per operation, ms. */
  latencyMs?: number
  /** Simulated upload duration for a file, ms. `0` disables progress simulation. */
  uploadDurationMs?: number
  /** Injected for tests (jsdom has no `URL.createObjectURL`). */
  createObjectUrl?: (blob: Blob) => string
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function seedFiles(prefix: string): MockEntry[] {
  const now = Date.now()
  const seed = (name: string, text: string, ageDays: number, contentType: string): MockEntry => {
    const blob = new Blob([text], { type: contentType })
    return {
      blob,
      meta: {
        name,
        path: prefix + name,
        size: blob.size,
        lastModified: new Date(now - ageDays * 24 * 60 * 60 * 1000),
        contentType,
      },
    }
  }
  return [
    seed('Welcome.txt', 'Drop files onto the page to upload them, then share a link.', 3, 'text/plain'),
    seed('Migration plan.md', '# Migration plan\n\n1. Discover\n2. Migrate\n3. Validate\n', 1, 'text/markdown'),
  ]
}

/** In-memory storage for mock mode and tests. Files live until page reload. */
export function createMockStorage(opts: MockStorageOptions = {}): StorageService {
  const user = opts.user ?? MOCK_USER
  const prefix = userPrefix(user.oid)
  const latency = opts.latencyMs ?? 250
  const uploadDuration = opts.uploadDurationMs ?? 1200
  const createObjectUrl = opts.createObjectUrl ?? ((b: Blob) => URL.createObjectURL(b))
  const files = new Map<string, MockEntry>(seedFiles(prefix).map((e) => [e.meta.path, e]))

  function entry(path: string): MockEntry {
    const e = files.get(path)
    if (!e) throw Object.assign(new Error('The specified blob does not exist.'), { statusCode: 404 })
    return e
  }

  return {
    async listFiles() {
      await wait(latency)
      return [...files.values()].map((e) => ({ ...e.meta }))
    },

    async upload(file, { name, onProgress, signal }) {
      const steps = uploadDuration > 0 ? 10 : 0
      for (let i = 1; i <= steps; i++) {
        if (signal?.aborted) throw new DOMException('Upload aborted', 'AbortError')
        await wait(uploadDuration / steps)
        onProgress?.(Math.round((file.size * i) / steps))
      }
      onProgress?.(file.size)
      const meta: StoredFile = {
        name,
        path: prefix + name,
        size: file.size,
        lastModified: new Date(),
        contentType: file.type,
      }
      files.set(meta.path, { meta, blob: file })
      return { ...meta }
    },

    async deleteFile(path) {
      await wait(latency)
      entry(path)
      files.delete(path)
    },

    async getDownloadUrl(path) {
      return createObjectUrl(entry(path).blob)
    },

    async createShareLink(path, ttlMs) {
      await wait(latency)
      const e = entry(path)
      const { expiresOn } = shareWindow(ttlMs)
      // A real link would be a SAS URL; in mock mode an object URL is the closest
      // thing that actually opens the file.
      return {
        url: createObjectUrl(e.blob),
        path,
        fileName: fileNameFromPath(path),
        createdOn: new Date(),
        expiresOn,
      }
    },
  }
}
