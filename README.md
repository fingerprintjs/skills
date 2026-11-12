# Fingerprint skills for AI coding assistants

Add [Fingerprint](https://fingerprint.com) device identification and fraud prevention to your app
— correctly, securely, and in minutes — by letting your AI coding assistant do the wiring.

This repo is a set of **skills** and **commands** that teach your AI coding assistant how to
integrate Fingerprint into *your* stack. The skills follow the
[Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
standard, so they work in Claude Code, Cursor, OpenAI Codex, OpenCode, Pi, and any other agent that
supports it. Instead of copy-pasting from docs and hoping the snippet matches your framework, you
ask for Fingerprint and the assistant detects your stack, installs the right SDK, wires up
identification, and adds the server-side verification that makes it actually secure.

## Why use it

- **It picks the right integration for your stack.** React, Vue, Angular, Svelte, Next.js, vanilla
  JavaScript, Node, or Python — the assistant detects what you're using and applies the matching
  guide. No wrong snippets, no guesswork.
- **Secure by default.** Identification in the browser is only half the job. For anything
  security-sensitive (login, signup, checkout) the skills pair it with **server-side verification**
  and keep your secret key off the client — the part most hand-rolled integrations get wrong.
- **Written for today's SDKs.** Every skill is written against the current v4 SDKs and Server API —
  package names, options, event field names — and links the exact docs page it's based on. The
  bundled MCP server also gives the assistant the live event schema, so it doesn't fall back to a
  stale guess.
- **Beyond install.** A guided `/get-started` flow walks you through the full Fingerprint setup:
  reading Smart Signals, serving the agent from your own domain, building rules, tagging events,
  and locking down your public key.

## Install

Pick the method for your agent. The plugin installs (Claude Code, Cursor) also add the `/get-started`
command and the Fingerprint MCP server; `npx skills` and clone/copy install the skills only.

### Claude Code

**Terminal (CLI):** run the [`claude`](https://code.claude.com) CLI, then install using the [plugin marketplace](https://code.claude.com/docs/en/discover-plugins#add-a-marketplace):

```
/plugin marketplace add fingerprintjs/skills
/plugin install fingerprint@fingerprint
```

After installing, run `/reload-plugins` to activate the plugin.

**Desktop app (Mac/Windows):** the desktop app uses a graphical plugin manager instead of slash commands. Open the **Customize** menu → **Plugins**, add the marketplace source `fingerprintjs/skills`, then select the **fingerprint** plugin and click **Install**. **Restart the app** for the plugin to take effect.

Plugin commands are namespaced by the plugin name, so they're invoked as `/fingerprint:<command>`. Then, in any project:

```
/fingerprint:get-started    # detect your stack, install identification + server-side verification, and walk the full setup
```

You'll need a Fingerprint account for your API keys — sign up at
[dashboard.fingerprint.com](https://dashboard.fingerprint.com).

### Cursor

Open Cursor **Settings → Plugins** and either click **Browse Marketplace** to find Fingerprint, or paste the repo link `https://github.com/fingerprintjs/skills` into the **Pasted Link** field to add it directly. Then select the **fingerprint** plugin to install it. It's also listed in the [Cursor directory](https://cursor.directory/plugins/fingerprint).

### npx skills

Install the skills with the [`npx skills`](https://skills.sh) CLI — works across all supported agents. You'll get the skills (auto-loaded by description, e.g. "add Fingerprint to this app") but not the `/get-started` command or the MCP server:

```
npx skills add https://github.com/fingerprintjs/skills
```

### Clone / Copy

Clone this repo and copy the skill folders into the appropriate directory for your agent:

| Agent | Skill Directory | Docs |
|-------|-----------------|------|
| Claude Code | `~/.claude/skills/` | [docs](https://code.claude.com/docs/en/skills) |
| Cursor | `~/.cursor/skills/` | [docs](https://cursor.com/docs/context/skills) |
| OpenCode | `~/.config/opencode/skills/` | [docs](https://opencode.ai/docs/skills/) |
| OpenAI Codex | `~/.codex/skills/` | [docs](https://developers.openai.com/codex/skills/) |
| Pi | `~/.pi/agent/skills/` | [docs](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent#skills) |

## What's covered

**Integration** — identify visitors on the frontend and verify them on the backend:

| Your stack | Skill | What gets set up |
| --- | --- | --- |
| React | `fingerprint-react` | Visitor identification in the browser |
| Vue / Nuxt | `fingerprint-vue` | Visitor identification in the browser |
| Angular | `fingerprint-angular` | Visitor identification in the browser |
| Svelte / SvelteKit | `fingerprint-svelte` | Visitor identification in the browser |
| Vanilla JavaScript (Vite, Webpack, plain `<script>`) | `fingerprint-javascript` | Visitor identification with the JS Agent directly — for stacks with no framework SDK |
| Node (Express, Fastify, Koa, Nest, Hapi) | `fingerprint-node` | Server-side verification + fraud checks on every login, signup, password-reset, checkout and coupon endpoint |
| Python (FastAPI, Django, Flask) | `fingerprint-python` | Server-side verification + fraud checks on every login, signup, password-reset, checkout and coupon endpoint |
| Next.js | `fingerprint-nextjs` | Both halves in one app (client identify + server verify) |

**Get Started** — turn a basic install into production-grade protection:

- **Smart Signals** (`fingerprint-smart-signals`) — act on bot, VPN, proxy, tampering, velocity, and more, server-side.
- **First-party deployment** (`fingerprint-proxy-integration`) — serve the agent from your own domain for consistent identification.
- **Rules Engine** (`fingerprint-rules-engine`) — block or allow visitors with no-code rules.
- **Event tagging** (`fingerprint-tagging`) — attach your own user / account / order IDs to identifications.
- **Public key protection** (`fingerprint-request-filtering`) — restrict your key to your own origins.

The `fingerprint-get-started` skill ties these together: it detects your stack and walks the steps above in order.

**Commands** (plugin installs only):

| Command | What it does |
| --- | --- |
| `/get-started` | Detect your stack, install identification + server-side verification, then walk the remaining protection steps (`/fingerprint:get-started` in Claude Code) |

## How it works

You ask in plain language ("add Fingerprint to this app") or run `/get-started`. The assistant reads
your project to detect the framework, loads the matching skill, and follows it — installing the SDK,
adding the provider and identification calls on the client, and the verification logic on the
server — on every login, signup, checkout and coupon flow it finds, not just the first — all
matched to your existing code style. Each skill links the docs page it's based on, so
you (or the assistant) can check any claim at the source.

## MCP Server

The Claude Code and Cursor plugins bundle Fingerprint's remote
[MCP server](https://docs.fingerprint.com/docs/mcp-server) (`https://mcp.fpjs.io/mcp`), so once
installed the assistant can read your Fingerprint workspace directly — searching identification
events and Smart Signals, and managing environments and API keys — instead of relying only on the
skills. It connects over OAuth in the browser and needs a Fingerprint account with permission to
create API keys.

If you installed via `npx skills` or by copying the skill folders, add the server to your agent's
MCP config yourself — it's a remote HTTP server at `https://mcp.fpjs.io/mcp` with no extra setup.

## Learn more

- Fingerprint docs: https://docs.fingerprint.com
- Get an account: https://dashboard.fingerprint.com
- About Agent Skills: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
