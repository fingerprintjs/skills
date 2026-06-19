---
name: fingerprint-smart-signals
description: Use the full set of Fingerprint Smart Signals (bot, VPN, proxy, tampering, incognito, IP blocklist, velocity, suspect score, location spoofing, and more) from the v4 Server API to make richer server-side trust decisions. Use after the basic identification + verification is in place, when you want detailed insights about a visitor beyond confidence.
---

# Fingerprint — Smart Signals (v4 Server API)

Maps to the dashboard **"Access detailed insights about a visitor"** Get Started step. Once a
basic verification is in place (see `fingerprint-node` / `fingerprint-python`), the same
`getEvent(eventId)` response carries 100+ signals. This skill is about *acting on the full set*,
not just `confidence`. All of these are server-verified — never trust client-reported equivalents.

## Prerequisite
A working server-side verification flow that already calls `getEvent(eventId)` and a
`FINGERPRINT_SECRET_API_KEY`. If that isn't in place yet, do `fingerprint-node` /
`fingerprint-python` first.

## Signals (flat v4 event shape)
Each Smart Signal is a top-level field on the event. The web-relevant set:

| Field | Meaning | Typical action |
| --- | --- | --- |
| `bot` | `"bad" \| "good" \| "not_detected"` | Block `"bad"` on protected endpoints |
| `vpn` | behind a VPN | Step-up / score for high-risk flows |
| `proxy` | behind a public proxy | Step-up / score |
| `tampering` | request payload tampered with | Reject for sensitive actions |
| `incognito` | private browsing | Score; don't hard-block alone |
| `ip_blocklist` | IP on a known-malicious list | Block or step-up |
| `velocity` | events/identifications per interval for this visitor | Rate-limit abuse / ATO |
| `suspect_score` | weighted aggregate of Smart Signals | Threshold-based routing |
| `location_spoofing` | GPS/timezone spoofing | Score for geo-gated actions |
| `developer_tools` | devtools open | Score for scraping/automation |
| `virtual_machine` | running in a VM | Score |
| `raw_device_attributes` | low-level device attributes | Custom heuristics |

> **Verify field names against the docs first.** The exact field names and nesting below reflect
> v4 at time of writing and can change — don't trust pre-trained knowledge. Field availability also
> depends on your plan and platform (web vs. mobile). Treat the **event schema as authoritative**:
> the Server SDK types, the OpenAPI schema
> (https://github.com/fingerprintjs/fingerprint-pro-server-api-openapi), or the Fingerprint MCP
> event-schema resource (index: https://docs.fingerprint.com/llms.txt). Guard each access
> (`event.vpn ?? false`) so a missing signal doesn't throw.

## How to apply
1. **Don't gate on a single signal.** Combine them into a per-action policy: e.g. block on
   `bot === "bad"` or `tampering`, step-up auth on `vpn || proxy || ip_blocklist`, and log
   `suspect_score` for analytics.
2. **Tune by action risk.** Login/checkout/password-reset warrant strict, fail-closed policies;
   read-only or low-risk actions can score-and-allow.
3. **Use `velocity` for abuse/ATO.** A spike of identifications for one `visitor_id` (or many
   visitors hitting one account) is a strong takeover/credential-stuffing signal.
4. **Persist signal outcomes** alongside your own fraud events so you can iterate on thresholds.
5. **Smart Signals require enablement.** Some are off by default in the workspace — enable them in
   the dashboard (Smart Signals settings) for the environment whose secret key you use.

## Best practices
- Server-side only — Smart Signals are never trustworthy when reported by the client.
- Fail closed on lookup errors for high-risk actions.
- Don't log the raw secret key or full event payloads containing PII.
- Re-evaluate signals on **every** sensitive action; each `event_id` is single-use.

See `snippets/signals-policy.js` for a composable scoring helper.
