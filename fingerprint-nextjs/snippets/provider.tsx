// app/fingerprint-provider.tsx — a 'use client' wrapper around FingerprintProvider.
// The provider needs to run in the browser, so it can't live directly in the server-rendered
// layout. Region MUST match your workspace ('us' | 'eu' | 'ap') or identification fails with
// "API key not found" — read both values from NEXT_PUBLIC_ env vars, don't hardcode.
'use client'

import { FingerprintProvider } from '@fingerprint/react'

export function FingerprintClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <FingerprintProvider
      apiKey={process.env.NEXT_PUBLIC_FINGERPRINT_PUBLIC_API_KEY!}
      region={process.env.NEXT_PUBLIC_FINGERPRINT_REGION as 'us' | 'eu' | 'ap'}
    >
      {children}
    </FingerprintProvider>
  )
}
