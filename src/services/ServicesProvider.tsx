import { useMemo, useState, type ReactNode } from 'react'
import { useMsal } from '@azure/msal-react'
import type { AccountInfo } from '@azure/msal-browser'
import { acquireToken } from '../auth/tokens'
import { STORAGE_SCOPES } from '../auth/msalConfig'
import { withAudit } from '../audit/auditedStorage'
import { createMockAudit } from '../audit/mock'
import { getConfig } from '../config/appConfig'
import { env } from '../config/env'
import { createLiveStorage } from '../storage/live'
import { createMockStorage, MOCK_USER } from '../storage/mock'
import type { UserIdentity } from '../storage/types'
import { ServicesContext, type Services } from './context'

function identityFrom(account: AccountInfo): UserIdentity {
  const oid = (account.idTokenClaims?.oid as string | undefined) ?? account.localAccountId
  return { oid, name: account.name ?? account.username, username: account.username }
}

function MockServicesProvider({ children }: { children: ReactNode }) {
  const [services] = useState<Services>(() => {
    const audit = createMockAudit({ user: MOCK_USER })
    return { user: MOCK_USER, audit, storage: withAudit(createMockStorage(), audit) }
  })
  return <ServicesContext value={services}>{children}</ServicesContext>
}

/** Live mode — only mounted inside MsalProvider, after sign-in. */
function LiveServicesProvider({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal()
  const account = instance.getActiveAccount() ?? accounts[0] ?? null

  const services = useMemo<Services | null>(() => {
    if (!account) return null
    const config = getConfig()
    const user = identityFrom(account)
    const audit = createMockAudit({ user })
    const storage = createLiveStorage({
      accountName: config.VITE_STORAGE_ACCOUNT,
      containerName: config.VITE_CONTAINER,
      user,
      getToken: () => acquireToken(instance, account, STORAGE_SCOPES),
    })
    return { user, audit, storage: withAudit(storage, audit) }
  }, [instance, account])

  if (!services) return null
  return <ServicesContext value={services}>{children}</ServicesContext>
}

export function ServicesProvider({ children }: { children: ReactNode }) {
  return env.useMock ? (
    <MockServicesProvider>{children}</MockServicesProvider>
  ) : (
    <LiveServicesProvider>{children}</LiveServicesProvider>
  )
}
