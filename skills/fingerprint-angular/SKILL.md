---
name: fingerprint-angular
description: Integrate Fingerprint device identification into an Angular app — initialize the agent and get the visitor's visitor_id and event_id.
---

# Fingerprint — Angular

Integrate Fingerprint into an Angular app to identify visitors: register the provider once at
startup, then ask it for the visitor's `visitor_id` and a single-use `event_id` wherever you need
it (on load, or on an action like login or checkout).

> Docs: https://docs.fingerprint.com/docs/angular · JS Agent v4: https://docs.fingerprint.com/reference/js-agent-v4

## Package
`@fingerprint/angular` — install the latest version.

## Env var
- `FINGERPRINT_PUBLIC_API_KEY` — the public key, safe to ship to the browser.

> Angular has no `.env` at runtime — config is baked in at build time. Put the public key and
> region in `src/environments/environment.ts` (and `environment.prod.ts` for production, swapped in
> via `fileReplacements`) and read them from there. Never put the secret key in `environment.ts` —
> it ships to the browser.

## Steps

1. **Install** `@fingerprint/angular`.

2. **Initialize once at the app root.** Register `provideFingerprint`, passing the public key and
   region (`us` | `eu` | `ap`, matching the workspace) via `startOptions`. For a standalone app
   this goes in `src/app/app.config.ts`. See `snippets/app.config.ts`.

3. **Get the identification where you need it.** Inject `FingerprintService` and call
   `getVisitorData()` on the action you care about; it returns `{ visitor_id, event_id, ... }`. See
   `snippets/login.component.ts`.

4. **Verify it works.** Disable your ad blocker, run the dev server, trigger the call, and confirm
   a `visitor_id` is logged in the browser console (or that the event appears on the dashboard
   Events page).

## Notes
- Region must match the workspace (`us` | `eu` | `ap`).
- Register `provideFingerprint` once at the app root; don't re-provide it per component.
- `getVisitorData()` is async — await it inside the action handler and handle errors so a failed
  identify doesn't break the flow.
- **Production:** protect the agent from ad blockers with a custom subdomain or proxy —
  https://docs.fingerprint.com/docs/protecting-the-javascript-agent-from-adblockers.
- Don't use legacy `@fingerprintjs/fingerprintjs-pro`, `FingerprintJS.load()`, or `scriptUrlPattern`.
