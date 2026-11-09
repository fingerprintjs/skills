---
name: fingerprint-one-per-device
description: Allow something once per device using the Fingerprint visitor_id — stop coupon abuse and repeated promo code redemptions, welcome bonus abuse, new account fraud and free trial abuse (multi-accounting), and duplicate survey responses. Use when the user wants one signup, one redemption, one bonus, one vote, or one submission per device, or names one of those use cases.
---

# Fingerprint — One per device

**Goal.** Let a device claim a thing once. Email addresses are free and cookies are disposable;
`visitor_id` is the identifier that stays the same when the same person comes back with a new
email in a fresh incognito window.

**When to use.** Coupon and promo codes, welcome and signup bonuses, free trials and account
creation limits, surveys, polls, votes, giveaways, referral rewards.

> Docs: https://docs.fingerprint.com/docs/coupon-abuse-use-case-tutorial ·
> https://docs.fingerprint.com/docs/new-account-fraud-use-case-tutorial ·
> https://docs.fingerprint.com/docs/bonus-abuse-use-case-tutorial

## Prerequisite
`fingerprint-protect-action` has run and returned `visitorId`. Start from there.

## The logic
1. **Look up** whether a row already exists for this `visitorId` within the scope of the thing
   being claimed.
2. **If it exists**, either refuse the whole action or let it through without the perk.
3. **Otherwise record** `visitorId` on the thing and proceed.

Make the check and the insert atomic (a unique index plus insert-or-ignore, or a transaction) so
two parallel requests cannot both pass the lookup.

## Your data
Add a `visitorId` column to the thing being claimed, with a unique index over the scope:

```sql
-- per coupon code
CREATE TABLE redemptions (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL,
  visitorId TEXT NOT NULL, createdAt INTEGER NOT NULL);
CREATE UNIQUE INDEX redemptions_once ON redemptions (code, visitorId);

-- global: one account per device
ALTER TABLE accounts ADD COLUMN visitorId TEXT;
CREATE UNIQUE INDEX accounts_once ON accounts (visitorId);
```

## Variants (tutorial defaults)
| Use case | Scope | On repeat | Also matches on |
| --- | --- | --- | --- |
| Coupon abuse | per coupon `code` | refuse: "Coupon has already been redeemed." | — |
| New account fraud | global, one account per device | refuse with the generic signup failure | — |
| Bonus abuse | global, one bonus per device | **degrade**: create the account, withhold the bonus. A high Suspect Score also withholds the bonus instead of blocking signup | — |
| Survey fraud | per survey | refuse: "Duplicate survey submission." | `email` **or** `visitorId` |

The bonus-abuse variant is the one to copy when blocking would cost you real customers: the
`bonusGranted` flag is only set when the bonus was actually paid, so a withheld bonus does not
block a later legitimate claim from the same device.

## Reference
`snippets/one-per-device.js`:
```js
const once = oncePerDevice(store, { key: 'redemptions', scope: 'code' })
if (await once.claimed(visitorId, coupon.code)) return res.json({ success: false, error: 'Coupon has already been redeemed.' })
await once.claim(visitorId, coupon.code)
```
`scope` is the column that narrows the uniqueness (omit for global). `store` is `exists` and
`insert` over your database; the snippet includes a SQLite implementation.

## Notes
- Record the claim when the perk is actually granted, not during validation. The coupon tutorial
  records at validation time; if checkout later fails, the customer has lost the code.
- Keep the error message for "already claimed" if the user is legitimate (a customer retrying a
  coupon); use the generic failure where a distinct message helps an attacker (signup).
- Where you also want one per person, match on your identifier **or** `visitorId` as the survey
  tutorial does, not **and**: an attacker changes the email, not the device.
- A device that was blocked by the gate never reaches this check; a device that passed the gate
  and already claimed is a repeat, not a bot. Treat the two differently in logs.

## Verify
- Claim once from your browser: granted. Claim again, with a different email: refused or
  degraded.
- Open an incognito window and claim: still refused, same `visitorId`.
- Reset the demo data and claim: granted again.
