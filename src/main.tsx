import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getConfig } from './config/appConfig'
import { env } from './config/env'
import { MsalAuthProvider } from './auth/MsalAuthProvider'
import { ServicesProvider } from './services/ServicesProvider'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000, retry: 1, refetchOnWindowFocus: true },
  },
})

function render(tree: ReactNode) {
  createRoot(document.getElementById('root')!).render(<StrictMode>{tree}</StrictMode>)
}

const appTree = (
  <QueryClientProvider client={queryClient}>
    <ServicesProvider>
      <App />
    </ServicesProvider>
  </QueryClientProvider>
)

function renderBootstrapError(err: unknown) {
  console.error('Bootstrap failed:', err)
  const message = err instanceof Error ? err.message : String(err)
  render(
    <div className="auth-screen">
      <div className="error-state" style={{ maxWidth: 480, width: '100%' }}>
        <p className="error-state__message">Couldn&apos;t start Proventeq Drop</p>
        <p className="error-state__hint">{message}</p>
      </div>
    </div>,
  )
}

try {
  if (env.useMock) {
    // Mock mode: in-memory storage, no MSAL, no Azure config.
    render(appTree)
  } else {
    // Validate config eagerly so a missing VITE_* var is a clear error, not a crash.
    getConfig()
    render(<MsalAuthProvider>{appTree}</MsalAuthProvider>)
  }
} catch (err) {
  renderBootstrapError(err)
}
