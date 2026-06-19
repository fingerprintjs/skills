// Register once at the app root (standalone app: src/app/app.config.ts).
// The region MUST match your workspace ('us' | 'eu' | 'ap') or identification fails with
// "API key not found" — read the key and region from environment.ts, don't hardcode them.
import { ApplicationConfig } from '@angular/core'
import { provideFingerprint } from '@fingerprint/angular'
import { environment } from '../environments/environment'

export const appConfig: ApplicationConfig = {
  providers: [
    provideFingerprint({
      startOptions: {
        apiKey: environment.fingerprintPublicApiKey,
        region: environment.fingerprintRegion, // 'us' | 'eu' | 'ap'
      },
    }),
  ],
}

// src/environments/environment.ts — build-time config (inlined into the bundle):
//   export const environment = {
//     fingerprintPublicApiKey: 'PUBLIC_API_KEY',
//     fingerprintRegion: 'us',
//   }
