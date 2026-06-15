# Fingerprint integration skills

Per-stack integration guides the wizard feeds to the agent. Each skill is a folder:

```
skills/<id>/
  skill.json    # metadata: id, role, frameworks, packages, env vars
  SKILL.md      # the integration guide the agent follows
  snippets/     # reference code the agent adapts to the target repo
```

`role` is `frontend`, `backend`, or `fullstack`. The wizard selects skills by matching the
detected stack (see `src/wizard/detect.ts`) against each skill's `frameworks`.

A full integration usually pairs a frontend skill (identification) with a backend skill
(server-side verification) — identification alone is not secure. `fullstack` skills cover both.

## Current skills

Frontend (identification):
- `fingerprint-react` — React
- `fingerprint-vue` — Vue 3
- `fingerprint-angular` — Angular
- `fingerprint-svelte` — Svelte / SvelteKit

Backend (server-side verification + fraud use-cases):
- `fingerprint-node` — Node / Express
- `fingerprint-python` — FastAPI / Django / Flask

Fullstack (both):
- `fingerprint-nextjs` — Next.js (client identification + server verification)

## Package names — v4 (verified on npm/PyPI + docs.fingerprint.com)
- React: `@fingerprint/react` · Vue: `@fingerprint/vue` · Angular: `@fingerprint/angular` · Svelte: `@fingerprint/svelte`
- Node server: `@fingerprint/node-sdk` · Python server: `fingerprint-server-sdk` (PyPI)

`skill.json` lists package **names only** — the installer resolves the current version (don't pin).

The v4 SDKs use `event_id` (not `requestId`) and a **flat** event response
(`event.identification.visitor_id`, `event.bot`, `event.vpn`, `event.replayed`, …) — not the
old `event.products.*.data` envelope.

> Legacy v3 packages (do **not** use for new integrations): `@fingerprintjs/fingerprintjs-pro-react`,
> `@fingerprintjs/fingerprintjs-pro-server-api`.
