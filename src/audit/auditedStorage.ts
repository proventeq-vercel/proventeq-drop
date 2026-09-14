import type { StorageService } from '../storage/types'
import type { AuditService } from './types'

/**
 * Decorates a StorageService so every successful mutation or share is
 * recorded. Keeps auditing out of the UI — the same place a real backend would
 * hook in. Audit failures never fail the user's action.
 */
export function withAudit(storage: StorageService, audit: AuditService): StorageService {
  const record: AuditService['record'] = (e) =>
    audit.record(e).catch((err: unknown) => console.warn('Audit record failed', err))

  return {
    listFiles: () => storage.listFiles(),

    async upload(file, options) {
      const stored = await storage.upload(file, options)
      await record({ action: 'file.uploaded', target: stored.path, details: { size: stored.size } })
      return stored
    },

    async deleteFile(path) {
      await storage.deleteFile(path)
      await record({ action: 'file.deleted', target: path })
    },

    async getDownloadUrl(path) {
      const url = await storage.getDownloadUrl(path)
      await record({ action: 'file.downloaded', target: path })
      return url
    },

    async createShareLink(path, ttlMs) {
      const link = await storage.createShareLink(path, ttlMs)
      await record({
        action: 'share.created',
        target: path,
        details: { expiresOn: link.expiresOn, url: link.url },
      })
      return link
    },
  }
}
