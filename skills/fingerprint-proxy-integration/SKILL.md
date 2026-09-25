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
> API: https://docs.fingerprint.com/reference/subdomainscontroller_create.

Choose a custom subdomain or a proxy integration, then point the existing SDK setup at it:

| Approach | Effort | Consistency | When |
| --- | --- | --- | --- |
| **Custom subdomain** | Low — DNS records returned by Fingerprint | Good | Simplest setup; quick win |
| **Proxy integration** | Higher — deploy a proxy | Best | You control the edge |

Pick one. A custom subdomain is Fingerprint-managed DNS on your domain (this skill's
[Custom subdomain](#custom-subdomain) section); a proxy integration is code you deploy at your edge
([Proxy integration](#proxy-integration)). Never set up both for the same app. You can start with a
subdomain and move to a proxy later — both change only **where the agent loads its script from**
and the **`endpoints`** value, not your application logic.

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

Creating a subdomain does not make it usable. Only server status `active` permits setting
`endpoints` or switching the script URL. DNS and certificate issuance take minutes to days, so a
pending run ends with a clear next step, never a polling loop.

### Pick an executor

Use the first one available. Authentication belongs to the executor: never ask for, read or pass a
Management API key, and never fall back to direct HTTP calls.

1. Fingerprint subdomain tools, when they are exposed to you: inside the `fingerprint` CLI wizard,
   or through the Fingerprint MCP server. Use only the operations actually exposed; being inside
   the wizard or having the MCP connected does not guarantee they exist.
2. A shell with the CLI available: run the wizard, `npx fingerprint integrate --subdomain <hostname>`.
   It creates the subdomain, waits for DNS, and points the app at it. Only if you must drive it
   yourself, the `fingerprint subdomains` commands (`list`, `get`, `create`, `verify`, `delete`, all
   with `--json`) do the same operations as the tools.
3. Neither: use the [Dashboard](#dashboard) below.

| Operation | Tool |
| --- | --- |
| List | `list_subdomains` |
| Read | `get_subdomain` `{ id }` |
| Create | `create_subdomain` `{ hostname }` |
| Verify | `verify_subdomain` `{ id }` |
| Delete | `delete_subdomain` `{ id }` (only for a deletion the user approved) |

### Find or create the subdomain

- Start by listing the workspace's subdomains, never from conversation memory. Normalize the
  hostname (trim, drop a trailing dot, lowercase) and match exactly. One match: read it by ID.
  Several: show hostname, ID and status and ask. No hostname supplied: show the candidates and ask.
- No match: confirm the exact hostname and the intent to create before creating. It must be an
  unused subdomain of the same site the app runs on (e.g. `metrics.yourdomain.com` for
  `yourdomain.com`), never the site's own hostname (its A records will point at Fingerprint), and a
  subdomain of a different domain the user owns does not count as first-party. Constraints: no apex,
  64 characters max, no `fingerprint` or
  `fingerprintjs` in the FQDN, immutable once created, workspace limit typically 50 (5 on trial).
- Read status and `dns_records` before continuing. `active` or terminal: skip to the status
  branch. Only `pending` needs DNS work.

### Present the DNS records together

Show every record in `dns_records`: `verification` (CNAME), `routing[]` (A) and `caa` when present,
each with `type`, `host`, `value` and its own `status`. They are all added in one pass; the A
records do not wait for the certificate. When some are already `validated`, name only the ones
still pending.

If the agent has an authorized DNS-provider tool, offer to apply exactly these records after the
user approves. Otherwise the user adds them at their DNS provider, which may not be their web host.
On Cloudflare DNS the records must be **DNS only** (proxying off). Domain Connect is not required;
the Dashboard may offer its own one-click setup.

Once the records are in, verify at most once per run, then read the resource again: the verify
response can carry stale record statuses (the CLI command and the `verify_subdomain` tool already
do this read for you).

### Branch on status

| Status | Action |
| --- | --- |
| `pending` | Leave `endpoints` and code untouched. Name the unresolved records, or say certificate issuance is in progress when all are `validated`. End as waiting; no polling, no second verify. |
| `active` | Configure the endpoint (below). |
| `timed_out` | Offer delete and recreate for the named hostname; both need explicit approval. Then present the new records. |
| `failed` | Stop. Show hostname, ID and the returned details. |

Status comes from the server only, never from elapsed time or from the records; all records
`validated` is not `active`. A pending run ends with hostname, ID, what is outstanding and how to
resume: ask the agent to resume setup for the same hostname; `fingerprint subdomains get <hostname>`
only checks its status. Get Started step 3 is not complete while waiting.

### Configure only after `active`

Follow [How to apply](#how-to-apply-code-side) with the framework's env convention. Inside the
wizard, reference the env variable the CLI names and stop: the CLI writes it. Elsewhere, never read
or print `.env`; if you cannot write the env file, give the user the exact variable and value. For
a CDN install, switch the import URL and `endpoints` directly. Keep the public key and region as
they are.

### Errors

Surface the executor's `kind` and `message` and stop; they are already actionable
(`not_authenticated` → `fingerprint login`, `invalid_subdomain` → the returned violations,
`duplicate` → resolve that hostname again, `limit_reached`, `rate_limited` → `retry_after`,
`unavailable`). Never retry in a loop, never delete to make room, never ask the user to paste a key.

### Dashboard

When no executor is available, the user does it in the Fingerprint Dashboard and you do the code:

1. **Settings → Subdomains → New subdomain**, enter the hostname (or open the existing one).
2. Add the records the Dashboard shows at the DNS provider, all at once, or use its one-click
   setup when offered. On Cloudflare, DNS only (proxying off).
3. **Check DNS records**, then wait for the status to read **Active**. This can take minutes.
4. Only then apply [How to apply](#how-to-apply-code-side). Ask the user to confirm **Active**
   before editing; creating the subdomain or adding the records is not enough.

`webhook_url` is for CI/CD with a public callback URL, not for a local agent session.

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
