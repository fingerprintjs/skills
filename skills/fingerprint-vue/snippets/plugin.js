// Register once at the app root (e.g. src/main.js). The region MUST match your workspace
// ('us' | 'eu' | 'ap') or identification fails with "API key not found" — read it from env,
// don't hardcode it.
import { createApp } from 'vue'
import { FingerprintPlugin } from '@fingerprint/vue'
import App from './App.vue'

const app = createApp(App)

app.use(FingerprintPlugin, {
  apiKey: import.meta.env.VITE_FINGERPRINT_PUBLIC_API_KEY,
  region: import.meta.env.VITE_FINGERPRINT_REGION,
})

app.mount('#app')
