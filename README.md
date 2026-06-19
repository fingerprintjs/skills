# Fingerprint integration skills

Production-focused skills and commands that integrate [Fingerprint](https://fingerprint.com)
device identification and fraud prevention into a project (v4 SDKs). Used two ways:

- **As a Claude Code plugin** — install it and run `/integrate` or `/get-started` (below).
- **By the Fingerprint CLI wizard** — `fingerprint integrate` detects the stack and feeds the
  matching skill to the agent.

Everything here targets **production usage** — no staging hosts or non-default endpoints are baked
into the snippets.

## Layout

```
skills/<id>/
  skill.json    # metadata: id, role, frameworks, packages, env vars
  SKILL.md      # the integration guide the agent follows
  snippets/     # reference code the agent adapts to the target repo
commands/<name>.md  # user-invocable slash commands
.claude-plugin/     # plugin + marketplace manifests
```

`role` is `frontend`, `backend`, `fullstack`, or `enhancement`. The CLI wizard selects per-stack
skills by matching the detected stack (see `fingerprint-cli`'s `src/wizard/detect.ts`) against each
skill's `frameworks`. `enhancement` skills are not auto-selected by the wizard — they cover the
post-install Get Started steps and are applied via `/get-started` or auto-loaded by their
description.

A full integration pairs a **frontend** skill (identification) with a **backend** skill
(server-side verification) — identification alone is not secure. `fullstack` skills cover both.

## Installing as a Claude Code plugin

```
/plugin marketplace add fingerprintjs/skills
/plugin install fingerprint@fingerprint
```

Then in any project:

```
/integrate        # detect the stack and wire up identification + verification
/get-started      # walk the full Get Started checklist, applying a skill per step
```

## Commands

| Command          | What it does                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `/integrate`     | Detects the project's stack and applies the matching skill(s) — frontend identification + backend verification. Optional path argument. |
| `/get-started`   | Detects what's already integrated, then guides the user through the remaining Get Started steps (Smart Signals, ad-blocker protection, rules, tagging, key protection), applying the matching skill for each. |

## Skills

### Integration (per stack)

Frontend (identification):
- `fingerprint-react` — React
- `fingerprint-vue` — Vue 3 / Nuxt
- `fingerprint-angular` — Angular
- `fingerprint-svelte` — Svelte / SvelteKit

Backend (server-side verification + fraud use-cases):
- `fingerprint-node` — Node / Express / Fastify / Koa / Nest / Hapi
- `fingerprint-python` — FastAPI / Django / Flask

Fullstack (both):
- `fingerprint-nextjs` — Next.js (client identification + server verification)

### Get Started (advanced, post-install)

These mirror the dashboard's **Get Started** checklist and are applied via `/get-started`:
- `fingerprint-smart-signals` — *Access detailed insights*: act on the full Smart-Signals set
- `fingerprint-proxy-integration` — *Protect against ad blockers*: custom subdomain / proxy
- `fingerprint-rules-engine` — *Build your first rule*: no-code automatic protection
- `fingerprint-tagging` — *Tag an event with your data*: attach user/account/order IDs
- `fingerprint-request-filtering` — *Protect your public API key*: allowed origins / block lists

## Verify against the docs (don't trust pre-trained knowledge)

Like the Cloudflare and Stripe skills, these bias toward **retrieval over baked-in knowledge**.
Package names, SDK APIs (e.g. the v4 `endpoints` option that replaced `scriptUrlPattern`), and the
event response shape change between versions — every skill points at the authoritative source and
tells the agent to confirm before relying on specifics.

Authoritative sources:
- Docs index: https://docs.fingerprint.com/llms.txt
- v3 → v4 migration: https://docs.fingerprint.com/reference/migrating-from-v3-to-v4
- Server API event schema (OpenAPI): https://github.com/fingerprintjs/fingerprint-pro-server-api-openapi
- The Fingerprint MCP **event-schema resource** (authoritative for field questions)

## Package names — v4 (confirm the current version against the docs)
- React: `@fingerprint/react` · Vue: `@fingerprint/vue` · Angular: `@fingerprint/angular` · Svelte: `@fingerprint/svelte`
- Node server: `@fingerprint/node-sdk` · Python server: `fingerprint-server-sdk` (PyPI)

`skill.json` lists package **names only** — the installer resolves the current version (don't pin).

The v4 SDKs use `event_id` (not `requestId`). The exact event response shape (flat vs. nested,
`snake_case` vs. `camelCase`) should be **confirmed against the event schema** above before coding,
not assumed.

> Legacy v3 packages (do **not** use for new integrations): `@fingerprintjs/fingerprintjs-pro-react`,
> `@fingerprintjs/fingerprintjs-pro-server-api`.
