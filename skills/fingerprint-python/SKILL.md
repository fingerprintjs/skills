---
name: fingerprint-python
description: Integrate the Fingerprint Server API into a Python backend (FastAPI / Django / Flask) — fetch an event by event_id and read the verified identification and Smart Signals.
---

# Fingerprint — Python (Server API)

Integrate the Fingerprint Server API into a Python backend: take the single-use `event_id` your
frontend sends, fetch the event server-side, and read the verified identification and Smart
Signals. The server is the source of truth — never trust a `visitor_id` or a decision sent straight
from the client.

> Docs: https://docs.fingerprint.com/reference/python-server-sdk · event schema: OpenAPI (https://github.com/fingerprintjs/openapi) or the Fingerprint MCP event-schema resource.

## Package
`fingerprint-server-sdk` — install the latest version.

## Env var
- `FINGERPRINT_SECRET_API_KEY` — the secret key. Server-side only; never sent to the browser.

> Load `.env` with `python-dotenv` (`load_dotenv()`) and read the key via `os.environ`. Keep the
> secret key out of any client bundle, logs, or version control.

## Steps

1. **Install** `fingerprint-server-sdk`.

2. **Create one client** at startup with the secret key and region (`Region.US` | `Region.EU`
   | `Region.AP`, matching the workspace). Call `load_dotenv()` before the key is read — Python
   does not auto-load `.env`. See `snippets/client.py`.

3. **Fetch the event.** Given the `event_id`, call `client.get_event(event_id)` and handle it as
   below. See `snippets/verify.py`.

## v4 event shape (flat — per the Server API event schema)
`get_event` returns the event object directly:
- `event.identification.visitor_id` — the trusted visitor id
- `event.identification.confidence.score` — 0..1 (probability of a false-positive identification)
- `event.timestamp` — Unix ms of the event (root-level, **not** under `identification`)
- `event.replayed` — `True` if the payload was replayed (root-level)
- `event.bot` — `BotResult.NOT_DETECTED` | `good` | `bad`, the coarse verdict. When a bot was
  detected, `event.bot_info` (`name`, `provider`, `category`, `identity`, `confidence`) and
  `event.bot_type` say *which* bot: `bot` alone can't separate Googlebot from an AI agent from
  Playwright. See `fingerprint-smart-signals`.
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
- A lookup error comes back as `{"error": "lookup_failed"}` — usually a wrong secret key or region.
- Each `event_id` is single-use per action — don't cache the result across requests.
- Keep the secret key out of logs and any client bundle.
