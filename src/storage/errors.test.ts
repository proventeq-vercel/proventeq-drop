import { describe, it, expect } from 'vitest'
import { describeStorageError } from './errors'

describe('describeStorageError', () => {
  it('maps 403 to the missing role hint', () => {
    expect(describeStorageError({ statusCode: 403 }).hint).toMatch(/Storage Blob Data Contributor/)
  })

  it('maps network failures to the CORS hint', () => {
    expect(describeStorageError(new TypeError('Failed to fetch')).hint).toMatch(/CORS/)
    expect(describeStorageError(Object.assign(new Error('x'), { code: 'REQUEST_SEND_ERROR' })).hint).toMatch(/CORS/)
  })

  it('maps a missing container', () => {
    expect(describeStorageError({ statusCode: 404, code: 'ContainerNotFound' }).hint).toMatch(/VITE_CONTAINER/)
  })

  it('falls back to the raw message', () => {
    expect(describeStorageError(new Error('boom'))).toEqual({ title: 'Something went wrong', hint: 'boom' })
  })
})
