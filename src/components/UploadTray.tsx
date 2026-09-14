import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import type { UploadItem } from '@/hooks/useDrop'
import { describeStorageError } from '@/storage/errors'
import { formatBytes } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function UploadTray({ items, onClear }: { items: UploadItem[]; onClear: () => void }) {
  if (items.length === 0) return null
  const active = items.filter((i) => i.status === 'uploading').length

  return (
    <Card className="gap-0 p-0" aria-label="Uploads">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <p className="text-sm font-semibold text-ink">
          {active > 0 ? `Uploading ${active} file${active === 1 ? '' : 's'}…` : 'Uploads complete'}
        </p>
        {active < items.length && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear finished
          </Button>
        )}
      </div>
      <ul className="max-h-56 divide-y divide-hairline overflow-y-auto">
        {items.map((item) => {
          const pct = item.size === 0 ? 100 : Math.round((item.loaded / item.size) * 100)
          return (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              {item.status === 'uploading' && <Loader2 className="size-4 shrink-0 animate-spin text-brand" aria-hidden="true" />}
              {item.status === 'done' && <CheckCircle2 className="size-4 shrink-0 text-brand" aria-hidden="true" />}
              {item.status === 'error' && <XCircle className="size-4 shrink-0 text-coral" aria-hidden="true" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm text-ink">{item.name}</p>
                  <p className="tabular shrink-0 text-xs text-muted-foreground">
                    {item.status === 'error' ? 'Failed' : `${formatBytes(item.loaded)} / ${formatBytes(item.size)}`}
                  </p>
                </div>
                {item.status === 'error' ? (
                  <p className="mt-0.5 text-xs text-coral">{describeStorageError(item.error).hint}</p>
                ) : (
                  <div
                    role="progressbar"
                    aria-label={`Upload progress for ${item.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"
                  >
                    <div className="h-full rounded-full bg-brand transition-[width] duration-200" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
