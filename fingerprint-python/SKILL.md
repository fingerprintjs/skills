---
name: fingerprint-python
description: Add server-side Fingerprint verification (v4 Server API) to a Python backend (FastAPI / Django / Flask), with confidence, replay, and smart-signal checks.
---

# Fingerprint — Python backend verification (v4)

The server is the source of truth. On every security-sensitive action, take the `event_id`
sent by the frontend (see `fingerprint-react`), fetch the event via the Server API, and make
a trust decision from the verified server-side signals. Never trust a `visitor_id` or a
decision coming straight from the client.

## Package
`fingerprint-server-sdk` (v4)

## Env var
- `FINGERPRINT_SECRET_API_KEY` — the secret key. Server-side only; never sent to the browser.

> Load `.env` with `python-dotenv` (`load_dotenv()`) and read the key via `os.environ`. Keep
> the secret key out of any client bundle, logs, or version control.

## Steps

1. **Install** `fingerprint-server-sdk`.

2. **Create one client** at startup with the secret key and region (`Region.US` | `Region.EU`
   | `Region.AP`, matching the workspace). Call `load_dotenv()` at the top of the module that
   constructs the client, so `FINGERPRINT_SECRET_API_KEY` is set before it's read — Python does
   not auto-load `.env`. See `snippets/client.py`.

3. **Add a verification helper** that runs before sensitive handlers: given the `event_id`,
   call `client.get_event(event_id)` and apply the checks below. See `snippets/verify.py`.

## v4 event shape (flat — per the Server API event schema)
`get_event` returns the event object directly:
- `event.identification.visitor_id` — the trusted visitor id
- `event.identification.confidence.score` — 0..1 (probability of a false-positive identification)
- `event.identification.timestamp` — Unix ms of the event
- `event.identification.replayed` — `True` if the payload was replayed
- `event.bot` — `BotResult.NOT_DETECTED` | `good` | `bad`
- `event.vpn`, `event.proxy`, `event.tampering`, `event.incognito` — booleans
- `event.suspect_score` — weighted Smart-Signals score
- `event.velocity`, `event.ip_blocklist` — for abuse / ATO logic

## Verification checks (do all of them)
- **Found:** `event.identification.visitor_id` exists.
- **Replay / freshness:** reject if `event.identification.replayed` is `True`, or if the event
  `timestamp` is older than your window (e.g. 2 minutes) — prevents reuse of an old `event_id`.
- **Confidence:** require `event.identification.confidence.score >= 0.9` for the action.
- **Smart signals** (fail-closed for high-risk actions): `event.bot != BotResult.NOT_DETECTED`,
  `event.vpn`, `event.proxy`, `event.tampering`.
- **Identity match:** bind `visitor_id` ↔ user on first trusted use; re-check on later actions.

## Fraud use-cases (on top of the baseline)
- **Account takeover / credential stuffing:** flag logins from a `visitor_id` never seen for
  the account; step-up auth or block on bot/VPN signals; inspect `event.velocity`.
- **Signup / promo abuse:** rate-limit or block repeat `visitor_id`s creating many accounts.
- **Payment fraud:** require clean signals + a known device before high-value actions.
- **Scraping / bots:** block `event.bot == BotResult.BAD` on protected endpoints.

## Best practices
- Verify server-side on **every** sensitive action.
- Fail closed on lookup errors for high-risk flows.
- Each `event_id` is single-use per action — don't cache a pass/fail across requests.
- Keep the secret key out of logs and any client bundle.
