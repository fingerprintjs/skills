---
name: fingerprint-svelte
description: Add Fingerprint visitor identification to a Svelte / SvelteKit frontend (v4 SDK) and send the event_id to the backend for verification.
---

# Fingerprint — Svelte frontend identification (v4)

Identify visitors in a Svelte / SvelteKit app and pass the identification to the backend so the
server can verify it. The frontend **only identifies**; it never makes trust decisions and never
holds the secret key. Trust decisions happen on the server (see `fingerprint-node`).

## Package
`@fingerprint/svelte` (v4)

## Env var
- `FINGERPRINT_PUBLIC_API_KEY` — the public key (safe to ship to the browser).

> Bundlers only expose prefixed env vars to client code. Map the key to the bundler's
> convention and read the prefixed name in code:
> - Vite (plain Svelte): `VITE_FINGERPRINT_PUBLIC_API_KEY` → `import.meta.env.VITE_FINGERPRINT_PUBLIC_API_KEY`
> - SvelteKit: `PUBLIC_FINGERPRINT_PUBLIC_API_KEY` → `import { PUBLIC_FINGERPRINT_PUBLIC_API_KEY } from '$env/static/public'`
> Only `PUBLIC_`-prefixed vars are exposed to the browser in SvelteKit; unprefixed vars stay
> server-side. Never expose `FINGERPRINT_SECRET_API_KEY` to the frontend.

## Steps

1. **Install** `@fingerprint/svelte`.

2. **Wrap the app in `FingerprintProvider`** at the root, passing an `options` object with the
   public key and region (`us` | `eu` | `ap`, matching the workspace). Unlike React, the Svelte
   provider takes a single `options` prop, not separate props. See `snippets/Provider.svelte`.

3. **Identify on sensitive actions, not on every render.** Use `useVisitorData` with
   `{ immediate: false }` and call `getData()` at the moment of a security-relevant action
   (login, signup, checkout, password reset). See `snippets/CreateAccountForm.svelte`.

4. **Send the `event_id` to the backend** with the action request. `getData()` returns
   `{ visitor_id, event_id }`; send the **`event_id`** (single-use, server-verifiable). Do not
   trust the `visitor_id` returned on the client — the backend re-derives it from the Server API.

## Best practices
- Region must match the workspace region (`us` | `eu` | `ap`).
- Don't block the UI on identification; handle the `isLoading`/error states from the hook.
- Treat the client result as a hint only — the server is the source of truth.
- One `FingerprintProvider` at the app root; don't re-instantiate per component.
