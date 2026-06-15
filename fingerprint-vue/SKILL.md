---
name: fingerprint-vue
description: Add Fingerprint visitor identification to a Vue 3 frontend (v4 SDK) and send the event_id to the backend for verification.
---

# Fingerprint — Vue frontend identification (v4)

Identify visitors in a Vue 3 app and pass the identification to the backend so the server
can verify it. The frontend **only identifies**; it never makes trust decisions and never
holds the secret key. Trust decisions happen on the server (see `fingerprint-node`).

## Package
`@fingerprint/vue` (v4)

## Env var
- `FINGERPRINT_PUBLIC_API_KEY` — the public key (safe to ship to the browser).

> Bundlers only expose prefixed env vars to client code. Map the key to the bundler's
> convention and read the prefixed name in code:
> - Vite: `VITE_FINGERPRINT_PUBLIC_API_KEY` → `import.meta.env.VITE_FINGERPRINT_PUBLIC_API_KEY`
> - Vue CLI: `VUE_APP_FINGERPRINT_PUBLIC_API_KEY` → `process.env.VUE_APP_...`
> Never expose `FINGERPRINT_SECRET_API_KEY` to the frontend.

## Steps

1. **Install** `@fingerprint/vue`.

2. **Register `FingerprintPlugin`** at the app root with `app.use(...)`, passing the public key
   and region (`us` | `eu` | `ap`, matching the workspace). See `snippets/plugin.js`.

3. **Identify on sensitive actions, not on mount.** Use `useVisitorData` with
   `{ immediate: false }` and call `getData()` at the moment of a security-relevant action
   (login, signup, checkout, password reset). See `snippets/use-visitor-data.vue`.

4. **Send the `event_id` to the backend** with the action request. `getData()` returns
   `{ visitor_id, event_id }`; send the **`event_id`** (single-use, server-verifiable). Do not
   trust the `visitor_id` returned on the client — the backend re-derives it from the Server API.

## Best practices
- Region must match the workspace region (`us` | `eu` | `ap`).
- Don't block the UI on identification; handle the `isLoading`/`error` state from the composable.
- Treat the client result as a hint only — the server is the source of truth.
- Register `FingerprintPlugin` once at the app root; don't re-instantiate per component.
