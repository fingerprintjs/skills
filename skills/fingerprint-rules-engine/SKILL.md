---
name: fingerprint-rules-engine
description: Set up no-code automatic protection with the Fingerprint Rules Engine — block or allow visitors based on Smart Signals without writing decision code — and consume the rule outcome server-side. Use when the user wants automatic protection, to build their first rule, or to enforce policy without hand-coding signal checks.
---

# Fingerprint — Rules Engine (no-code protection)

Maps to the dashboard **"Build your first rule"** Get Started step. The Rules Engine lets you
block or allow requests based on Smart Signals **in the dashboard**, without writing the decision
logic yourself. It's the fastest way to get automatic protection live, and it complements (doesn't
replace) server-side verification for your most sensitive actions.

## When to use this vs. coding the checks yourself
- **Rules Engine** — broad, policy-level protection you can change without a deploy (e.g. "block
  bad bots and IP-blocklisted requests on this key"). Good default for most traffic.
- **Server-side checks** (`fingerprint-smart-signals`) — fine-grained, per-action logic tied to
  your business state (e.g. step-up auth only for first-time-device logins). Keep these for
  high-risk flows.
- Most teams use both: a ruleset for the baseline, code for the nuanced cases.

## Set up your first rule (dashboard)
This step is configured in the dashboard, not in code:
1. Open the **Rules Engine** page for your workspace.
2. Create a new **ruleset** (or select an existing one).
3. Add a rule with conditions on Smart Signals — e.g. `bot is bad` OR `ip_blocklist is true` →
   action **block**; or an allowlist rule for known-good `linkedId`s.
4. Follow the guided tour to understand priority/ordering, then **attach the ruleset to the
   public API key / environment** you want it to protect.
5. Test with a request and confirm the rule fires.

## Consume the outcome in code
When a ruleset is attached, its evaluation is reflected on the identification event returned by
the Server API. After your normal verification, read the rule outcome and honor it:
- Treat a **block** outcome as a hard stop for the action.
- Log the matched rule so you can tune rulesets from real traffic.
- Keep your own fail-closed checks for sensitive actions — a permissive ruleset should never
  downgrade your code-level protection.

> The exact field names for rule outcomes depend on your plan/configuration — read the **event
> schema resource** to find them before coding against them, and guard the access.

## How to apply
1. If the user just wants automatic protection, **guide them to build the ruleset in the
   dashboard** (steps above) — there's no SDK call to create rules.
2. If they want to act on rule outcomes in code, add a check on the event after verification, the
   same place `fingerprint-smart-signals` runs.
3. Recommend starting with one narrow block rule (bad bots / IP blocklist), verifying it, then
   expanding — broad rules risk false positives.

## Best practices
- Roll out new rules in a non-blocking/log mode first if available, then switch to block.
- Pair rules with `fingerprint-tagging` so allow/deny decisions can key off your `linkedId`.
- Don't rely on rules alone for account-level fraud — combine with server-side identity binding.
