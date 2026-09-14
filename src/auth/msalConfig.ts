import { type Configuration, PublicClientApplication } from '@azure/msal-browser'
import { getConfig } from '../config/appConfig'

let _msalInstance: PublicClientApplication | null = null

/**
 * Lazy singleton MSAL instance built from the build-time config. Only call this
 * in live mode — mock mode never touches MSAL.
 */
export function getMsalInstance(): PublicClientApplication {
  if (!_msalInstance) {
    const c = getConfig()
    const msalConfig: Configuration = {
      auth: {
        clientId: c.VITE_CLIENT_ID,
        authority: c.VITE_AUTHORITY_URI,
        redirectUri: c.VITE_REDIRECT_URI,
      },
      cache: {
        cacheLocation: 'localStorage',
      },
    }
    _msalInstance = new PublicClientApplication(msalConfig)
  }
  return _msalInstance
}

/**
 * Delegated Azure Storage permission. The browser calls Blob Storage directly
 * with the signed-in user's token — Entra RBAC on the container decides what
 * the user may do. No backend, no account keys.
 */
export const STORAGE_SCOPES = ['https://storage.azure.com/user_impersonation']
