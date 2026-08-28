---
name: fingerprint-javascript
description: Add Fingerprint visitor identification to a vanilla JavaScript / plain HTML frontend with the v4 JS Agent (@fingerprint/agent, npm or CDN) and send the event_id to the backend for verification. Use for apps with no framework SDK — Vite, Webpack, a plain script tag, or a framework Fingerprint doesn't ship an SDK for (Solid, Lit, Alpine, htmx, Astro islands, jQuery).
---

# Fingerprint — vanilla JavaScript frontend identification (v4)

Identify visitors with the JS Agent directly and pass the identification to the backend so the
server can verify it. The frontend **only identifies**; it never makes trust decisions and never
holds the secret key. Trust decisions happen on the server (see `fingerprint-node`).

Use this skill when there's no framework SDK to use. If the app is React, Vue, Angular, Svelte, or
Next.js, use `fingerprint-react` / `fingerprint-vue` / `fingerprint-angular` / `fingerprint-svelte` /
`fingerprint-nextjs` instead — those wrap this same agent with framework-native APIs.

> **Verify against the docs first.** The package name, `start()` options, and `get()` result shape
> reflect Fingerprint v4 at time of writing and can change — prefer the live docs over pre-trained
> knowledge. Confirm at https://docs.fingerprint.com/docs/javascript-quickstart and
> https://docs.fingerprint.com/reference/js-agent-start-function (index:
> https://docs.fingerprint.com/llms.txt) before relying on the specifics below.

## Package
`@fingerprint/agent` (v4)

The npm package is a **loader** — it doesn't contain the fingerprinting logic, it downloads the
latest agent from the CDN at runtime. Don't vendor or self-host the agent bundle.

## Env var
- `FINGERPRINT_PUBLIC_API_KEY` — the public key (safe to ship to the browser).

> Bundlers only expose prefixed env vars to client code. Map the key to the bundler's
> convention and read the prefixed name in code:
> - Vite: `VITE_FINGERPRINT_PUBLIC_API_KEY` → `import.meta.env.VITE_FINGERPRINT_PUBLIC_API_KEY`
> - Webpack: inject via `DefinePlugin` / `EnvironmentPlugin` and read `process.env.FINGERPRINT_...`
> - No bundler (plain `<script>`): there is no env-var mechanism — the key is part of the CDN
>   import URL and ships in the HTML. That's expected for a public key; pair it with
>   `fingerprint-request-filtering` to restrict the key to your own origins.
> Never expose `FINGERPRINT_SECRET_API_KEY` to the frontend.

## Steps

1. **Install** `@fingerprint/agent` (npm), or skip install and import from the CDN if there's no
   build step — see `snippets/cdn.html`.

2. **Start the agent once at app startup**, passing the public key and region
   (`us` | `eu` | `ap`, matching the workspace). `start()` returns the agent object synchronously;
   the agent script downloads in the background and `get()` waits for it. Export the instance from
   one module so the rest of the app reuses it. See `snippets/fingerprint.js`.

   Prefer `import * as Fingerprint from '@fingerprint/agent'` over a default import — the namespace
   import tree-shakes better.

3. **Identify on sensitive actions, not on page load.** Call `fp.get()` at the moment of a
   security-relevant action (login, signup, checkout, password reset). Every `get()` is a billable
   identification event, so don't call it on every page view or in a render loop. See
   `snippets/create-account.js`.

4. **Send the `event_id` to the backend** with the action request. `get()` resolves to
   `{ visitor_id, event_id }`; send the **`event_id`** (single-use, server-verifiable). Do not
   trust the `visitor_id` returned on the client — the backend re-derives it from the Server API.

5. **Handle failures without blocking the user.** `get()` rejects when the agent is blocked
   (ad blocker), offline, or times out. Wrap it in `try/catch`, use `isFingerprintError(error)` and
   `error.code` to log the cause, and send the request with a null `event_id` so the server decides
   how to treat an unidentified attempt.

## Best practices
- Region must match the workspace region (`us` | `eu` | `ap`).
- One `start()` call for the whole app; don't re-start per page or per action.
- Treat the client result as a hint only — the server is the source of truth.
- If the app is a SPA doing client-side routing, keep the agent module-level so it survives route
  changes. The deprecated `fingerprintjs-pro-spa` wrapper isn't needed in v4.
- `get()` accepts `{ tag, linkedId, timeout }` — see `fingerprint-tagging` for attaching your own
  user/order IDs to an identification event.
- Caching is **off by default** in the agent. If you enable the `cache` option, a cache hit returns
  the *same* `event_id` (with `cache_hit: true`), which will fail server-side freshness and
  one-time-use checks — so keep `get()` uncached for security-relevant actions.
- Don't run the agent inside a sandboxed iframe; it isn't supported.
