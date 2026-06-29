---
name: fingerprint-node
description: Add server-side Fingerprint verification (v4 Server API) to a Node/Express backend, with confidence, replay, and smart-signal checks.
---

# Fingerprint — Node/Express backend verification (v4)

The server is the source of truth. On every security-sensitive action, take the `event_id`
sent by the frontend (see `fingerprint-react`), fetch the event via the Server API, and make
a trust decision from the verified server-side signals. Never trust a `visitor_id` or a
decision coming straight from the client.

> **Verify the event shape against the docs first.** The package name and the v4 event field names
> below (flat vs. nested, snake_case vs. camelCase) reflect the API at time of writing and can
> change — don't trust pre-trained knowledge. Treat the Server SDK types and the event schema as
> authoritative: https://docs.fingerprint.com/reference/node-server-sdk, the OpenAPI schema
> (https://github.com/fingerprintjs/fingerprint-pro-server-api-openapi), or the Fingerprint MCP
> event-schema resource. Index: https://docs.fingerprint.com/llms.txt.

## Package
`@fingerprint/node-sdk` — install the latest version.

## Env var
- `FINGERPRINT_SECRET_API_KEY` — the secret key. Server-side only; never sent to the browser.

## Steps

1. **Install** `@fingerprint/node-sdk`.

2. **Create one client** at startup with the secret key and region (`Region.Global` | `Region.EU`
   | `Region.AP`, matching the workspace). Load `.env` (via `dotenv`) at the top of the module
   that constructs the client, so `FINGERPRINT_SECRET_API_KEY` is set before it's read — plain
   Node does not auto-load `.env`. See `snippets/client.js`.

3. **Add a verification helper** that runs before sensitive handlers: given the `event_id`,
   call `client.getEvent(eventId)` and apply the checks below. See `snippets/verify.js`.

## v4 event shape (flat — per the Server API event schema)
`getEvent` returns the event object directly:
- `event.identification.visitor_id` — the trusted visitor id
- `event.identification.confidence.score` — 0..1 (probability of a false-positive identification)
- `event.timestamp` — Unix ms of the event
- `event.replayed` — `true` if the payload was replayed
- `event.bot` — `"bad" | "good" | "not_detected"`
- `event.vpn`, `event.proxy`, `event.tampering`, `event.incognito` — booleans
- `event.suspect_score` — weighted Smart-Signals score (integer)
- `event.velocity` (object), `event.ip_blocklist` (object: `attack_source`, `email_spam`,
  `tor_node`) — for abuse / ATO logic

## Verification checks (do all of them)
- **Found:** `event.identification.visitor_id` exists.
- **Replay / freshness:** reject if `event.replayed === true`, or if `event.timestamp` is older
  than your window (e.g. 2 minutes) — prevents reuse of an old `event_id`.
- **Confidence:** require `event.identification.confidence.score >= 0.9` for the action.
- **Smart signals** (fail-closed for high-risk actions): `event.bot !== "not_detected"`,
  `event.vpn`, `event.proxy`, `event.tampering`.
- **Identity match:** bind `visitor_id` ↔ user on first trusted use; re-check on later actions.

## Fraud use-cases (on top of the baseline)
- **Account takeover / credential stuffing:** flag logins from a `visitor_id` never seen for
  the account; step-up auth or block on bot/VPN signals; inspect `event.velocity`.
- **Signup / promo abuse:** rate-limit or block repeat `visitor_id`s creating many accounts.
- **Payment fraud:** require clean signals + a known device before high-value actions.
- **Scraping / bots:** block `event.bot === "bad"` on protected endpoints.

## Best practices
- Verify server-side on **every** sensitive action.
- Fail closed on lookup errors for high-risk flows.
- Each `event_id` is single-use per action — don't cache a pass/fail across requests.
- Keep the secret key out of logs and any client bundle.
