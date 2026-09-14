export type AuditAction = 'file.uploaded' | 'file.deleted' | 'file.downloaded' | 'share.created'

export interface AuditEvent {
  id: string
  at: Date
  action: AuditAction
  actor: { oid: string; name: string }
  /** Blob path the action applied to. */
  target: string
  details?: {
    size?: number
    expiresOn?: Date
    /**
     * POC only: the share URL is kept so the UI can list active links. A real
     * backend would store a link id, never the signed URL itself.
     */
    url?: string
  }
}

export type NewAuditEvent = Omit<AuditEvent, 'id' | 'at' | 'actor'>

/**
 * The seam for the future backend. Today `mock.ts` writes to localStorage —
 * which a user can edit, so it is illustrative, not an audit trail. The real
 * implementation will POST events to an API that writes an append-only log
 * (and ideally correlates them with Storage diagnostic logs).
 */
export interface AuditService {
  record(event: NewAuditEvent): Promise<void>
  list(): Promise<AuditEvent[]>
}
