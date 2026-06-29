---
name: fingerprint-react
description: Add Fingerprint visitor identification to a React frontend. The browser produces a visitorId and a single-use event_id; verifying that event_id server-side is a separate step (see fingerprint-node).
---

# Fingerprint — React frontend identification (v4)

This skill is **identification only**. It identifies visitors in a React app and produces a
single-use `event_id`. The frontend never makes trust decisions and never holds the secret key —
it just hands the `event_id` to your backend. Verifying that `event_id` and making trust decisions
happen on the server, which is a separate skill (see `fingerprint-node`).

> **Verify against the docs first.** The package name, provider props, and `useVisitorData` /
> `getData` result shape reflect Fingerprint v4 at time of writing and can change — prefer the live
> docs over pre-trained knowledge. Confirm at https://docs.fingerprint.com/docs/react (index:
> https://docs.fingerprint.com/llms.txt) before relying on the specifics below.

## Package
`@fingerprint/react` — install the latest version.

## Env var
- `FINGERPRINT_PUBLIC_API_KEY` — the public key (safe to ship to the browser).

> Bundlers only expose prefixed env vars to client code. Map the key to the bundler's
> convention and read the prefixed name in code:
> - Vite: `VITE_FINGERPRINT_PUBLIC_API_KEY` → `import.meta.env.VITE_FINGERPRINT_PUBLIC_API_KEY`
> - Create React App: `REACT_APP_FINGERPRINT_PUBLIC_API_KEY` → `process.env.REACT_APP_...`
> Never expose `FINGERPRINT_SECRET_API_KEY` to the frontend.

## Steps

1. **Install** `@fingerprint/react`.

2. **Wrap the app in `FingerprintProvider`** at the root, passing the public key and region
   (`us` | `eu` | `ap`, matching the workspace). See `snippets/provider.jsx`.

3. **Identify on sensitive actions, not on every render.** Use `useVisitorData` with
   `{ immediate: false }` and call `getData()` at the moment of a security-relevant action
   (login, signup, checkout, password reset). See `snippets/use-visitor-data.jsx`.

4. **Send the `event_id` to the backend** with the action request. `getData()` returns
   `{ visitor_id, event_id }`; send the **`event_id`** (single-use, server-verifiable). Do not
   trust the `visitor_id` returned on the client — the backend re-derives it from the Server API.

## Best practices
- Region must match the workspace region (`us` | `eu` | `ap`).
- Don't block the UI on identification; handle the `isLoading`/error states from the hook.
- Treat the client result as a hint only — the server is the source of truth.
- One `FingerprintProvider` at the app root; don't re-instantiate per component.
