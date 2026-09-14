import { Download, History, Link2, Share2, Trash2, Upload } from 'lucide-react'
import { sharesFromAudit, useAuditLog } from '@/hooks/useDrop'
import type { AuditAction, AuditEvent } from '@/audit/types'
import { formatDateTime, formatRelative } from '@/lib/format'
import { env } from '@/config/env'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CopyButton } from './CopyField'

function PanelHeader({ icon: Icon, title }: { icon: typeof History; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-hairline px-5 py-3.5">
      <Icon className="size-4 text-brand" aria-hidden="true" />
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
    </div>
  )
}

export function SharedLinksPanel() {
  const audit = useAuditLog()
  const now = new Date()
  const shares = sharesFromAudit(audit.data ?? []).slice(0, 8)

  return (
    <Card className="gap-0 p-0">
      <PanelHeader icon={Link2} title="Shared links" />
      {shares.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Links you create show up here.</p>
      ) : (
        <ul className="divide-y divide-hairline" aria-label="Shared links">
          {shares.map((s) => {
            const expired = s.expiresOn <= now
            return (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{s.fileName}</p>
                  <p className="text-xs text-muted-foreground" title={formatDateTime(s.expiresOn)}>
                    {expired ? 'Expired' : 'Expires'} {formatRelative(s.expiresOn, now)}
                  </p>
                </div>
                {expired ? (
                  <Badge variant="secondary">Expired</Badge>
                ) : (
                  <CopyButton text={s.url} label="Copy" />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

const ACTIONS: Record<AuditAction, { verb: string; Icon: typeof Upload; tone: string }> = {
  'file.uploaded': { verb: 'uploaded', Icon: Upload, tone: 'text-brand-strong bg-brand/10' },
  'file.deleted': { verb: 'deleted', Icon: Trash2, tone: 'text-coral bg-coral/10' },
  'file.downloaded': { verb: 'downloaded', Icon: Download, tone: 'text-sky bg-sky/10' },
  'share.created': { verb: 'shared', Icon: Share2, tone: 'text-amber bg-amber/10' },
}

function ActivityRow({ event }: { event: AuditEvent }) {
  const { verb, Icon, tone } = ACTIONS[event.action]
  const fileName = event.target.slice(event.target.lastIndexOf('/') + 1)
  return (
    <li className="flex gap-3 px-5 py-2.5">
      <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${tone}`} aria-hidden="true">
        <Icon className="size-3" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="text-ink-soft">
          <span className="font-medium text-ink">{event.actor.name}</span> {verb}{' '}
          <span className="font-medium break-words text-ink">{fileName}</span>
        </p>
        <p className="text-xs text-muted-foreground" title={formatDateTime(event.at)}>
          {formatRelative(event.at)}
        </p>
      </div>
    </li>
  )
}

export function ActivityPanel() {
  const audit = useAuditLog()
  const events = (audit.data ?? []).slice(0, 25)

  return (
    <Card className="gap-0 p-0">
      <PanelHeader icon={History} title="Activity" />
      {events.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Uploads, shares and deletes are logged here.</p>
      ) : (
        <ul className="max-h-[420px] overflow-y-auto py-1" aria-label="Activity">
          {events.map((e) => <ActivityRow key={e.id} event={e} />)}
        </ul>
      )}
      <p className="border-t border-hairline px-5 py-3 text-xs text-muted-foreground">
        Mock audit log, stored in this browser only.
        {!env.useMock && ' Storage calls are real.'} The full product writes these events to the audit backend.
      </p>
    </Card>
  )
}
