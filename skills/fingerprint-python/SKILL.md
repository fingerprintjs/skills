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

3. **Fetch and check the event.** Given the `event_id`, call `client.get_event(event_id)` and apply
   the checks below before trusting the action. See `snippets/verify.py`.

4. **Wire it into every sensitive endpoint.** Pick the framework's snippet — `snippets/routes_fastapi.py`
   (request models extend `ProtectedRequest`, handlers call `require_verified`),
   `snippets/routes_flask.py` (`@require_verified_event` decorator, `g.visitor_id`) or
   `snippets/routes_django.py` (same decorator, `request.visitor_id`) — and apply it to each login,
   signup, password-reset, checkout and coupon endpoint the app has (see the list below), reading
   `event_id` from the JSON body. Each of those endpoints needs its own `event_id` from the
   frontend — one identification per action.

## Which endpoints to protect

Verify on **every** endpoint where a bot or a repeat device can do damage, not just the first one
you find. Before writing code, inventory the codebase: grep route definitions, controllers and form
handlers for `login|signin|sign-in|auth|session|signup|register|password|reset|otp|checkout|payment|order|coupon|promo|redeem`,
and read the handlers, since a login can live at `POST /sessions` and a signup at `POST /users`.
Apply the decorator or helper to each one that exists. Then tell the user which endpoints you
protected and which of the list below the app doesn't have.

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

## Checks (do all of them)
- **Found:** `event.identification.visitor_id` exists.
- **Replay / freshness:** reject if `event.replayed` is `True`, or if `event.timestamp` is older
  than your window (e.g. 2 minutes) — prevents reuse of an old `event_id`.
- **Confidence:** require `event.identification.confidence.score >= 0.9` for the action.
- **Smart Signals** (fail-closed for high-risk actions): `event.bot != BotResult.NOT_DETECTED`,
  `event.vpn`, `event.proxy`, `event.tampering`. Blocking every bot is
  right here and wrong on a crawlable route, where it takes out search-engine crawlers too.
- **Identity match:** bind `visitor_id` ↔ user on first trusted use; re-check on later actions.

## Notes
- Fetch and check server-side on **every** sensitive action — all of the endpoints above that the
  app has, not only login.
- Fail closed on lookup errors for high-risk flows.
- Each `event_id` is single-use per action — don't cache a pass/fail across requests.
- Keep the secret key out of logs and any client bundle.
