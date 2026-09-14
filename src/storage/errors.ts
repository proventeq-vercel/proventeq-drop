export interface FriendlyError {
  title: string
  hint: string
}

function statusOf(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const s = (err as { statusCode?: unknown }).statusCode
    return typeof s === 'number' ? s : undefined
  }
  return undefined
}

function codeOf(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: unknown }).code
    return typeof c === 'string' ? c : undefined
  }
  return undefined
}

/**
 * Translate Storage / network failures into something a user (or the admin
 * setting up the POC) can act on. The common setup mistakes are a missing RBAC
 * role and missing CORS rules — the latter surfaces as a bare network error
 * because the browser hides the blocked response.
 */
export function describeStorageError(err: unknown): FriendlyError {
  const status = statusOf(err)
  const code = codeOf(err)
  const message = err instanceof Error ? err.message : String(err)

  if (status === 403 || code === 'AuthorizationPermissionMismatch' || code === 'AuthorizationFailure') {
    return {
      title: 'Access denied by Azure Storage',
      hint: 'Your account needs "Storage Blob Data Contributor" on the container, plus "Storage Blob Delegator" on the storage account to create share links. New role assignments can take a few minutes to apply.',
    }
  }
  if (status === 404 || code === 'ContainerNotFound' || code === 'BlobNotFound') {
    return {
      title: 'Not found',
      hint: code === 'ContainerNotFound'
        ? 'The configured container does not exist. Check VITE_CONTAINER.'
        : 'The file no longer exists — it may have been deleted elsewhere.',
    }
  }
  if (status === 0 || code === 'REQUEST_SEND_ERROR' || /failed to fetch|networkerror|load failed/i.test(message)) {
    return {
      title: 'Could not reach Azure Storage',
      hint: 'Check your connection and the storage account name. If those are right, the storage account is probably missing a CORS rule for this app\'s origin (see README).',
    }
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return { title: 'Cancelled', hint: 'The operation was cancelled.' }
  }
  return { title: 'Something went wrong', hint: message }
}
