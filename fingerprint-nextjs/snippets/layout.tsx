// app/layout.tsx — the root layout stays a server component; wrap {children} in the client
// provider so the whole app can call useVisitorData(). Mount the provider once, here only.
import { FingerprintClientProvider } from './fingerprint-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FingerprintClientProvider>{children}</FingerprintClientProvider>
      </body>
    </html>
  )
}
