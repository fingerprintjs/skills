# Fingerprint skills for AI coding assistants

Add [Fingerprint](https://fingerprint.com) device identification and fraud prevention to your app
— correctly, securely, and in minutes — by letting your AI coding assistant do the wiring.

This is a [Claude Code](https://code.claude.com) plugin: a set of expert **skills** and
**commands** that teach the assistant how to integrate Fingerprint into *your* stack. Instead of
copy-pasting from docs and hoping the snippet matches your framework, you run one command and the
assistant detects your stack, installs the right SDK, wires up identification, and adds the
server-side verification that makes it actually secure.

## Why use it

- **It picks the right integration for your stack.** React, Vue, Angular, Svelte, Next.js, Node,
  or Python — the assistant detects what you're using and applies the matching guide. No wrong
  snippets, no guesswork.
- **Secure by default.** Identification in the browser is only half the job. These skills always
  pair it with **server-side verification** and keep your secret key off the client — the part
  most hand-rolled integrations get wrong.
- **Always current, never hallucinated.** SDKs and APIs change between versions. Every skill points
  the assistant at Fingerprint's live documentation and tells it to confirm package names, options,
  and event fields against the source — so you get today's API, not a stale guess.
- **Beyond install.** A guided `/get-started` flow walks you through the full Fingerprint setup:
  reading Smart Signals, protecting against ad blockers, building rules, tagging events, and locking
  down your public key.

## Install

In Claude Code:

```
/plugin marketplace add fingerprintjs/skills
/plugin install fingerprint@fingerprint
```

Then, in any project:

```
/integrate      # detect your stack and wire up identification + server-side verification
/get-started    # walk the full Fingerprint setup, one guided step at a time
```

You'll need a Fingerprint account for your API keys — sign up at
[dashboard.fingerprint.com](https://dashboard.fingerprint.com).

## What's covered

**Integration** — identify visitors on the frontend and verify them on the backend:

| Your stack | What gets set up |
| --- | --- |
| React · Vue / Nuxt · Angular · Svelte / SvelteKit | Visitor identification in the browser |
| Node (Express, Fastify, Koa, Nest, Hapi) · Python (FastAPI, Django, Flask) | Server-side verification + fraud checks |
| Next.js | Both halves in one app (client identify + server verify) |

**Get Started** — turn a basic install into production-grade protection:

- **Smart Signals** — act on bot, VPN, proxy, tampering, velocity, and more, server-side.
- **Ad-blocker protection** — serve the agent from your own domain for maximum accuracy.
- **Rules Engine** — block or allow visitors with no-code rules.
- **Event tagging** — attach your own user / account / order IDs to identifications.
- **Public key protection** — restrict your key to your own origins.

## How it works

You ask in plain language ("add Fingerprint to this app") or run `/integrate`. The assistant reads
your project to detect the framework, loads the matching skill, and follows it — installing the SDK,
adding the provider and identification calls on the client, and the verification logic on the
server, all matched to your existing code style. It confirms the current API against Fingerprint's
docs as it goes, so the result is accurate and ready for production.

## Learn more

- Fingerprint docs: https://docs.fingerprint.com
- Get an account: https://dashboard.fingerprint.com
- About Agent Skills: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
