---
name: fingerprint-device-account-binding
description: Remember which devices belong to which account using the Fingerprint visitor_id — stop account takeover (ATO) by stepping up or refusing logins from an unknown device, and stop account sharing by capping how many devices can use one paid account. Use when the user mentions account takeover, credential theft, unknown or new device login, MFA on new devices, trusted devices, account sharing, password sharing, or concurrent device limits.
---

# Fingerprint — Bind devices to accounts

**Goal.** A correct password is no longer proof of identity. Record the `visitor_id` of each
device that has legitimately used an account, then treat a login from a device the account has
never seen as a different situation from a login from a known one.

**When to use.** Login, password reset, email or phone change, and any "sensitive settings"
action. Two outcomes from one table:
- **Account takeover**: an unknown device must step up (MFA, email OTP) or is refused.
- **Account sharing**: an account may be used from at most N devices.

> Docs: https://docs.fingerprint.com/docs/account-takeover-use-case-tutorial ·
> https://docs.fingerprint.com/docs/account-sharing-use-case-tutorial

## Prerequisite
`fingerprint-protect-action` has run and returned `visitorId`. Identify on the login action with
`linkedId: <accountId>` (`fingerprint-tagging`) so Fingerprint's `velocity` counters group by
account as well as by device.

## The logic
1. **Check the password first.** Device checks run only for a valid credential, or you leak which
   accounts exist. (The ATO tutorial rate-limits failed attempts per device before the password
   check; that part is `fingerprint-velocity-limits`.)
2. **Load the devices bound to this account.**
3. **First ever login** for the account: bind this `visitorId` and allow. The first device is the
   baseline.
4. **Known device**: allow.
5. **Unknown device**:
   - *Takeover mode*: step up. On success, bind the device. If you cannot step up, refuse and
     notify the account owner.
   - *Sharing mode*: refuse when the account already has `maxDevices` bound; otherwise bind and
     allow. Let the owner unbind devices from account settings, or bindings go stale.
6. **Raise the bar on signals** even for known devices: `vpn`, `proxy`, any `ip_blocklist` flag,
   `tampering`, or a `velocity` spike (many devices on one `linked_id`) turns allow into step up.

## Your data
```sql
CREATE TABLE account_devices (
  accountId TEXT    NOT NULL,
  visitorId TEXT    NOT NULL,
  createdAt INTEGER NOT NULL,
  lastSeenAt INTEGER NOT NULL,
  PRIMARY KEY (accountId, visitorId)
);
```
The account-sharing tutorial uses `email` as the primary key alone, which caps the account at
one device. Use the composite key above and a `maxDevices` setting instead; it covers both use
cases and lets you offer "up to 3 devices" plans.

## Variants (tutorial defaults)
| Use case | Unknown device | Known device | Cap |
| --- | --- | --- | --- |
| Account takeover | tutorial: refuse unless the account has never logged in; production: step up, then bind | allow | none |
| Account sharing | refuse: "You can only access this account from one device." | allow | 1 (tutorial); make it a plan setting |

## Reference
`snippets/device-binding.js`:
```js
const devices = deviceBinding(store, { maxDevices: 1 })           // sharing
const devices = deviceBinding(store, { mode: 'step-up' })          // takeover
const d = await devices.check(accountId, visitorId, { riskSignals: softRisk(event) })
// d.outcome: 'allow' | 'step_up' | 'block'; call devices.bind(accountId, visitorId) after step-up succeeds
```

## Notes
- Bind only after a trusted login (password **and** step-up, where one was required). Binding on
  a failed step-up turns the attacker's device into a known one.
- Expire bindings not seen for a long period (90 days is common), and unbind on password reset.
- Expose the device list to the user. "Log out other devices" is both a feature and your unbind
  path.
- Use the generic failure message for refused logins; the sharing tutorial's explicit message is
  fine there because the user is a paying customer, not an attacker.

## Verify
- Log in from your browser: first login binds, allow.
- Log in from an incognito window: unknown device. Takeover mode steps up; sharing mode with
  `maxDevices: 1` refuses.
- Complete the step-up, then log in again from that window: known, allow.
