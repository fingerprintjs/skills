---
description: Guide the user through completing the full Fingerprint Get Started checklist — detect what's already done in this project and walk the remaining steps, applying the matching skill for each.
argument-hint: [optional-path]
allowed-tools: [Read, Glob, Grep, Bash, Edit, Write, Skill]
---

# Fingerprint — Get Started

Walk the user through the complete Fingerprint **Get Started** flow (the same checklist as the
dashboard), from first install to production-grade protection. For each step, detect whether it's
already done in the project, then apply or guide the matching skill. Do the steps in order; don't
skip ahead unless the user asks.

## Arguments
The user invoked this with: `$ARGUMENTS` — treat as the project path if given, else use the cwd.

## How to run
1. **Audit the project first.** Grep for existing Fingerprint usage so you don't redo finished
   work: look for `@fingerprint/`, `fingerprint-server-sdk`, `FingerprintProvider`,
   `useVisitorData`, `getEvent`, `FINGERPRINT_*` env var names, `scriptUrlPattern`, `tag` /
   `linkedId`. Build a quick status of which steps below are done.
2. **Report the checklist** with each step marked done / not done.
3. **Walk the not-done steps in order.** For each, explain what it does, then invoke the matching
   skill (Skill tool) and follow it. Steps that are dashboard-only (rules, request filtering, ad
   blocker config, team invites) can't be done from code — give the user the exact dashboard
   actions and offer to make any companion code change.
4. **After each step, tell the user how to verify it** (the dashboard Get Started page checks the
   same conditions — e.g. a received event, a Server API call, a tagged event).

## The checklist

### Quick start
1. **Install Fingerprint** — identify visitors and capture the first event.
   → Run `/integrate`, or invoke the matching frontend skill (`fingerprint-react` / `-vue` /
   `-angular` / `-svelte` / `-nextjs`). *Done when the client calls `getData()` and an event is
   received.*
2. **Access detailed insights about a visitor** — use the Server API and Smart Signals.
   → Invoke `fingerprint-node` / `fingerprint-python` for the verification flow, then
   `fingerprint-smart-signals` to act on the full signal set. *Done when the server calls
   `getEvent` and reads signals.*
3. **Protect against ad blockers** — first-party custom subdomain or proxy integration.
   → Invoke `fingerprint-proxy-integration`. *Done when the agent loads from your own domain.*

### Beyond the basics
4. **Build your first rule** — no-code automatic protection via the Rules Engine.
   → Invoke `fingerprint-rules-engine` (dashboard setup + optional code to honor outcomes).
5. **Tag an event with your data** — attach user/account/order IDs to events.
   → Invoke `fingerprint-tagging`. *Done when a tagged event is received.*
6. **Protect your public API key** — request filtering / allowed origins.
   → Invoke `fingerprint-request-filtering` (dashboard setup; enumerate the app's real origins).
7. **Invite your team members** — dashboard-only. Point the user to the dashboard team settings;
   there's nothing to change in code. Pricing isn't seat-based, so they can invite freely.

## Rules
- Identification without server-side verification is **not secure** — never mark step 1 complete
  on its own; steer the user to step 2.
- Never read/print `.env`; reference env vars by name. Never put the secret key in client code.
- Prefer applying the smallest change that completes a step; verify before moving on.
- If the user only wants one step, jump straight to that step's skill.
