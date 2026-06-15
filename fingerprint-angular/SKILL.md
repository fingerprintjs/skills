---
name: fingerprint-angular
description: Add Fingerprint visitor identification to an Angular frontend (v4 SDK) and send the event_id to the backend for verification.
---

# Fingerprint — Angular frontend identification (v4)

Identify visitors in an Angular app and pass the identification to the backend so the server
can verify it. The frontend **only identifies**; it never makes trust decisions and never
holds the secret key. Trust decisions happen on the server (see `fingerprint-node`).

## Package
`@fingerprint/angular` (v4)

## Env var
- `FINGERPRINT_PUBLIC_API_KEY` — the public key (safe to ship to the browser).

> Angular has no `.env` at runtime — config is baked in at build time via `environment.ts`.
> Put the public key (and region) in `src/environments/environment.ts` and read it from there;
> the build inlines it into the bundle. Use a separate `environment.prod.ts` (swapped in via
> the `fileReplacements` build config) for production values, and keep these files out of any
> place that would commit a real key.
> Never put `FINGERPRINT_SECRET_API_KEY` in `environment.ts` — it ships to the browser.

## Steps

1. **Install** `@fingerprint/angular`.

2. **Register the provider** at the app root with `provideFingerprint`, passing the public key
   and region (`us` | `eu` | `ap`, matching the workspace) via `startOptions`. For a standalone
   app this goes in `src/app/app.config.ts`. See `snippets/app.config.ts`.

3. **Identify on sensitive actions, not on every page load.** Inject `FingerprintService` and
   call `getVisitorData()` at the moment of a security-relevant action (login, signup, checkout,
   password reset). See `snippets/login.component.ts`.

4. **Send the `event_id` to the backend** with the action request. `getVisitorData()` returns
   `{ visitor_id, event_id }`; send the **`event_id`** (single-use, server-verifiable). Do not
   trust the `visitor_id` returned on the client — the backend re-derives it from the Server API.

## Best practices
- Region must match the workspace region (`us` | `eu` | `ap`).
- Don't block the UI on identification; `getVisitorData()` is async — await it inside the action
  handler and handle errors so a failed identify doesn't break the flow.
- Treat the client result as a hint only — the server is the source of truth.
- Register `provideFingerprint` once at the app root; don't re-provide it per component.
- Read the key/region from `environment.ts`, don't hardcode them in components.
