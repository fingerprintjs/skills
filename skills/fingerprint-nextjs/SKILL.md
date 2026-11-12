---
name: fingerprint-nextjs
description: Add Fingerprint to a fullstack Next.js (App Router) app — identify visitors in the browser with the React SDK and verify the event_id server-side with the node SDK in a Route Handler or Server Action.
---

# Fingerprint — Next.js

Integrate Fingerprint into a Next.js (App Router) app. Next.js does both halves in one codebase:
the **client identifies** the visitor (producing a single-use `event_id`) and the **server**
fetches that event from the Server API to read the verified identification and Smart Signals. The
browser never holds the secret key and never makes trust decisions — the server does, using the
checks below.

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
   action. `snippets/identify-on-action.tsx` wraps that in a `useProtectedPost` hook and uses it from
   the login, signup, checkout and coupon forms — wire **every** form that submits to an endpoint
   in the list below, not just login; a form that sends no `event_id` leaves its endpoint
   unprotected.

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
   Server Action (`'use server'`). `snippets/protected-route.ts` is a `withVerifiedEvent` wrapper for
   Route Handlers (`snippets/route-handler.ts` shows the login route using it, with the other route
   files to create); `snippets/server-action.ts` shows login, signup, password reset, checkout and
   coupon actions each verifying first.

8. **Cover every sensitive endpoint.** Create a wrapped Route Handler or a verifying Server Action
   for each endpoint in the list below that the app has, and make sure the matching client form
   from step 3 sends its own `event_id`.

## Which endpoints to protect

Verify on **every** endpoint where a bot or a repeat device can do damage, not just the first one
you find. Before writing code, inventory the codebase: grep route definitions, controllers and form
handlers for `login|signin|sign-in|auth|session|signup|register|password|reset|otp|checkout|payment|order|coupon|promo|redeem`,
and read the handlers, since a login can live at `POST /sessions` and a signup at `POST /users`.
Wrap each one that exists with `withVerifiedEvent`, or verify at the top of its Server Action. Then
tell the user which endpoints you protected and which of the list below the app doesn't have.

| Endpoint | Protects against | After the check passes |
| --- | --- | --- |
| Login / sign-in | credential stuffing, account takeover | bind `visitor_id` to the account on first trusted login; step up (email / OTP) on an unknown device |
| Signup / register | fake and duplicate accounts | refuse or flag when an account already exists for the `visitor_id`; store it on the new account |
| Password reset / OTP / magic link | account takeover, SMS pumping | cap sends per `visitor_id` (e.g. 5 per 24 h) |
| Checkout / payment / add payment method | card testing, payment fraud | cap orders per `visitor_id` per day; store `visitor_id` on the order as chargeback evidence |
| Coupon / promo / referral / bonus redemption | promo abuse | one redemption per `visitor_id` per code |
| Email / password / profile change, free-trial start, review / comment / contact forms | account takeover, spam | same gate; store `visitor_id` on the record |

Protect every endpoint in the first five rows that exists in the app, and the last row where the
app already has abuse problems. The per-endpoint "after" logic is the app's own data; the gate in
front of it is the same everywhere.

## Verification checks (do all of them)
- **Found:** `event.identification.visitor_id` exists.
- **Replay / freshness:** reject if `event.replayed === true`, or if `event.timestamp` is older than
  your window (e.g. 2 minutes) — prevents reuse of an old `event_id`.
- **Confidence:** require `event.identification.confidence.score >= 0.9` for the action.
- **Smart signals** (fail-closed for high-risk actions): `event.bot !== "not_detected"`,
  `event.vpn`, `event.proxy`, `event.tampering`. Blocking every bot is
  right here and wrong on a crawlable route, where it takes out search-engine crawlers too.
- **Identity match:** bind `visitor_id` ↔ user on first trusted use; re-check on later actions.

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
- Verify server-side on **every** sensitive action — all of the endpoints above that the app has,
  not only login; treat the client result as a hint only.
- Fail closed on lookup errors for high-risk flows.
- Each `event_id` is single-use per action — don't cache a pass/fail across requests.
- Keep the secret key out of logs and out of any `NEXT_PUBLIC_` var or client component.
