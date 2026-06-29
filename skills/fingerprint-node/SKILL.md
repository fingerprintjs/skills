---
name: fingerprint-node
description: Integrate the Fingerprint Server API into a Node/Express backend — fetch an event by event_id and read the verified identification and Smart Signals.
---

# Fingerprint — Node (Server API)

Integrate the Fingerprint Server API into a Node/Express backend: take the single-use `event_id`
your frontend sends, fetch the event server-side, and read the verified identification and Smart
Signals. The server is the source of truth — never trust a `visitor_id` or a decision sent straight
from the client.

> Docs: https://docs.fingerprint.com/reference/node-server-sdk · event schema: OpenAPI (https://github.com/fingerprintjs/fingerprint-pro-server-api-openapi) or the Fingerprint MCP event-schema resource.

## Package
`@fingerprint/node-sdk` — install the latest version.

## Env var
- `FINGERPRINT_SECRET_API_KEY` — the secret key. Server-side only; never sent to the browser.

## Steps

1. **Install** `@fingerprint/node-sdk`.

2. **Create one client** at startup with the secret key and region (`Region.Global` | `Region.EU`
   | `Region.AP`, matching the workspace). Load `.env` (via `dotenv`) before the key is read —
   plain Node does not auto-load `.env`. See `snippets/client.js`.

3. **Fetch and check the event.** Given the `event_id`, call `client.getEvent(eventId)` and apply
   the checks below before trusting the action. See `snippets/verify.js`.

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
  `tor_node`)

## Checks (do all of them)
- **Found:** `event.identification.visitor_id` exists.
- **Replay / freshness:** reject if `event.replayed === true`, or if `event.timestamp` is older
  than your window (e.g. 2 minutes) — prevents reuse of an old `event_id`.
- **Confidence:** require `event.identification.confidence.score >= 0.9` for the action.
- **Smart Signals** (fail-closed for high-risk actions): `event.bot !== "not_detected"`,
  `event.vpn`, `event.proxy`, `event.tampering`.
- **Identity match:** bind `visitor_id` ↔ user on first trusted use; re-check on later actions.

## Notes
- Fetch and check server-side on **every** sensitive action.
- Fail closed on lookup errors for high-risk flows.
- Each `event_id` is single-use per action — don't cache a pass/fail across requests.
- Keep the secret key out of logs and any client bundle.
