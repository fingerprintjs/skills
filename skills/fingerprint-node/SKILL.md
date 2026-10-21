---
name: fingerprint-node
description: Integrate the Fingerprint Server API into a Node/Express backend — fetch an event by event_id and read the verified identification and Smart Signals.
---

# Fingerprint — Node (Server API)

Integrate the Fingerprint Server API into a Node/Express backend: take the single-use `event_id`
your frontend sends, fetch the event server-side, and read the verified identification and Smart
Signals. The server is the source of truth — never trust a `visitor_id` or a decision sent straight
from the client.

> Docs: https://docs.fingerprint.com/reference/node-server-sdk · event schema: OpenAPI (https://github.com/fingerprintjs/openapi) or the Fingerprint MCP event-schema resource.

## Package
`@fingerprint/node-sdk` — install the latest version.

## Env var
- `FINGERPRINT_SECRET_API_KEY` — the secret key. Server-side only; never sent to the browser.

## Steps

1. **Install** `@fingerprint/node-sdk`.

2. **Create one client** at startup with the secret key and region (`Region.Global` | `Region.EU`
   | `Region.AP`, matching the workspace). Load `.env` (via `dotenv`) before the key is read —
   plain Node does not auto-load `.env`, and a missing key fails at startup with "Api key is not
   set". Pick the snippet by module system — check `package.json` `"type"`, not the file
   extension, since a TypeScript project can be either:
   - `"type": "module"` (ESM) → `snippets/client.mjs`. `import 'dotenv/config'` must be the
     **first import**: ESM evaluates all imports, in order, before any statement in the file, so a
     `dotenv.config()` call in the body runs too late.
   - otherwise (CommonJS) → `snippets/client.js`.

3. **Fetch the event.** Given the `event_id`, call `client.getEvent(eventId)` and handle it as
   below. See `snippets/verify.mjs` for ESM or
   `snippets/verify.js` for CommonJS, matching the client snippet from step 2.

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
  `tor_node`)

## What to do with the event
- **Don't reject anything.** Run the action exactly as before, return what the Server API reported
  (visitor id, confidence, replayed, bot, VPN/proxy, tampering, incognito, suspect score) in the
  response, and log it on the frontend (console is enough) so the developer sees which signals
  their own traffic produces. Which signals should stop an action depends on the use case and is
  covered by the use-case skills, not this one.
- **Before production,** consider dropping the signals from the response — they tell the client
  what was detected.

## Notes
- Fetch server-side on **every** sensitive action.
- A lookup error comes back as `{ error: 'lookup_failed' }` — usually a wrong secret key or region.
- Each `event_id` is single-use per action — don't cache the result across requests.
- Keep the secret key out of logs and any client bundle.
