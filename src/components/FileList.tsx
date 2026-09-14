import { useState } from 'react'
import { Download, FolderOpen, Share2, Trash2 } from 'lucide-react'
import { useDeleteFile, useDownload, useFiles } from '@/hooks/useDrop'
import type { StoredFile } from '@/storage/types'
import { formatBytes, formatDateTime, formatRelative } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorCallout } from './ErrorCallout'
import { FileIcon } from './FileIcon'

export function FileList({ onShare }: { onShare: (file: StoredFile) => void }) {
  const files = useFiles()
  const del = useDeleteFile()
  const download = useDownload()
  const [confirming, setConfirming] = useState<string | null>(null)

  const list = files.data ?? []
  const total = list.reduce((sum, f) => sum + f.size, 0)

  return (
    <Card className="gap-0 p-0">
      <div className="flex items-baseline justify-between border-b border-hairline px-5 py-4">
        <h2 className="text-base font-semibold text-ink">My files</h2>
        {files.isSuccess && (
          <p className="tabular text-sm text-muted-foreground">
            {list.length} file{list.length === 1 ? '' : 's'} · {formatBytes(total)}
          </p>
        )}
      </div>

      {(del.isError || download.isError) && (
        <ErrorCallout error={del.error ?? download.error} className="m-4" />
      )}

      {files.isPending && (
        <div className="space-y-3 p-5" aria-label="Loading files">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      )}

      {files.isError && <ErrorCallout error={files.error} className="m-4" />}

      {files.isSuccess && list.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <FolderOpen className="size-10 text-hairline" aria-hidden="true" />
          <p className="font-semibold text-ink">No files yet</p>
          <p className="text-sm text-muted-foreground">Drop something above to get started.</p>
        </div>
      )}

      {files.isSuccess && list.length > 0 && (
        <ul className="divide-y divide-hairline" aria-label="Files">
          {list.map((file) => (
            <li key={file.path} className="group flex items-center gap-3 px-5 py-3 hover:bg-canvas">
              <FileIcon name={file.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink" title={file.name}>{file.name}</p>
                <p className="tabular text-xs text-muted-foreground">
                  {formatBytes(file.size)} · <span title={formatDateTime(file.lastModified)}>{formatRelative(file.lastModified)}</span>
                </p>
              </div>

              {confirming === file.path ? (
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-xs text-muted-foreground sm:inline">Delete permanently?</span>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={del.isPending}
                    onClick={() => del.mutate(file, { onSettled: () => setConfirming(null) })}
                  >
                    Delete
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => onShare(file)}>
                    <Share2 aria-hidden="true" /> Share
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Download ${file.name}`} onClick={() => download.mutate(file)}>
                    <Download aria-hidden="true" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${file.name}`} onClick={() => setConfirming(file.path)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
