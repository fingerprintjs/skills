---
name: fingerprint-proxy-integration
description: Serve the Fingerprint JS Agent (v4) from your own domain — a first-party custom subdomain or a proxy integration (Cloudflare, CloudFront, Azure, Nginx) via the v4 `endpoints` option — so fraud-prevention identification on a site you operate stays accurate and consistent. Use after basic identification works, when identification is unreliable or short-lived in production.
---

# Fingerprint — First-party deployment (custom subdomain / proxy)

By default the JS Agent loads its script from, and sends requests to, Fingerprint's domain — a
third-party context for your site. Browsers restrict third-party storage (Safari's ITP, Firefox's
ETP, and storage partitioning generally), which shortens how long an identifier survives and makes
identification less consistent. Serving the agent from **your own domain** puts it in the same
first-party context as the rest of your app, which is Fingerprint's recommended production setup.
In the dashboard this step is listed under *Protect against ad blockers*.

## Scope and consent
This changes **where requests go**, not what you are allowed to collect. It is for a site you
operate, and it does not reduce any disclosure obligation you already have.

- Use it only on **domains you own or operate**, to identify visitors to *that* site.
- Keep it purpose-limited to **security, fraud prevention and abuse detection**. It is not a
  mechanism for advertising, ad targeting, audience building, or profiling people across sites you
  don't control.
- **Disclose device identification in your privacy notice**, and obtain consent where the law that
  applies to your users requires it (e.g. GDPR/ePrivacy, CCPA/CPRA). Moving the endpoint to your
  own domain does not change this; confirm the specifics with whoever owns privacy compliance at
  your company.
- **Honour opt-outs and deletion requests.** Don't use first-party deployment to re-identify
  someone who has opted out, or to work around a choice a user has expressed.

> **This API changed in v4.** The old `scriptUrlPattern`, `endpoint` (singular), `tlsEndpoint`, and
> `disableTls` options were **removed** and consolidated into a single **`endpoints`** option.
> Docs: https://docs.fingerprint.com/docs/custom-subdomain-setup ·
> https://docs.fingerprint.com/reference/migrating-from-v3-to-v4.

There are two approaches, both configured in the dashboard and then pointed at from code:

| Approach | Effort | Consistency | When |
| --- | --- | --- | --- |
| **Custom subdomain** | Low — one DNS CNAME and two A records | Good | Simplest setup; quick win |
| **Proxy integration** | Higher — deploy a proxy | Best | You control the edge |

You can start with a subdomain and move to a proxy later — both change only **where the agent loads
its script from** and the **`endpoints`** value, not your application logic.

## The v4 `endpoints` option
- `endpoints` sets where the agent **sends identification requests**. It takes a single string
  (your subdomain/proxy origin); an array can be supplied when fallbacks are required.
- The **script download URL** is set separately:
  - **CDN**: it's the import URL — `https://metrics.yourdomain.com/web/v4/<PUBLIC_API_KEY>`. Note
    the `/web/` segment: on your own host the agent download sits under that prefix, while
    Fingerprint's CDN serves it at `https://fpjscdn.net/v4/<PUBLIC_API_KEY>` with no prefix. So
    routing an existing CDN import through a subdomain means adding `/web/`, not just swapping the
    host. (Passing `endpoints` to the npm/SDK path appends `/web/` for you.)
  - **NPM / framework SDKs**: pass `endpoints` to the provider/start options (e.g. the
    `FingerprintProvider` `endpoints` prop). See `snippets/subdomain-options.js`.

## Custom subdomain
1. In the dashboard, go to **Settings → Subdomains → Add subdomain** and register a **custom
   subdomain** (e.g. `metrics.yourdomain.com`) — it must be on the same site as your app. Before
   creating it, confirm the exact FQDN with the user: subdomains are immutable, so changing one
   requires deleting and recreating it. Avoid FQDNs containing `fingerprint` or `fingerprintjs` as
   a substring; the API rejects them with a 400 response. Workspaces are limited to 50 subdomains
   (5 on free trial plans).
2. Add the **CNAME** record it gives you at your DNS provider to verify domain ownership and let
   the SSL certificate be issued. Once the certificate shows **Issued**, add the two **A records**
   the dashboard provides to finish the connection. (You can sanity-check with `dig <host> +short`.)
3. Set `endpoints` to your subdomain (and, for CDN installs, import the script from it). See
   `snippets/subdomain-options.js`.

> DNS/cert validation can take up to 24 hours. This DNS step is outside the SDK — if the user is
> blocked on verification, it's a DNS-provider/propagation issue, not a code problem; they can set
> `endpoints` once it verifies.

## Proxy integration
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
- Prefer the subdomain for a fast first step; move to a proxy when you want to own the edge.
- Don't expose the proxy secret to the browser — it lives only in your edge proxy config.
- If a request to your subdomain/proxy fails, the agent can fall back to Fingerprint's default
  endpoints; still handle identify errors so the flow degrades gracefully.
- Point the subdomain at your own infrastructure only. Don't route another party's traffic through
  it, and don't reuse it for anything beyond the identification described in your privacy notice.
