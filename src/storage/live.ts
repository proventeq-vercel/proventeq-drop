import { BlobServiceClient, type ContainerClient } from '@azure/storage-blob'
import type { AccessToken, TokenCredential } from '@azure/core-auth'
import { fileNameFromPath, userPrefix } from './paths'
import { CLOCK_SKEW_MS, MAX_DELEGATION_KEY_TTL_MS, shareWindow } from './shareExpiry'
import {
  attachmentDisposition,
  generateUserDelegationSas,
  type DelegationKey,
} from './userDelegationSas'
import type { StorageService, StoredFile, UserIdentity } from './types'

export interface LiveStorageOptions {
  accountName: string
  containerName: string
  user: UserIdentity
  /** Returns a Storage-scoped access token for the signed-in user. */
  getToken: () => Promise<string>
}

/** Download links for the owner are short-lived — they're opened immediately. */
const DOWNLOAD_TTL_MS = 5 * 60 * 1000
const UPLOAD_BLOCK_SIZE = 8 * 1024 * 1024

/** Adapts the MSAL token getter to the SDK's credential interface. */
function msalCredential(getToken: () => Promise<string>): TokenCredential {
  return {
    async getToken(): Promise<AccessToken> {
      const token = await getToken()
      // MSAL refreshes proactively; the SDK only needs a plausible expiry to cache against.
      return { token, expiresOnTimestamp: Date.now() + 5 * 60 * 1000 }
    },
  }
}

export function createLiveStorage(opts: LiveStorageOptions): StorageService {
  const service = new BlobServiceClient(
    `https://${opts.accountName}.blob.core.windows.net`,
    msalCredential(opts.getToken),
  )
  const container: ContainerClient = service.getContainerClient(opts.containerName)
  const prefix = userPrefix(opts.user.oid)

  let cachedKey: DelegationKey | null = null

  /**
   * One user delegation key, requested for the longest allowed lifetime and
   * reused. A link can't outlive the key that signed it, so fetch a fresh key
   * when the cached one would expire before the requested link.
   */
  async function delegationKey(expiresOn: Date): Promise<DelegationKey> {
    if (cachedKey && cachedKey.signedExpiresOn.getTime() >= expiresOn.getTime()) {
      return cachedKey
    }
    const now = Date.now()
    const res = await service.getUserDelegationKey(
      new Date(now - CLOCK_SKEW_MS),
      new Date(now + MAX_DELEGATION_KEY_TTL_MS),
    )
    cachedKey = {
      signedObjectId: res.signedObjectId,
      signedTenantId: res.signedTenantId,
      signedStartsOn: res.signedStartsOn,
      signedExpiresOn: res.signedExpiresOn,
      signedService: res.signedService,
      signedVersion: res.signedVersion,
      value: res.value,
    }
    return cachedKey
  }

  async function signReadUrl(path: string, ttlMs: number) {
    const window = shareWindow(ttlMs)
    const key = await delegationKey(window.expiresOn)
    const sas = await generateUserDelegationSas(
      {
        accountName: opts.accountName,
        containerName: opts.containerName,
        blobName: path,
        permissions: 'r',
        ...window,
        contentDisposition: attachmentDisposition(fileNameFromPath(path)),
      },
      key,
    )
    return { url: `${container.getBlobClient(path).url}?${sas}`, ...window }
  }

  return {
    async listFiles() {
      const files: StoredFile[] = []
      for await (const blob of container.listBlobsFlat({ prefix })) {
        files.push({
          name: blob.name.slice(prefix.length),
          path: blob.name,
          size: blob.properties.contentLength ?? 0,
          lastModified: blob.properties.lastModified,
          contentType: blob.properties.contentType,
        })
      }
      return files
    },

    async upload(file, { name, onProgress, signal }) {
      const path = prefix + name
      const client = container.getBlockBlobClient(path)
      const res = await client.uploadData(file, {
        blockSize: UPLOAD_BLOCK_SIZE,
        concurrency: 4,
        abortSignal: signal,
        blobHTTPHeaders: { blobContentType: file.type || 'application/octet-stream' },
        metadata: { uploadedby: opts.user.oid },
        onProgress: (ev) => onProgress?.(ev.loadedBytes),
      })
      return {
        name,
        path,
        size: file.size,
        lastModified: res.lastModified ?? new Date(),
        contentType: file.type,
      }
    },

    async deleteFile(path) {
      await container.getBlobClient(path).delete({ deleteSnapshots: 'include' })
    },

    async getDownloadUrl(path) {
      return (await signReadUrl(path, DOWNLOAD_TTL_MS)).url
    },

    async createShareLink(path, ttlMs) {
      const signed = await signReadUrl(path, ttlMs)
      return {
        url: signed.url,
        path,
        fileName: fileNameFromPath(path),
        createdOn: new Date(),
        expiresOn: signed.expiresOn,
      }
    },
  }
}
