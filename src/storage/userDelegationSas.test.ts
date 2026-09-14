// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  attachmentDisposition,
  buildStringToSign,
  generateUserDelegationSas,
  sasDate,
  type BlobSasParams,
  type DelegationKey,
} from './userDelegationSas'

// In the node test environment this resolves to the SDK's Node build, whose
// user delegation signer works (the browser build throws) — our reference.
const sdk = await import('@azure/storage-blob')

const key: DelegationKey = {
  signedObjectId: '11111111-2222-3333-4444-555555555555',
  signedTenantId: '66666666-7777-8888-9999-000000000000',
  signedStartsOn: new Date('2026-09-14T09:55:00Z'),
  signedExpiresOn: new Date('2026-09-21T10:00:00Z'),
  signedService: 'b',
  signedVersion: '2025-11-05',
  value: btoa('super-secret-delegation-key-bytes'),
}

const params: BlobSasParams = {
  accountName: 'proventeqdrop',
  containerName: 'drop',
  blobName: `${key.signedObjectId}/Quarterly report (1).pdf`,
  permissions: 'r',
  startsOn: new Date('2026-09-14T09:55:00.123Z'),
  expiresOn: new Date('2026-09-15T10:00:00.456Z'),
  contentDisposition: attachmentDisposition('Quarterly report (1).pdf'),
}

describe('user delegation SAS', () => {
  it('formats dates without milliseconds', () => {
    expect(sasDate(new Date('2026-09-14T09:55:00.123Z'))).toBe('2026-09-14T09:55:00Z')
  })

  it('produces the same signature and parameters as the SDK Node signer', async () => {
    const ours = new URLSearchParams(await generateUserDelegationSas(params, key))

    const reference = sdk.generateBlobSASQueryParameters(
      {
        containerName: params.containerName,
        blobName: params.blobName,
        permissions: sdk.BlobSASPermissions.parse('r'),
        startsOn: params.startsOn,
        expiresOn: params.expiresOn,
        protocol: sdk.SASProtocol.Https,
        version: '2020-12-06',
        contentDisposition: params.contentDisposition,
      },
      key,
      params.accountName,
    )
    const theirs = new URLSearchParams(reference.toString())

    expect(ours.get('sig')).toBe(theirs.get('sig'))
    expect(Object.fromEntries(ours)).toEqual(Object.fromEntries(theirs))
  })

  it('signs the blob resource with https only', () => {
    const lines = buildStringToSign(params, key).split('\n')
    expect(lines).toHaveLength(24)
    expect(lines[3]).toBe(`/blob/proventeqdrop/drop/${params.blobName}`)
    expect(lines[14]).toBe('https')
    expect(lines[16]).toBe('b')
  })
})
