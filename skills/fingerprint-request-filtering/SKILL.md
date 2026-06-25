---
name: fingerprint-request-filtering
description: Protect your public Fingerprint API key from unauthorized use by configuring request filtering — allowed origins, header restrictions, and block lists — so the key only works from your own apps even though it's visible in client source. Use when securing the public key, preventing key abuse, or setting up allow/block lists.
---

# Fingerprint — Protect your public API key (request filtering)

Maps to the dashboard **"Protect your public API key"** Get Started step. The public API key ships
in your client source, so anyone can read it. Request filtering rules make the key only usable
from **your** apps, so a copied key can't rack up usage or pollute your data elsewhere.

This is configured in the dashboard against the environment's public key — there is no code change
beyond keeping the agent's origin consistent.

## Set up request filtering (dashboard)
1. In the dashboard, go to **Security → Web**.
2. Under **Websites**, click **Configure** and set an **allowlist** of the exact origins your app
   loads the agent from (e.g. `https://app.yourdomain.com`, plus `http://localhost:3000` for local
   dev). Requests from other origins are rejected. (Use a blocklist instead to deny specific origins.)
3. Optionally, under **Forbidden HTTP Headers**, click **Add rule** to restrict by header.
4. Save and test: a request from an allowed origin succeeds; one from an unlisted origin is blocked.
   Rule changes can take up to ~5 minutes to take effect.

## How to apply
1. **Enumerate every origin** that legitimately loads the agent: production domain(s), any preview
   domains, and local dev. Read these from the project (e.g. deployment config, `vite.config`,
   `next.config`, CORS settings) so the allowlist matches reality and you don't lock out prod.
2. **Add them in the dashboard** — this step has no SDK call.
3. If you also use a **custom subdomain / proxy** (`fingerprint-proxy-integration`), make sure the
   allowed origins still match where the page is served from.
4. Don't over-restrict: missing a real origin silently breaks identification there. Verify each
   listed app still identifies after enabling the rules.

## Best practices
- Treat the public key as public — request filtering is the control, not secrecy.
- Keep the allowlist in sync as you add domains/preview environments.
- Never try to "hide" the public key in code; it's meant to be in the browser. The **secret** key
  is the one that must never reach the client.
- Pair with the Rules Engine (`fingerprint-rules-engine`) for signal-based blocking on top of
  origin-based filtering.
