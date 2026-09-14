import type { UserIdentity } from '../storage/types'
import type { AuditEvent, AuditService } from './types'

const STORAGE_KEY = 'blob-drop.audit.v1'
const MAX_EVENTS = 200

type Serialized = Omit<AuditEvent, 'at' | 'details'> & {
  at: string
  details?: Omit<NonNullable<AuditEvent['details']>, 'expiresOn'> & { expiresOn?: string }
}

function revive(e: Serialized): AuditEvent {
  return {
    ...e,
    at: new Date(e.at),
    details: e.details && {
      ...e.details,
      expiresOn: e.details.expiresOn ? new Date(e.details.expiresOn) : undefined,
    },
  }
}

export interface MockAuditOptions {
  user: UserIdentity
  /** Injected for tests; defaults to `window.localStorage`. */
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

/** Mock "backend" audit log, newest first, persisted per browser in localStorage. */
export function createMockAudit({ user, storage = window.localStorage }: MockAuditOptions): AuditService {
  function read(): AuditEvent[] {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Serialized[]).map(revive) : []
    } catch {
      return []
    }
  }

  return {
    async record(event) {
      const full: AuditEvent = {
        ...event,
        id: crypto.randomUUID(),
        at: new Date(),
        actor: { oid: user.oid, name: user.name },
      }
      const events = [full, ...read()].slice(0, MAX_EVENTS)
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(events))
      } catch {
        // Storage full or blocked — auditing is best-effort in the POC.
      }
      console.info('[audit]', full.action, full.target, full.details ?? '')
    },

    async list() {
      return read()
    },
  }
}
