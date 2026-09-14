const HOUR = 60 * 60 * 1000

export interface ExpiryOption {
  label: string
  ttlMs: number
}

export const SHARE_EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: '1 hour', ttlMs: HOUR },
  { label: '1 day', ttlMs: 24 * HOUR },
  { label: '7 days', ttlMs: 7 * 24 * HOUR },
]

/**
 * A user delegation key must expire within 7 days of now, and a SAS can't outlive
 * its key. Keep a margin so the "7 days" option never trips the service limit.
 */
export const MAX_DELEGATION_KEY_TTL_MS = 7 * 24 * HOUR - 10 * 60 * 1000
export const MAX_SHARE_TTL_MS = MAX_DELEGATION_KEY_TTL_MS - 5 * 60 * 1000

/** Start the SAS slightly in the past so clock skew doesn't reject a fresh link. */
export const CLOCK_SKEW_MS = 5 * 60 * 1000

export interface SasWindow {
  startsOn: Date
  expiresOn: Date
}

/** Compute the validity window for a link, clamping the TTL to (0, 7 days]. */
export function shareWindow(ttlMs: number, now: Date = new Date()): SasWindow {
  const ttl = Math.min(Math.max(ttlMs, 60 * 1000), MAX_SHARE_TTL_MS)
  return {
    startsOn: new Date(now.getTime() - CLOCK_SKEW_MS),
    expiresOn: new Date(now.getTime() + ttl),
  }
}
