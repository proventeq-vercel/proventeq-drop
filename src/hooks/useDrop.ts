import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServices } from '../services/context'
import { sanitizeFileName, uniqueFileName } from '../storage/paths'
import type { AuditEvent } from '../audit/types'
import type { StoredFile } from '../storage/types'

const FILES_KEY = ['files'] as const
const AUDIT_KEY = ['audit'] as const

export function useFiles() {
  const { storage } = useServices()
  return useQuery({
    queryKey: FILES_KEY,
    queryFn: async () => {
      const files = await storage.listFiles()
      return files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
    },
  })
}

export function useAuditLog() {
  const { audit } = useServices()
  return useQuery({ queryKey: AUDIT_KEY, queryFn: () => audit.list(), staleTime: 0 })
}

export interface ActiveShare {
  id: string
  fileName: string
  path: string
  url: string
  createdOn: Date
  expiresOn: Date
}

/** Share links derived from the audit log (POC shortcut — see AuditEvent.details.url). */
export function sharesFromAudit(events: AuditEvent[]): ActiveShare[] {
  return events
    .filter((e) => e.action === 'share.created' && e.details?.url && e.details.expiresOn)
    .map((e) => ({
      id: e.id,
      path: e.target,
      fileName: e.target.slice(e.target.lastIndexOf('/') + 1),
      url: e.details!.url!,
      createdOn: e.at,
      expiresOn: e.details!.expiresOn!,
    }))
}

function useInvalidate() {
  const qc = useQueryClient()
  return useCallback(
    (...keys: (typeof FILES_KEY | typeof AUDIT_KEY)[]) =>
      Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey }))),
    [qc],
  )
}

export function useDeleteFile() {
  const { storage } = useServices()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (file: StoredFile) => storage.deleteFile(file.path),
    onSettled: () => invalidate(FILES_KEY, AUDIT_KEY),
  })
}

export function useCreateShareLink() {
  const { storage } = useServices()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ file, ttlMs }: { file: StoredFile; ttlMs: number }) =>
      storage.createShareLink(file.path, ttlMs),
    onSuccess: () => invalidate(AUDIT_KEY),
  })
}

export function useDownload() {
  const { storage } = useServices()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (file: StoredFile) => {
      const url = await storage.getDownloadUrl(file.path)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    },
    onSuccess: () => invalidate(AUDIT_KEY),
  })
}

export type UploadStatus = 'uploading' | 'done' | 'error'

export interface UploadItem {
  id: string
  name: string
  size: number
  loaded: number
  status: UploadStatus
  error?: unknown
}

/**
 * Tracks the upload tray. Names are de-duplicated against both stored files and
 * uploads still in flight, so dropping the same file twice yields `a (1).txt`.
 */
export function useUploads() {
  const { storage } = useServices()
  const qc = useQueryClient()
  const invalidate = useInvalidate()
  const [items, setItems] = useState<UploadItem[]>([])
  const inFlightNames = useRef(new Set<string>())

  const patch = useCallback((id: string, change: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...change } : it)))
  }, [])

  const start = useCallback(
    (files: File[]) => {
      const stored = qc.getQueryData<StoredFile[]>(FILES_KEY) ?? []
      for (const file of files) {
        const taken = [...stored.map((f) => f.name), ...inFlightNames.current]
        const name = uniqueFileName(sanitizeFileName(file.name), taken)
        inFlightNames.current.add(name)
        const id = crypto.randomUUID()
        setItems((prev) => [{ id, name, size: file.size, loaded: 0, status: 'uploading' }, ...prev])

        storage
          .upload(file, { name, onProgress: (loaded) => patch(id, { loaded }) })
          .then(() => patch(id, { status: 'done', loaded: file.size }))
          .catch((error: unknown) => patch(id, { status: 'error', error }))
          .finally(() => {
            inFlightNames.current.delete(name)
            void invalidate(FILES_KEY, AUDIT_KEY)
          })
      }
    },
    [qc, storage, patch, invalidate],
  )

  const clearFinished = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status === 'uploading'))
  }, [])

  return { items, start, clearFinished }
}
