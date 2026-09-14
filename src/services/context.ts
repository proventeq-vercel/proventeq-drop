import { createContext, useContext } from 'react'
import type { AuditService } from '../audit/types'
import type { StorageService, UserIdentity } from '../storage/types'

export interface Services {
  user: UserIdentity
  /** Already wrapped with auditing. */
  storage: StorageService
  audit: AuditService
}

export const ServicesContext = createContext<Services | null>(null)

export function useServices(): Services {
  const ctx = useContext(ServicesContext)
  if (!ctx) throw new Error('useServices must be used within a <ServicesProvider>')
  return ctx
}
