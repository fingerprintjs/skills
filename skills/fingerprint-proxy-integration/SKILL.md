---
name: fingerprint-proxy-integration
description: Protect the Fingerprint JS Agent (v4) against ad blockers and improve identification accuracy by routing it through a first-party custom subdomain or a proxy integration (Cloudflare, CloudFront, Azure, Nginx) using the v4 `endpoints` option. Use to maximize accuracy after basic identification works, or when requests to the default Fingerprint domain are being blocked.
---

# Fingerprint — Protect against ad blockers (custom subdomain / proxy)

Maps to the dashboard **"Protect against ad blockers"** Get Started step. By default the JS Agent
loads its script and sends requests to Fingerprint's domain, which some browsers and ad blockers
block — dropping identification accuracy. Routing the agent through **your own domain** makes the
traffic first-party so it isn't blocked.

> **Verify against the docs first — this API changed in v4.** In v4 the old `scriptUrlPattern`,
> `endpoint` (singular), `tlsEndpoint`, and `disableTls` options were **removed** and consolidated
> into a single **`endpoints`** option. Confirm the current shape before coding:
> https://docs.fingerprint.com/docs/custom-subdomain-setup and
> https://docs.fingerprint.com/reference/migrating-from-v3-to-v4.

There are two approaches, both configured in the dashboard and then pointed at from code:

| Approach | Effort | Accuracy | When |
| --- | --- | --- | --- |
| **Custom subdomain** | Low — one DNS CNAME | Good | Simplest setup; quick win |
| **Proxy integration** | Higher — deploy a proxy | Best | Maximum accuracy; you control the edge |

You can start with a subdomain and move to a proxy later — both change only **where the agent loads
its script from** and the **`endpoints`** value, not your application logic.

## The v4 `endpoints` option
- `endpoints` sets where the agent **sends identification requests**. It takes a single string
  (your subdomain/proxy origin); an array can be supplied when fallbacks are required.
- The **script download URL** is set separately:
  - **CDN**: it's the import URL — `https://metrics.yourdomain.com/web/v4/<PUBLIC_API_KEY>`.
  - **NPM / framework SDKs**: pass `endpoints` to the provider/start options (e.g. the
    `FingerprintProvider` `endpoints` prop). See `snippets/subdomain-options.js`.

## Custom subdomain
1. In the dashboard, open the environment's integration settings and add a **custom subdomain**
   (e.g. `metrics.yourdomain.com`) — it must be on the same site as your app.
2. Create the **CNAME** record it tells you to, at your DNS provider, and wait for it to verify.
3. Set `endpoints` to your subdomain (and, for CDN installs, import the script from it). See
   `snippets/subdomain-options.js`.

## Proxy integration (max accuracy)
1. Deploy one of Fingerprint's proxy integrations at your edge — **Cloudflare Worker**, **AWS
   CloudFront + Lambda@Edge**, **Azure**, or **Nginx** — using the official integration package
   for your platform. It forwards a path on your domain to the Fingerprint ingest API with your
   proxy secret.
2. Configure the **proxy secret** in the dashboard for that environment.
3. Set `endpoints` to your proxy origin. Same code shape as the subdomain case — only the URL differs.

## How to apply (code side)
- The only code change is in the **provider/start options** where you already pass the public key
  and region: add `endpoints` pointing at your subdomain/proxy. See `snippets/subdomain-options.js`.
- Keep the value in an env var (e.g. `FINGERPRINT_ENDPOINTS`) so dev/staging/prod can differ
  without code edits.
- Region still must match the workspace region.
- Verify in the browser devtools Network tab that agent requests now go to **your** domain and
  return 200.

## Best practices
- Prefer the subdomain for a fast first step; graduate to a proxy when you need maximum accuracy.
- Don't expose the proxy secret to the browser — it lives only in your edge proxy config.
- If a request to your subdomain/proxy fails, the agent can fall back to Fingerprint's default
  endpoints; still handle identify errors so the flow degrades gracefully.
