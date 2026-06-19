<!-- Mount once at the app root (e.g. src/App.svelte, or +layout.svelte in SvelteKit).
     The region MUST match your workspace ('us' | 'eu' | 'ap') or identification fails with
     "API key not found" — read it from env, don't hardcode it.
     The Svelte provider takes a single `options` prop (apiKey + region). -->
<script>
  import { FingerprintProvider } from '@fingerprint/svelte'
  import CreateAccountForm from './CreateAccountForm.svelte'

  const options = {
    apiKey: import.meta.env.VITE_FINGERPRINT_PUBLIC_API_KEY,
    region: import.meta.env.VITE_FINGERPRINT_REGION,
  }
</script>

<FingerprintProvider {options}>
  <CreateAccountForm />
</FingerprintProvider>
