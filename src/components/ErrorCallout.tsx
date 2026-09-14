import { AlertTriangle } from 'lucide-react'
import { describeStorageError } from '@/storage/errors'
import { cn } from '@/lib/utils'

export function ErrorCallout({ error, className }: { error: unknown; className?: string }) {
  const { title, hint } = describeStorageError(error)
  return (
    <div role="alert" className={cn('flex gap-3 rounded-xl border border-hairline border-l-[3px] border-l-coral bg-surface p-4', className)}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}
