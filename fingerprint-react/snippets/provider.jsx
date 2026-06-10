// Mount once at the app root (e.g. src/main.jsx). The region MUST match your workspace
// ('us' | 'eu' | 'ap') or identification fails with "API key not found" — read it from env,
// don't hardcode it.
import { FingerprintProvider } from '@fingerprint/react'

root.render(
  <FingerprintProvider
    apiKey={import.meta.env.VITE_FINGERPRINT_PUBLIC_API_KEY}
    region={import.meta.env.VITE_FINGERPRINT_REGION}
  >
    <App />
  </FingerprintProvider>
)
