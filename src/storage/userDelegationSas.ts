/**
 * Browser-side user delegation SAS signing.
 *
 * `@azure/storage-blob`'s browser build ships `generateBlobSASQueryParameters`
 * but its `UserDelegationKeyCredential` throws "ONLY AVAILABLE IN NODE.JS
 * RUNTIME" (its HMAC is synchronous Node crypto). So we build the string-to-sign
 * ourselves for service version 2020-12-06 and sign with WebCrypto.
 *
 * Format reference: https://learn.microsoft.com/rest/api/storageservices/create-user-delegation-sas
 * Cross-checked against the SDK's Node signer in `userDelegationSas.test.ts`.
 */
export const SAS_VERSION = '2020-12-06'

/** Shape returned by `BlobServiceClient.getUserDelegationKey()`. */
export interface DelegationKey {
  signedObjectId: string
  signedTenantId: string
  signedStartsOn: Date
  signedExpiresOn: Date
  signedService: string
  signedVersion: string
  /** Base64-encoded HMAC key. */
  value: string
}

export interface BlobSasParams {
  accountName: string
  containerName: string
  blobName: string
  /** Canonically ordered blob permissions, e.g. `r`. */
  permissions: string
  startsOn: Date
  expiresOn: Date
  /** Response header override, e.g. `attachment; filename="a.pdf"`. */
  contentDisposition?: string
}

/** ISO-8601 without milliseconds, as the service expects (`2026-09-14T10:00:00Z`). */
export function sasDate(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function buildStringToSign(p: BlobSasParams, key: DelegationKey): string {
  return [
    p.permissions,
    sasDate(p.startsOn),
    sasDate(p.expiresOn),
    `/blob/${p.accountName}/${p.containerName}/${p.blobName}`,
    key.signedObjectId,
    key.signedTenantId,
    sasDate(key.signedStartsOn),
    sasDate(key.signedExpiresOn),
    key.signedService,
    key.signedVersion,
    '', // signedAuthorizedUserObjectId
    '', // signedUnauthorizedUserObjectId
    '', // signedCorrelationId
    '', // signedIP
    'https', // signedProtocol
    SAS_VERSION,
    'b', // signedResource: blob
    '', // signedSnapshotTime
    '', // signedEncryptionScope
    '', // rscc
    p.contentDisposition ?? '',
    '', // rsce
    '', // rscl
    '', // rsct
  ].join('\n')
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function bytesToBase64(buf: ArrayBuffer): string {
  let bin = ''
  for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b)
  return btoa(bin)
}

async function hmacSha256Base64(keyB64: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToBytes(keyB64),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return bytesToBase64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))
}

/** Returns the SAS query string (no leading `?`). */
export async function generateUserDelegationSas(p: BlobSasParams, key: DelegationKey): Promise<string> {
  const sig = await hmacSha256Base64(key.value, buildStringToSign(p, key))
  const q = new URLSearchParams({
    sv: SAS_VERSION,
    spr: 'https',
    st: sasDate(p.startsOn),
    se: sasDate(p.expiresOn),
    skoid: key.signedObjectId,
    sktid: key.signedTenantId,
    skt: sasDate(key.signedStartsOn),
    ske: sasDate(key.signedExpiresOn),
    sks: key.signedService,
    skv: key.signedVersion,
    sr: 'b',
    sp: p.permissions,
  })
  if (p.contentDisposition) q.set('rscd', p.contentDisposition)
  q.set('sig', sig)
  return q.toString()
}

/** `attachment` disposition with an RFC 5987 filename so non-ASCII names survive. */
export function attachmentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}
