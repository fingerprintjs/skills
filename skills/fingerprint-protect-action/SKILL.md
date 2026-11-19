---
name: fingerprint-protect-action
description: Protect a login, signup, checkout, form submission, API endpoint, or content route with Fingerprint — block bots and visitors with a high Suspect Score server-side before the action runs, and choose block, step-up, degrade, or log per action. Use when the user wants to block bots, use the Suspect Score, stop web scraping, or protect a specific action; it is also the base every other Fingerprint use-case skill starts from.
---

# Fingerprint — Protect an action

**Goal.** Refuse automated and high-risk traffic on a specific action before your own logic runs.
This is the step every Fingerprint use-case tutorial performs first, and on its own it covers
"block bots on my login" and web-scraping protection.

**When to use.** Any server handler that does something worth abusing: login, signup, checkout,
coupon redemption, SMS send, survey submit, loan application, a paywalled article, a search or
listing endpoint that scrapers hit.

> Docs: https://docs.fingerprint.com/docs/web-scraping-use-case-tutorial (the gate on its own) ·
> https://docs.fingerprint.com/docs/suspect-score

## Prerequisite
Client identification that produces an `event_id`, and a backend that calls `getEvent(eventId)`
with `FINGERPRINT_SECRET_API_KEY` (`fingerprint-node`, `fingerprint-python`, or
`fingerprint-nextjs`). Bot Detection must be enabled on the workspace (Pro Plus or Enterprise);
when it is not, `event.bot` is absent from the event.

## The gate, in order
1. **Fetch the event** by the `event_id` the client sent. Never accept a `visitor_id` or a verdict
   from the browser.
2. **Reject if the lookup fails, the event has no `identification.visitor_id`, or `replayed` is
   `true`.** Fail closed on high-risk actions.
3. **Bot check.** On an action route (login, checkout, forms), reject when
   `event.bot !== "not_detected"`: `good` bots have no business submitting a form either. On a
   **content route** (articles, search results, listings) reject only `event.bot === "bad"` or
   `bot_info.identity === "spoofed"`, and let `verified` / `signed` crawlers through, or search
   engines stop indexing you. `fingerprint-smart-signals` has the full `bot_info` policy.
4. **Suspect Score.** Reject when `event.suspect_score` is above your threshold. Treat a missing
   score as `0`.
5. **Read `visitorId = event.identification.visitor_id`** and continue into the action. The
   use-case skills (`fingerprint-velocity-limits`, `fingerprint-one-per-device`,
   `fingerprint-device-account-binding`, `fingerprint-visitor-records`, `fingerprint-signal-rules`)
   all start here.

## Threshold
The tutorials use **20**. `suspect_score` is the sum of a predefined weight for every Smart Signal
that fired (rarer signals weigh more), so its ceiling depends on which signals are enabled in the
workspace, and the right cutoff is specific to your traffic. Expose it as an env var
(`FINGERPRINT_SUSPECT_SCORE_THRESHOLD`) rather than a literal, and log the score on every request
before lowering it. Weights are editable per platform in the dashboard under **Smart Signals →
Suspect Score**; the **Analysis** tab there takes a CSV of at least 1,000 fraud-labelled events and
recommends both weights and a threshold for your data.

## Four outcomes, not one
| Outcome | Use it when | Example |
| --- | --- | --- |
| **Block** | the action has no legitimate automated use | login, checkout, SMS send |
| **Step-up** | a human may be behind it but the risk is real | MFA / email OTP on an unknown device |
| **Degrade** | you want the action to succeed without the perk | create the account, withhold the welcome bonus (bonus-abuse tutorial) |
| **Log** | you are calibrating the threshold | record `suspect_score` and the outcome, allow |

Pick per action. Most teams default to block everywhere and then discover a content route they
took offline.

## Response hygiene
- Return one generic failure to the client (`"Login failed."`). Never echo the reason: it tells an
  attacker which signal tripped.
- Log the real reason and the score server-side.
- Persist `{ visitorId, action, score, outcome, createdAt }` so thresholds can be tuned later.

## No-code alternative
Both conditions (Bot result, Suspect Score) exist as Rules Engine conditions, so this gate can run
in the dashboard without a deploy. See `fingerprint-rules-engine`. Keep the code path for actions
that also need your own state.

## Reference
`snippets/protect-action.js` is a stack-agnostic Node function:
```js
const result = await protectAction(client, eventId, { route: 'action' })
if (result.outcome === 'block') return res.json({ success: false, error: 'Login failed.' })
const { visitorId, event } = result   // continue into the action
```
`route: 'content'` switches to the crawler-tolerant bot rule; `onSuspect: 'degrade'` returns
`allow` with `suspect: true` instead of blocking, for the degrade outcome.

## Notes
- Run the gate on **every** sensitive request; each `event_id` is single-use.
- Fail closed on lookup errors for high-risk actions, fail open for low-risk ones you would
  rather not break during a Fingerprint outage.
- A missing `event.bot` means Bot Detection is not enabled, not that the visitor is human.

## Verify
- Run the action from a headless browser (Playwright or Puppeteer): it is refused.
- Run it from your normal browser: it passes, and the server log shows the score.
- For a content route, fetch it with a real crawler user agent through the dashboard's Events
  page and confirm a `verified` crawler is allowed.
