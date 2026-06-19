---
description: Detect this project's tech stack and integrate Fingerprint by applying the matching skill(s) — frontend identification paired with server-side verification.
argument-hint: [optional-path]
allowed-tools: [Read, Glob, Grep, Bash, Edit, Write, Skill]
---

# Fingerprint — Integrate

Detect the stack in the target project and wire up Fingerprint by following the matching
Fingerprint skill(s). A complete integration pairs **frontend identification** with
**server-side verification** — identification alone is not secure.

## Arguments
The user invoked this with: `$ARGUMENTS`

If `$ARGUMENTS` is a path, integrate that directory; otherwise use the current working directory.

## Step 1 — Detect the stack
Read the project's manifests (don't guess from directory names):
- **Node**: `package.json` `dependencies` + `devDependencies`.
- **Python**: `requirements.txt`, `pyproject.toml`.
- Check up to ~2 levels deep for monorepos (`apps/`, `packages/`, `pnpm-workspace.yaml`); a repo
  can have a separate frontend and backend.

Map detected frameworks to skills:

| Detected | Skill | Role |
| --- | --- | --- |
| `next` | `fingerprint-nextjs` | fullstack (covers both halves) |
| `react`, `react-native` | `fingerprint-react` | frontend |
| `vue`, `nuxt` | `fingerprint-vue` | frontend |
| `@angular/core` | `fingerprint-angular` | frontend |
| `svelte` (incl. SvelteKit) | `fingerprint-svelte` | frontend |
| `express`, `fastify`, `koa`, `@nestjs/core`, `@hapi/hapi` | `fingerprint-node` | backend |
| `fastapi`, `django`, `flask` | `fingerprint-python` | backend |

Rules:
- If you detect **Next.js**, use `fingerprint-nextjs` alone — it does client + server.
- Otherwise pick **one frontend** and **one backend** skill that match. If only a frontend is
  present, apply it but clearly flag that verification must be added server-side to be secure.
- If nothing matches a curated skill, fall back to the official docs (start at
  `https://docs.fingerprint.com/llms.txt`) and integrate from there.

## Step 2 — Apply each matched skill
For each matched skill, invoke it with the Skill tool (e.g. `fingerprint-react`,
`fingerprint-node`) and follow its steps exactly. Each skill specifies the package, env var
names, and reference snippets.

Constraints:
- **Never** put `FINGERPRINT_SECRET_API_KEY` (or any secret) in frontend/client code.
- Match the existing code style; make minimal, focused edits.
- Read env values by name — do **not** read or print `.env` contents.
- Region must match the workspace region (`us` | `eu` | `ap`) on every side.
- Tell the user which packages to install rather than pinning versions yourself.

## Step 3 — Report and point to next steps
After wiring it up, summarize:
- Which skill(s) you applied and the files you changed.
- The env vars the user must set (public key for the client, secret key for the server).
- The packages to install.
- Run `/get-started` next to complete the remaining Fingerprint setup (Smart Signals, ad-blocker
  protection, rules, tagging, key protection).
