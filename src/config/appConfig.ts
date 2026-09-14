/**
 * Live-mode configuration, read from build-time Vite env vars
 * (`import.meta.env.VITE_*`). For local dev copy `.env.example` to `.env`.
 *
 * Never read in mock mode — {@link getConfig} is only called from live-mode
 * bootstrap, MSAL setup and the live storage service.
 */
export interface AppConfig {
  VITE_CLIENT_ID: string
  VITE_AUTHORITY_URI: string
  VITE_REDIRECT_URI: string
  VITE_STORAGE_ACCOUNT: string
  VITE_CONTAINER: string
}

const REQUIRED_KEYS = [
  'VITE_CLIENT_ID',
  'VITE_AUTHORITY_URI',
  'VITE_REDIRECT_URI',
  'VITE_STORAGE_ACCOUNT',
] as const

export const DEFAULT_CONTAINER = 'drop'

let _config: AppConfig | null = null

/**
 * Validate an env source (typically `import.meta.env`) into an {@link AppConfig}.
 * Pure so it is unit-testable. Throws a clear, actionable error on any missing
 * required key.
 */
export function parseConfig(source: unknown): AppConfig {
  if (!source || typeof source !== 'object') {
    throw new Error(
      'App config source is not an object. Copy .env.example to .env and fill in the VITE_* values.',
    )
  }
  const env = source as Record<string, unknown>
  for (const key of REQUIRED_KEYS) {
    if (typeof env[key] !== 'string' || env[key] === '') {
      throw new Error(
        `Missing required environment variable "${key}". Copy .env.example to .env and fill in the VITE_* values.`,
      )
    }
  }
  const container = env.VITE_CONTAINER
  return {
    VITE_CLIENT_ID: env.VITE_CLIENT_ID as string,
    VITE_AUTHORITY_URI: env.VITE_AUTHORITY_URI as string,
    VITE_REDIRECT_URI: env.VITE_REDIRECT_URI as string,
    VITE_STORAGE_ACCOUNT: env.VITE_STORAGE_ACCOUNT as string,
    VITE_CONTAINER: typeof container === 'string' && container !== '' ? container : DEFAULT_CONTAINER,
  }
}

/** Return the validated, cached live config. Throws if a required var is missing. */
export function getConfig(): AppConfig {
  if (!_config) {
    _config = parseConfig(import.meta.env)
  }
  return _config
}
