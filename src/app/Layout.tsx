import type { ReactNode } from 'react'
import { useMsal } from '@azure/msal-react'
import { env } from '@/config/env'
import { useServices } from '@/services/context'
import { Badge } from '@/components/ui/badge'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

/** Live mode only — calls useMsal(). */
function SignOutButton() {
  const { instance } = useMsal()
  return (
    <button type="button" className="text-sm font-medium text-ink-soft hover:text-ink" onClick={() => void instance.logoutRedirect()}>
      Sign out
    </button>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useServices()
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-brand font-bold text-white">P</span>
            <span className="text-lg font-bold text-ink">
              Proventeq <span className="font-semibold text-brand">Drop</span>
            </span>
            {env.useMock && <Badge variant="secondary" className="ml-1">Mock mode</Badge>}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-ink">{user.name}</p>
              <p className="text-xs leading-tight text-muted-foreground">{user.username}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-ink-soft text-sm font-semibold text-white" aria-hidden="true">
              {initials(user.name)}
            </span>
            {!env.useMock && <SignOutButton />}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
