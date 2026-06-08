# Fingerprint integration skills

Per-stack integration guides the wizard feeds to the agent. Each skill is a folder:

```
skills/<id>/
  skill.json    # metadata: id, role, frameworks, packages, env vars
  SKILL.md      # the integration guide the agent follows
  snippets/     # reference code the agent adapts to the target repo
```

`role` is `frontend` or `backend`. The wizard selects skills by matching the detected
stack (see `src/wizard/detect.ts`) against each skill's `frameworks`.

A full integration usually pairs a frontend skill (identification) with a backend skill
(server-side verification) — identification alone is not secure.

## Current skills
- `fingerprint-react` — React frontend identification
- `fingerprint-node` — Node/Express backend verification + fraud use-cases

## Package names — v4 (verified on npm + docs.fingerprint.com)
- Frontend (React): `@fingerprint/react` (v3.x package = v4 SDK)
- Node server: `@fingerprint/node-sdk` (v7.x)

The v4 SDKs use `event_id` (not `requestId`) and a **flat** event response
(`event.identification.visitor_id`, `event.bot`, `event.vpn`, `event.replayed`, …) — not the
old `event.products.*.data` envelope.

> Legacy v3 packages (do **not** use for new integrations): `@fingerprintjs/fingerprintjs-pro-react`,
> `@fingerprintjs/fingerprintjs-pro-server-api`.
