import { describe, it, expect } from 'vitest'
import { parseConfig } from './appConfig'

const valid = {
  VITE_CLIENT_ID: 'client-123',
  VITE_AUTHORITY_URI: 'https://login.microsoftonline.com/tenant-abc',
  VITE_REDIRECT_URI: 'http://localhost:5173/',
  VITE_STORAGE_ACCOUNT: 'proventeqdrop',
}

describe('parseConfig', () => {
  it('returns config and defaults the container to "drop"', () => {
    expect(parseConfig({ ...valid, MODE: 'production' })).toEqual({ ...valid, VITE_CONTAINER: 'drop' })
  })

  it('keeps an explicit container', () => {
    expect(parseConfig({ ...valid, VITE_CONTAINER: 'files' }).VITE_CONTAINER).toBe('files')
  })

  it('throws on a non-object source', () => {
    expect(() => parseConfig(null)).toThrow(/not an object/)
  })

  it('throws when a required key is missing or empty', () => {
    expect(() => parseConfig({ ...valid, VITE_STORAGE_ACCOUNT: '' })).toThrow(/VITE_STORAGE_ACCOUNT/)
    expect(() => parseConfig({})).toThrow(/VITE_CLIENT_ID/)
  })
})
