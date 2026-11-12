---
name: fingerprint-velocity-limits
description: Limit how many times one device can perform an action in a time window using the Fingerprint visitor_id — stop credential stuffing (failed logins), card testing (orders), SMS pumping (verification codes), loan application spam, and meter a paywall (free articles). Use when the user wants to rate-limit, throttle, or cap an action per device, or names one of those use cases.
---

# Fingerprint — Velocity limits per device

**Goal.** Count how often one device performs an action and refuse it past a limit. Cookies,
sessions, and IPs reset or rotate; `visitor_id` survives incognito, cleared storage, and VPN
hops, so the count sticks to the device.

**When to use.** Credential stuffing, card testing, SMS pumping, loan application spam, and
metered access such as a free-article paywall. All five tutorials are the same pattern with a
different table name, limit, and window.

> Docs: https://docs.fingerprint.com/docs/credential-stuffing-use-case-tutorial ·
> https://docs.fingerprint.com/docs/card-testing-use-case-tutorial ·
> https://docs.fingerprint.com/docs/sms-pumping-use-case-tutorial

## Prerequisite
`fingerprint-protect-action` has run and returned `visitorId`. Start from there.

## The logic
1. **Count** rows for this `visitorId` created since `now - window`.
2. **Refuse** when the count has reached the limit.
3. **Record** the action with `visitorId` and `createdAt`, then proceed.

Whether step 3 runs on refused attempts is a design choice, and the tutorials differ:
- **Record failures too** (credential stuffing, account takeover): every blocked attempt adds a
  row, so a visitor who keeps trying stays blocked and the window keeps sliding. Right for
  attacks.
- **Record successes only** (SMS pumping, card testing): refused attempts do not count. Right
  when the cost you are limiting is the successful action itself (a sent SMS, a card charge).

## Your data
One table per limited action:

```sql
CREATE TABLE <action>_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  visitorId TEXT    NOT NULL,
  createdAt INTEGER NOT NULL,        -- Date.now()
  -- plus whatever the action needs: email, success, amount, phone, articleId
);
CREATE INDEX <action>_log_visitor ON <action>_log (visitorId, createdAt);
```

## Variants (tutorial defaults)
| Use case | Table | Counts | Limit | Window | Records |
| --- | --- | --- | --- | --- | --- |
| Credential stuffing | `failed_logins` | failed logins per visitor | 3 | 24 h | failures |
| Account takeover | `login_attempts` (`success` column) | failed logins per visitor | 3 | 24 h | all attempts, checked before the password |
| Card testing | `orders` | orders per visitor | 5 | 24 h | successful orders |
| SMS pumping | `sms_codes` | codes sent per visitor | 5 | 24 h | successful sends |
| Loan fraud | `loan_applications` | applications per visitor | 3 | none (lifetime) | all, including rejected |
| Paywall | `articles_read` (`visitorId, articleId` unique) | distinct articles per visitor | 3 | none | first read of each article; re-reading a counted article stays free |

Loan fraud adds a consistency check: hash `firstName + lastName + monthlyIncome` from the first
application and refuse a later one from the same device whose details differ.

Fingerprint's own `event.velocity` counters (`events`, `distinct_ip`, `distinct_linked_id` at
5 minutes, 1 hour, 24 hours) give you a burst signal with no table at all; use them to raise
risk, and your own table to enforce a business limit. See `fingerprint-signal-rules`.

## Reference
`snippets/velocity-limit.js`:
```js
const limiter = velocityLimit(store, { key: 'failed_logins', limit: 3, windowMs: 24 * 60 * 60 * 1000 })
if (await limiter.exceeded(visitorId)) return res.json({ success: false, error: 'Login failed.' })
// ... check the password ...
if (!ok) { await limiter.record(visitorId); return res.json({ success: false, error: 'Login failed.' }) }
```
`store` is two functions over your database: `countSince(key, visitorId, since)` and
`insert(key, row)`. The snippet includes a SQLite implementation; wire `store` to whatever the app
already persists with, and never add a database dependency for it (`memoryStore` is fine to start).

## Notes
- Key on `visitorId` from the verified event, never on a value the browser sent.
- Return the same generic failure as the gate does; a distinct "too many attempts" message tells
  an attacker the limit exists. The credential-stuffing tutorial returns a distinct message; prefer
  the generic one.
- The paywall sits on a crawlable route: run the gate with `route: 'content'`.
- Tagging the identification with `linkedId: accountId` lets you also count per account using
  `event.velocity.distinct_visitor_id_by_linked_id` (many devices on one account).

## Verify
- Perform the action `limit` times from one browser: all succeed. The next attempt is refused.
- Open an incognito window and try again: still refused, same `visitorId`.
- Wait past the window (or shorten it in dev): the next attempt succeeds.
