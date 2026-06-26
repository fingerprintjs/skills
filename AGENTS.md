# Repository guide for AI agents

This repo holds Fingerprint **integration** skills (`skills/<id>/`) and slash commands
(`commands/<name>.md`). The skill folders follow the Agent Skills standard and are shared across
agents; per-agent packaging lives alongside them: a Claude Code plugin (`.claude-plugin/`), a Cursor
plugin + rule (`.cursor-plugin/`, `rules/`), and a bundled remote MCP server (`.mcp.json`, the
Fingerprint MCP at `https://mcp.fpjs.io/mcp`). It is also consumed by the Fingerprint CLI wizard,
which clones this repo and copies matched skills into a target project's `.claude/skills/<id>/`.

When editing a skill, change only `skills/<id>/` — never duplicate skill content into the per-agent
manifests. When adding install methods or MCP servers, update both `README.md` and the relevant
manifest. Keep `rules/fingerprint.mdc` in sync with the hard rules below (it's the Cursor-facing
restatement of them).

## Hard rules

- **Retrieval over pre-trained knowledge.** SDK APIs, option names, package versions, and event
  field names drift between versions (e.g. v4 removed `scriptUrlPattern`/`endpoint` in favor of
  `endpoints`). Every skill that asserts an API or field name must include a short "verify against
  the docs" note pointing at the authoritative source — the docs index
  (https://docs.fingerprint.com/llms.txt), the relevant SDK reference, the Server API OpenAPI
  schema (https://github.com/fingerprintjs/fingerprint-pro-server-api-openapi), or the Fingerprint
  MCP event-schema resource. Confirm specifics before writing them as fact.
- **Production only.** Never bake staging hosts, non-default endpoints, or environment overrides
  into snippets or skills. Read keys/region from env vars by name.
- **Secrets never reach the client.** `FINGERPRINT_SECRET_API_KEY` is server-side only; only the
  public key (and region) may ship to the browser.
- **v4 only.** Use `event_id` and the flat event shape (`event.identification.visitor_id`,
  `event.bot`, …). Don't reintroduce v3 packages or the `event.products.*` envelope.

## Layout & conventions

- Each skill is `skills/<id>/` with `skill.json` (metadata), `SKILL.md` (frontmatter `name` +
  `description`, then the guide), and optional `snippets/`.
- `role`: `frontend` | `backend` | `fullstack` | `enhancement` | `orchestrator`. The CLI wizard
  only auto-selects the first three (matched by framework); `enhancement` skills are for the Get
  Started flow, and the single `orchestrator` skill (`fingerprint-get-started`) detects the stack
  and delegates to the others. Both are reached via `/get-started` or auto-loaded by their
  `description`.
- `skill.json` `packages` lists names only (no version pins). The CLI allowlists installable
  packages (`@fingerprint/*`, `dotenv`, `python-dotenv`, `fingerprint-server-sdk`) — adding a new
  dependency means updating that allowlist in `fingerprint-cli`.
- Keep `description` keyword-rich so skills auto-trigger reliably.

## When adding a skill or command

`README.md` has a Skills section and a Commands table. Add a row/bullet for every new skill or
command in the same change, pulling the wording from its frontmatter. Commands are invoked as
`/<name>` (plugin-scoped).
