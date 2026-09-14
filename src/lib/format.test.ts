import { describe, it, expect } from 'vitest'
import { formatBytes, formatRelative } from './format'

describe('format', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(8 * 1024 * 1024)).toBe('8 MB')
  })

  it('formats relative times in both directions', () => {
    const now = new Date('2026-09-14T12:00:00Z')
    expect(formatRelative(new Date('2026-09-14T11:57:00Z'), now)).toMatch(/3 minutes ago/)
    expect(formatRelative(new Date('2026-09-20T12:00:00Z'), now)).toMatch(/in 6 days/)
  })
})
