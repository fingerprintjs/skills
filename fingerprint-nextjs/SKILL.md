---
name: fingerprint-nextjs
description: Add Fingerprint to a fullstack Next.js (App Router) app — identify visitors in the browser with the React SDK and verify the event_id server-side with the node SDK in a Route Handler or Server Action.
---

# Fingerprint — Next.js identification + verification (v4)

A Next.js app does both halves of the integration in one codebase: the **client identifies**
the visitor and the **server verifies** the result. The browser never makes trust decisions and
never holds the secret key — it only produces an `event_id`. Trust decisions happen on the server,
which re-fetches the event from the Server API and applies the checks below.

## Packages
- `@fingerprint/react` (v4) — browser identification (client components).
- `@fingerprint/node-sdk` (v4) — Server API verification (Route Handlers / Server Actions).

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

7. **Verify the `event_id`** before running the sensitive handler: call `client.getEvent(eventId)`
   and apply the checks below. Use it from either a Route Handler (`app/api/.../route.ts`) or a
   Server Action (`'use server'`). See `snippets/route-handler.ts` and `snippets/server-action.ts`.

## Verification checks (do all of them)
- **Found:** `event.identification.visitor_id` exists.
- **Replay / freshness:** reject if `event.replayed === true`, or if `event.timestamp` is older than
  your window (e.g. 2 minutes) — prevents reuse of an old `event_id`.
- **Confidence:** require `event.identification.confidence.score >= 0.9` for the action.
- **Smart signals** (fail-closed for high-risk actions): `event.bot !== "not_detected"`,
  `event.vpn`, `event.proxy`, `event.tampering`.
- **Identity match:** bind `visitor_id` ↔ user on first trusted use; re-check on later actions.

## v4 event shape (flat — per the Server API event schema)
`getEvent` returns the event object directly:
- `event.identification.visitor_id` — the trusted visitor id
- `event.identification.confidence.score` — 0..1 (probability of a false-positive identification)
- `event.timestamp` — Unix ms of the event
- `event.replayed` — `true` if the payload was replayed
- `event.bot` — `"bad" | "good" | "not_detected"`
- `event.vpn`, `event.proxy`, `event.tampering`, `event.incognito` — booleans
- `event.suspect_score` — weighted Smart-Signals score
- `event.velocity`, `event.ip_blocklist` — for abuse / ATO logic

## Fraud use-cases (on top of the baseline)
- **Account takeover / credential stuffing:** flag logins from a `visitor_id` never seen for the
  account; step-up auth or block on bot/VPN signals; inspect `event.velocity`.
- **Signup / promo abuse:** rate-limit or block repeat `visitor_id`s creating many accounts.
- **Payment fraud:** require clean signals + a known device before high-value actions.
- **Scraping / bots:** block `event.bot === "bad"` on protected endpoints (incl. Route Handlers).

## Best practices
- One `FingerprintProvider` at the app root; don't re-instantiate per component.
- Region must match the workspace region on **both** sides (`us` | `eu` | `ap`).
- Don't block the UI on identification; handle the hook's `isLoading`/error states.
- Verify server-side on **every** sensitive action; treat the client result as a hint only.
- Fail closed on lookup errors for high-risk flows.
- Each `event_id` is single-use per action — don't cache a pass/fail across requests.
- Keep the secret key out of logs and out of any `NEXT_PUBLIC_` var or client component.
