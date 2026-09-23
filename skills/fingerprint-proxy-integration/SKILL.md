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

Creating a subdomain does not make it usable. Only server status `active` permits setting
`endpoints` or switching the script URL. DNS and certificate issuance take minutes to days, so a
pending run ends with a clear next step, never a polling loop.

### Pick an executor

Use the first one available. Authentication belongs to the executor: never ask for, read or pass a
Management API key, and never fall back to direct HTTP calls.

1. The CLI's host-side subdomain tools, when running inside `npx fingerprint`.
2. Fingerprint MCP subdomain tools, when the server is connected.
3. `fingerprint subdomains` commands, when you have a shell and the CLI is installed
   (`fingerprint subdomains --help` lists them).
4. None of the above: say you can't manage subdomains from here and use the Dashboard fallback.

Use only operations actually exposed by the current executor; being inside `npx fingerprint` or
having the MCP connected does not guarantee the subdomain tools exist.

| Operation | Tool | CLI |
| --- | --- | --- |
| List | `list_subdomains` | `fingerprint subdomains list --json` |
| Read | `get_subdomain` `{ id }` | `fingerprint subdomains get <id-or-hostname> --json` |
| Create | `create_subdomain` `{ hostname }` | `fingerprint subdomains create <hostname> --json` |
| Verify | `verify_subdomain` `{ id }` | `fingerprint subdomains verify <id-or-hostname> --json` |
| Delete | `delete_subdomain` `{ id }` | `fingerprint subdomains delete <id-or-hostname> --json --yes` |

The CLI prints `{ "data": ... }` on success and `{ "error": { "kind", "message", ... } }` with a
nonzero exit on failure; `list` follows pagination. `--yes` on delete is only for a deletion the
user already approved.

### Find or create the subdomain

- Start by listing the workspace's subdomains, never from conversation memory. Normalize the
  hostname (trim, drop a trailing dot, lowercase) and match exactly. One match: read it by ID.
  Several: show hostname, ID and status and ask. No hostname supplied: show the candidates and ask.
- No match: confirm the exact hostname and the intent to create before creating. It must be an
  unused hostname on a domain the user operates, not the site's own hostname (its A records will
  point at Fingerprint). Constraints: no apex, 64 characters max, no `fingerprint` or
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

If `configure_subdomain_endpoint` is available, call it with the ID and use the env var it returns
in the existing provider/start options. Otherwise follow "How to apply" below with the framework's
env convention; never read or print `.env`, and if you cannot write the env file, give the user the
exact variable and value. For a CDN install, switch the import URL and `endpoints` directly. Keep
the public key and region as they are.

### Errors

Surface the executor's `kind` and `message` and stop; they are already actionable
(`not_authenticated` → `fingerprint login`, `invalid_subdomain` → the returned violations,
`duplicate` → resolve that hostname again, `limit_reached`, `rate_limited` → `retry_after`,
`unavailable`). Never retry in a loop, never delete to make room, never ask the user to paste a key.

### Dashboard fallback

**Settings → Subdomains** in the Fingerprint Dashboard: resume the existing hostname or **New
subdomain**, add the displayed records or use one-click setup, then **Check DNS records**. Make
the code change only once the Dashboard shows **Active**.

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
