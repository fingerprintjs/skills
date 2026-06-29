---
name: fingerprint-react
description: Integrate Fingerprint device identification into a React (or Preact) app — initialize the agent and get the visitor's visitor_id and event_id.
---

# Fingerprint — React

Integrate Fingerprint into a React app to identify visitors: initialize the agent once at startup,
then ask it for the visitor's `visitor_id` and a single-use `event_id` wherever you need it (on
load, or on an action like login or checkout).

> Docs: https://docs.fingerprint.com/docs/react · JS Agent v4: https://docs.fingerprint.com/reference/js-agent-v4

## Package
`@fingerprint/react` — install the latest version. (Preact uses the same package. For plain HTML
or an unsupported framework, use `@fingerprint/agent` instead.)

## Env var
- `FINGERPRINT_PUBLIC_API_KEY` — the public key, safe to ship to the browser.

> Bundlers only expose prefixed vars to client code — map the key to the bundler's convention:
> - Vite: `VITE_FINGERPRINT_PUBLIC_API_KEY` → `import.meta.env.VITE_...`
> - Create React App: `REACT_APP_FINGERPRINT_PUBLIC_API_KEY` → `process.env.REACT_APP_...`
> Never expose `FINGERPRINT_SECRET_API_KEY` to the frontend.

## Steps

1. **Install** `@fingerprint/react`.

2. **Initialize once at the app root.** Wrap the app in `FingerprintProvider`, passing the public
   key and region (`us` | `eu` | `ap`, matching the workspace). Client-side only. See
   `snippets/provider.jsx`.

3. **Get the identification where you need it.** Use `useVisitorData`. For identify-on-demand pass
   `{ immediate: false }` and call `getData()` on the action you care about; it returns
   `{ visitor_id, event_id, ... }`. See `snippets/use-visitor-data.jsx`.

4. **Verify it works.** Disable your ad blocker, run the dev server, trigger the call, and confirm
   a `visitor_id` is logged in the browser console (or that the event appears on the dashboard
   Events page).

## Notes
- Region must match the workspace (`us` | `eu` | `ap`).
- Initialize once at the root; don't re-instantiate per component. Don't block the UI on
  identification — handle the hook's `isLoading` / error states.
- **Production:** protect the agent from ad blockers with a custom subdomain or proxy —
  https://docs.fingerprint.com/docs/protecting-the-javascript-agent-from-adblockers.
- Don't use legacy `@fingerprintjs/fingerprintjs-pro`, `FingerprintJS.load()`, or `scriptUrlPattern`.
