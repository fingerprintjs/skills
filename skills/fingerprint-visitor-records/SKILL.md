---
name: fingerprint-visitor-records
description: Store the Fingerprint visitor_id on your own records so you can act on device history later — enforce bans so banned users, sellers, or players cannot return with a new account (ban enforcement, device ban, blocklist, denylist), and keep device evidence to link purchases and fight chargeback disputes and friendly fraud. Use when the user mentions banning, blocking a returning user, a denylist, chargebacks, disputes, or linking orders to a device.
---

# Fingerprint — Visitor records

**Goal.** Put the server-verified `visitor_id` on every record that matters (listing, order,
purchase, post, account) at write time. Later you can refuse a device you banned, and you can
pull every record the same device produced when a dispute lands.

**When to use.** Marketplaces and communities that ban sellers or users; any merchant handling
chargebacks; moderation tooling that needs "show me everything this device did".

> Docs: https://docs.fingerprint.com/docs/ban-enforcement-use-case-tutorial ·
> https://docs.fingerprint.com/docs/chargeback-dispute-use-case-tutorial

## Prerequisite
A backend that calls `getEvent(eventId)` and reads `event.identification.visitor_id`. Ban
enforcement runs the Suspect Score part of `fingerprint-protect-action` and skips the bot check in
the tutorial; chargeback evidence runs no gate at all, since every purchase is recorded and the
decision happens later.

## The logic
**At write time** (listing posted, purchase completed):
1. Read `visitorId` from the verified event.
2. *Ban enforcement*: refuse when `visitorId` is in `banned_visitors`.
3. Store `visitorId` on the record.

**At ban time** (moderator action): look up the record's `visitorId`, insert it into
`banned_visitors`. The ban follows the device, not the email.

**At dispute time**: load the disputed order, then select every order with the same `visitorId`
**or** the same email, newest first. A device with a history of completed, undisputed purchases
to the same address is the evidence that the cardholder did buy.

## Your data
```sql
ALTER TABLE listings  ADD COLUMN visitorId TEXT;     -- or orders / purchases / posts
CREATE INDEX listings_visitor ON listings (visitorId);

CREATE TABLE banned_visitors (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  visitorId TEXT    NOT NULL UNIQUE,
  reason    TEXT,
  bannedAt  INTEGER NOT NULL
);

-- chargeback evidence
ALTER TABLE purchases ADD COLUMN visitorId TEXT;
ALTER TABLE purchases ADD COLUMN chargeback INTEGER NOT NULL DEFAULT 0;
```

## Reference
`snippets/visitor-records.js`:
```js
const records = visitorRecords(store)
if (await records.isBanned(visitorId)) return res.json({ success: false, message: 'You are banned from posting listings.' })
await store.insert('listings', { ...listing, visitorId })
// moderator:  await records.ban(visitorId, 'spam listings')
// dispute:    const related = await records.related('purchases', { visitorId, email })
```

## Notes
- Store the `visitorId` from `getEvent`, never one the browser sent; a stored client value is
  worthless as evidence and trivial to forge.
- Bans are a denylist, so keep them small and reviewable: record `reason` and `bannedAt`, and
  give moderators an unban path. `visitor_id` is stable, but a shared family computer is one
  device.
- For evidence, also keep the `event_id`. The full event (IP, geolocation, browser, signals) is
  retrievable from the Server API and from the dashboard Events page for as long as your data
  retention allows, and is what a dispute response wants attached.
- Ban enforcement also belongs in the Rules Engine as a condition on the Visitor ID
  (`fingerprint-rules-engine`), which blocks the device before it reaches your server.

## Verify
- Post a listing, ban it from the admin view, then post again from the same browser: refused.
- Open an incognito window and post: still refused, same `visitorId`.
- Complete two purchases, mark one as a chargeback, open the dispute view: both purchases are
  listed together under the same `visitorId`.
