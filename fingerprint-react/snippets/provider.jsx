// Mount once at the app root (e.g. src/main.jsx). Region must match your workspace: 'us' | 'eu' | 'ap'.
import { FingerprintProvider } from '@fingerprint/react'

root.render(
  <FingerprintProvider apiKey={import.meta.env.VITE_FINGERPRINT_PUBLIC_API_KEY} region='us'>
    <App />
  </FingerprintProvider>
)
