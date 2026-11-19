---
name: fingerprint-signal-rules
description: Turn a scenario into a rule over Fingerprint Smart Signals with no table of your own — regional pricing and local discounts (VPN + IP country), geo restrictions and compliance, timezone mismatch, location-based personalization (IP geolocation), blocking datacenter or hosting traffic (ASN), Tor and known-bad IPs, anti-detect browsers, mobile app integrity (jailbreak, root, Frida, emulator, cloned app), new vs returning devices, and burst detection with the built-in velocity counters. Use when the user describes a case that maps to a signal rather than a fraud pattern, or asks which Smart Signal to use.
---

# Fingerprint — Signal rules

**Goal.** Go from "the user wants X" to the field on the event and the comparison, for cases that
need no state of your own. `fingerprint-smart-signals` explains what each signal means; this skill
is the lookup from scenario to rule.

**When to use.** After `fingerprint-protect-action` has passed (or instead of it, for
personalization, which has no gate). Every rule reads the **server-verified** event from
`getEvent(eventId)`.

> Docs: https://docs.fingerprint.com/docs/regional-pricing-use-case-tutorial ·
> https://docs.fingerprint.com/docs/smart-signals-reference

## Scenario → signal → rule
| User says | Read | Rule |
| --- | --- | --- |
| Regional pricing, local discount | `vpn`, then `ip_info.v4.geolocation.country_code` | refuse the discount when `vpn` is `true` (tutorial message: ask the user to turn the VPN off); otherwise price by country |
| Geo restriction, licensing, sanctions, compliance | `geolocation.country_code` plus `vpn`, `proxy`, `ip_blocklist.tor_node` | block the country **and** anything that hides the country; log `vpn_origin_country` when present |
| Timezone looks wrong, travel vs spoofing | `vpn_methods.timezone_mismatch`, or compare `raw_device_attributes.timezone` with `ip_info.v4.geolocation.timezone` | raise risk, step up; never block on this alone |
| Personalize by place | `geolocation.latitude`, `longitude`, `city_name` | sort or default content; store preferences keyed by `visitor_id`; no gate |
| Block datacenter or hosting traffic | `ip_info.v4.asn_type`, `datacenter_result`, `datacenter_name` | block on write actions, allow on reads |
| Stop known-bad IPs | `ip_blocklist.attack_source`, `email_spam`, `tor_node` | block or step up on any flag |
| Scraping, automation on content | `bot_info.category`, `identity`, `confidence` | allow `verified` / `signed` crawlers, block the rest (`fingerprint-protect-action`, `route: 'content'`) |
| Anti-detect browser, spoofed fingerprint | `tampering`, `tampering_confidence`, `tampering_details.anti_detect_browser` | block for sensitive actions when confidence is `high` or `anti_detect_browser` is `true` |
| Mobile app integrity | `jailbroken`, `root_apps`, `frida`, `emulator`, `simulator`, `cloned_app`, `mitm_attack` | fail closed in banking, gaming, and anything with money; `mitm_attack` means the request was intercepted, refuse it |
| Returning vs new device | `identification.visitor_found`, `first_seen_at`, `last_seen_at` | a never-seen device is higher risk on checkout and login; a device seen for months is lower |
| Burst from one device, IP, or account | `velocity.events`, `ip_events`, `distinct_ip`, `distinct_country`, `distinct_linked_id`, `distinct_visitor_id_by_linked_id`, each at `5_minutes`, `1_hour`, `24_hours` | rate-limit without a table; `distinct_country["1_hour"] > 1` is travel at impossible speed |
| Unusual device | `rare_device`, `rare_device_percentile_bucket` | score only |
| Private browsing, devtools, VM | `incognito`, `developer_tools`, `virtual_machine`, `privacy_settings` | score; common among legitimate users, so never a block on their own |
| High-activity device | `high_activity_device` | score; a shared kiosk and a bot farm look the same |

`ip_info` has `v4` and `v6` branches; read whichever is present. Mobile-only fields are absent
on web events and vice versa, so read every field with a default (`event.vpn ?? false`).

## Confidence fields
`vpn_confidence`, `proxy_confidence`, `tampering_confidence` and `bot_info.confidence` are
`low | medium | high`. Block only on `high` for anything irreversible; step up on `medium`. The
`*_ml_score` fields and `labels` are beta and restricted to selected customers.

## Reference
`snippets/signal-rules.js` has one small function per row (`regionalDiscount`, `geoRestrict`,
`timezoneMismatch`, `datacenterTraffic`, `knownBadIp`, `antiDetectBrowser`, `mobileIntegrity`,
`newDevice`, `burst`). Each takes the verified event and returns `{ ok, reason }`:
```js
const geo = regionalDiscount(event, { allowedCountries: ['BR', 'IN'] })
if (!geo.ok) return res.json({ success: false, message: geo.message })
```

## Notes
- IP geolocation is the location of the IP, not the person: mobile carriers and corporate VPNs
  place users hundreds of kilometres away. Use `accuracy_radius` and never price or restrict on
  `city_name` alone.
- Every rule here is also a Rules Engine condition. For a policy that changes often, build it in
  the dashboard (`fingerprint-rules-engine`) and read `rule_action` from the event.
- Enable the signals you rely on in the dashboard; a signal that is off is absent, and an absent
  signal must read as "unknown", not as "clean".

## Verify
- Regional pricing: load the page through a VPN exit in the discount country: refused with the
  VPN message. Load it without the VPN from that country: discounted.
- Timezone: set the OS timezone to a different region from your IP and reload:
  `vpn_methods.timezone_mismatch` is `true` on the dashboard Events page.
- Velocity: reload the identified page ten times in a minute and read `velocity.events["5_minutes"]`.
