/** The signed-in user the app acts on behalf of. */
export interface UserIdentity {
  /** Entra object id — used as the per-user folder name. */
  oid: string
  name: string
  username: string
}

export interface StoredFile {
  /** File name as shown to the user (no user prefix). */
  name: string
  /** Full blob name inside the container, e.g. `<oid>/report.pdf`. */
  path: string
  size: number
  lastModified: Date
  contentType?: string
}

export interface ShareLink {
  url: string
  fileName: string
  path: string
  createdOn: Date
  expiresOn: Date
}

export interface UploadOptions {
  /** Name to store under — callers pass a de-duplicated name. */
  name: string
  onProgress?: (loadedBytes: number) => void
  signal?: AbortSignal
}

/**
 * Everything the UI needs from storage. `live.ts` talks to Azure Blob Storage
 * with the user's delegated token; `mock.ts` keeps files in memory.
 */
export interface StorageService {
  listFiles(): Promise<StoredFile[]>
  upload(file: File, options: UploadOptions): Promise<StoredFile>
  deleteFile(path: string): Promise<void>
  /** A short-lived URL the owner can open to download the file. */
  getDownloadUrl(path: string): Promise<string>
  /** A read-only link anyone can open until `ttlMs` has elapsed. */
  createShareLink(path: string, ttlMs: number): Promise<ShareLink>
}
