---
name: fingerprint-nextjs
description: Add Fingerprint to a fullstack Next.js (App Router) app — identify visitors in the browser with the React SDK and verify the event_id server-side with the node SDK in a Route Handler or Server Action.
---

# Fingerprint — Next.js

Integrate Fingerprint into a Next.js (App Router) app. Next.js does both halves in one codebase:
the **client identifies** the visitor (producing a single-use `event_id`) and the **server**
fetches that event from the Server API to read the verified identification and Smart Signals. The
browser never holds the secret key; the server reads the verified signals and hands them back.

> Docs: React SDK https://docs.fingerprint.com/docs/react · Node Server SDK https://docs.fingerprint.com/reference/node-server-sdk · event schema: OpenAPI (https://github.com/fingerprintjs/openapi) or the Fingerprint MCP event-schema resource.

## Packages
- `@fingerprint/react` — browser identification (client components). Install the latest version.
- `@fingerprint/node-sdk` — Server API verification (Route Handlers / Server Actions). Install the latest version.

## Env vars
Next.js only exposes env vars prefixed with `NEXT_PUBLIC_` to the browser bundle. Everything else
stays server-only.

- `NEXT_PUBLIC_FINGERPRINT_PUBLIC_API_KEY` — public key, shipped to the browser (safe).
- `NEXT_PUBLIC_FINGERPRINT_REGION` — workspace region for the client (`us` | `eu` | `ap`), shipped
  to the browser.
- `FINGERPRINT_SECRET_API_KEY` — secret key. **Server-only**; the missing `NEXT_PUBLIC_` prefix
  keeps it out of the client bundle. Never reference it from a client component.
- `FINGERPRINT_REGION` — workspace region for the server (`us` | `eu` | `ap`).

> Read public values via `process.env.NEXT_PUBLIC_*`; they are inlined into client code. Read the
> secret only inside server code (Route Handlers, Server Actions, server components). If you ever
> see `FINGERPRINT_SECRET_API_KEY` referenced from a `'use client'` file, that's a leak.

## Steps

### Client — identify
1. **Install** `@fingerprint/react`.

2. **Wrap the app in `FingerprintProvider`.** The provider is a client component, so put it in a
   small `'use client'` wrapper and render that wrapper inside `app/layout.tsx` around `{children}`.
   Pass the public key and region from the `NEXT_PUBLIC_` vars. See `snippets/provider.tsx` and
   `snippets/layout.tsx`.

3. **Identify on sensitive actions, not on every render.** In a client component, use
   `useVisitorData({ immediate: false })` and call `getData()` at the moment of a security-relevant
   action (login, signup, checkout, password reset). See `snippets/identify-on-action.tsx`.

4. **Send the `event_id` to the server** with the action request. `getData()` returns
   `{ visitor_id, event_id }`; send the **`event_id`** (single-use, server-verifiable). Do not trust
   the client `visitor_id` — the server re-derives it from the Server API.

### Server — verify
5. **Install** `@fingerprint/node-sdk`.

6. **Create one client** with the secret key and region (`Region.Global` | `Region.EU` |
   `Region.AP`, mapped from `FINGERPRINT_REGION`). Next.js loads `.env.local` automatically, so no
   `dotenv` is needed. See `snippets/fingerprint-server.ts`.

7. **Look up the `event_id`** in the sensitive handler: call `client.getEvent(eventId)` and handle
   it as below. Use it from either a Route Handler (`app/api/.../route.ts`) or a
   Server Action (`'use server'`). See `snippets/route-handler.ts` and `snippets/server-action.ts`.

## What to do with the event
- **Don't reject anything.** Run the action exactly as before, return what the Server API reported
  (visitor id, confidence, replayed, bot, VPN/proxy, tampering, incognito, suspect score) in the
  response, and log it on the frontend so the developer sees which signals their own
  traffic produces. Which signals should stop an action depends on the use case and is covered by
  the use-case skills, not this one.
- **Before production,** consider dropping the signals from the response — they tell the client
  what was detected.

## v4 event shape (flat — per the Server API event schema)
`getEvent` returns the event object directly:
- `event.identification.visitor_id` — the trusted visitor id
- `event.identification.confidence.score` — 0..1 (probability of a false-positive identification)
- `event.timestamp` — Unix ms of the event
- `event.replayed` — `true` if the payload was replayed
- `event.bot` — `"bad" | "good" | "not_detected"`, the coarse verdict. When a bot was detected,
  `event.bot_info` (`name`, `provider`, `category`, `identity`, `confidence`) and `event.bot_type`
  say *which* bot: `bot` alone can't separate Googlebot from an AI agent from Playwright. See
  `fingerprint-smart-signals`.
- `event.vpn`, `event.proxy`, `event.tampering`, `event.incognito` — booleans
- `event.suspect_score` — weighted Smart-Signals score (integer)
- `event.velocity` (object), `event.ip_blocklist` (object: `attack_source`, `email_spam`,
  `tor_node`) — for abuse / ATO logic

## Best practices
- One `FingerprintProvider` at the app root; don't re-instantiate per component.
- Region must match the workspace region on **both** sides (`us` | `eu` | `ap`).
- Don't block the UI on identification; handle the hook's `isLoading`/error states.
- Look up server-side on **every** sensitive action; treat the client result as a hint only.
- A lookup error comes back as `{ error: 'lookup_failed' }` — usually a wrong secret key or region.
- Each `event_id` is single-use per action — don't cache the result across requests.
- Keep the secret key out of logs and out of any `NEXT_PUBLIC_` var or client component.
