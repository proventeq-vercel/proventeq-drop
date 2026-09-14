import { useState } from 'react'
import { Clock, Link2, ShieldAlert } from 'lucide-react'
import { useCreateShareLink } from '@/hooks/useDrop'
import { SHARE_EXPIRY_OPTIONS } from '@/storage/shareExpiry'
import type { StoredFile } from '@/storage/types'
import { formatBytes, formatDateTime, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { CopyField } from './CopyField'
import { ErrorCallout } from './ErrorCallout'
import { FileIcon } from './FileIcon'

export function ShareDialog({ file, onClose }: { file: StoredFile | null; onClose: () => void }) {
  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onClose()}>
      {/* Keyed so each file starts with a fresh form. */}
      <DialogContent>{file && <ShareForm key={file.path} file={file} />}</DialogContent>
    </Dialog>
  )
}

function ShareForm({ file }: { file: StoredFile }) {
  const [ttlMs, setTtlMs] = useState(SHARE_EXPIRY_OPTIONS[1].ttlMs)
  const share = useCreateShareLink()
  const link = share.data

  return (
    <>
      <DialogTitle>Share file</DialogTitle>
      <DialogDescription>Anyone with the link can download this file until it expires.</DialogDescription>

      <div className="mt-5 flex items-center gap-3 rounded-lg border border-hairline bg-canvas p-3">
        <FileIcon name={file.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
        </div>
      </div>

      {!link ? (
        <>
          <fieldset className="mt-5">
            <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
              <Clock className="size-4 text-muted-foreground" aria-hidden="true" /> Link expires after
            </legend>
            <div role="radiogroup" className="grid grid-cols-3 gap-2">
              {SHARE_EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.ttlMs}
                  type="button"
                  role="radio"
                  aria-checked={ttlMs === opt.ttlMs}
                  onClick={() => setTtlMs(opt.ttlMs)}
                  className={cn(
                    'h-9 rounded-lg border text-sm font-medium transition-colors',
                    ttlMs === opt.ttlMs
                      ? 'border-brand bg-brand/10 text-brand-strong'
                      : 'border-hairline text-ink-soft hover:bg-muted',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          {share.isError && <ErrorCallout error={share.error} className="mt-4" />}

          <div className="mt-6 flex justify-end">
            <Button size="lg" disabled={share.isPending} onClick={() => share.mutate({ file, ttlMs })}>
              <Link2 aria-hidden="true" />
              {share.isPending ? 'Creating link…' : 'Create link'}
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-5 space-y-3">
          <CopyField value={link.url} label="Share link" />
          <p className="text-sm text-muted-foreground">
            Expires <span className="font-medium text-ink">{formatRelative(link.expiresOn)}</span> · {formatDateTime(link.expiresOn)}
          </p>
          <p className="flex gap-2 rounded-lg bg-amber/10 p-3 text-xs text-ink-soft">
            <ShieldAlert className="size-4 shrink-0 text-amber" aria-hidden="true" />
            POC limitation: a link can&apos;t be revoked on its own. Deleting the file stops it working.
          </p>
        </div>
      )}
    </>
  )
}
