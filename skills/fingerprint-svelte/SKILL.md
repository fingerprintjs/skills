---
name: fingerprint-svelte
description: Integrate Fingerprint device identification into a Svelte / SvelteKit app — initialize the agent and get the visitor's visitor_id and event_id.
---

# Fingerprint — Svelte

Integrate Fingerprint into a Svelte / SvelteKit app to identify visitors: initialize the provider
once at startup, then ask it for the visitor's `visitor_id` and a single-use `event_id` wherever
you need it (on load, or on an action like login or checkout).

> Docs: https://docs.fingerprint.com/docs/svelte · JS Agent v4: https://docs.fingerprint.com/reference/js-agent-v4

## Package
`@fingerprint/svelte` — install the latest version. (For plain HTML or an unsupported framework,
use `@fingerprint/agent` instead.)

## Env var
- `FINGERPRINT_PUBLIC_API_KEY` — the public key, safe to ship to the browser.

> Bundlers only expose prefixed vars to client code — map the key to the bundler's convention:
> - Vite (plain Svelte): `VITE_FINGERPRINT_PUBLIC_API_KEY` → `import.meta.env.VITE_...`
> - SvelteKit: `PUBLIC_FINGERPRINT_PUBLIC_API_KEY` → `import { PUBLIC_FINGERPRINT_PUBLIC_API_KEY } from '$env/static/public'`
> Only `PUBLIC_`-prefixed vars reach the browser in SvelteKit. Never expose the secret key.

## Steps

1. **Install** `@fingerprint/svelte`.

2. **Initialize once at the app root.** Wrap the app in `FingerprintProvider`, passing an `options`
   object with the public key and region (`us` | `eu` | `ap`, matching the workspace). The Svelte
   provider takes a single `options` prop. See `snippets/Provider.svelte`.

3. **Get the identification where you need it.** Use `useVisitorData`. For identify-on-demand pass
   `{ immediate: false }` and call `getData()` on the action you care about; it returns
   `{ visitor_id, event_id, ... }`. See `snippets/CreateAccountForm.svelte`.

4. **Verify it works.** Disable your ad blocker, run the dev server, trigger the call, and confirm
   a `visitor_id` is logged in the browser console (or that the event appears on the dashboard
   Events page).

## Notes
- Region must match the workspace (`us` | `eu` | `ap`).
- Initialize once at the app root; don't re-instantiate per component. Don't block the UI on
  identification — handle the `isLoading` / error states.
- **Production:** protect the agent from ad blockers with a custom subdomain or proxy —
  https://docs.fingerprint.com/docs/protecting-the-javascript-agent-from-adblockers.
- Don't use legacy `@fingerprintjs/fingerprintjs-pro`, `FingerprintJS.load()`, or `scriptUrlPattern`.
