// app/actions.ts — the same verification from Server Actions instead of Route Handlers. The client
// calls an action and passes the event_id from getData() as an argument. Start with login; once it
// works, offer the same for the other sensitive actions the app has.
'use server'

import { verifyEvent } from '@/lib/fingerprint-server'

type ActionResult = { ok: true } | { ok: false; reason: string }

export async function login(formData: FormData, eventId: string): Promise<ActionResult> {
  const check = await verifyEvent(eventId)
  if (!check.ok) return { ok: false, reason: check.reason }
  // ...check credentials. Bind check.visitorId to the account on its first trusted login; when the
  // account has never been seen from this visitorId, step up (email / OTP) instead of letting it in.
  return { ok: true }
}

export async function signup(formData: FormData, eventId: string): Promise<ActionResult> {
  const check = await verifyEvent(eventId)
  if (!check.ok) return { ok: false, reason: check.reason }
  // ...refuse (or flag for review) when an account already exists for check.visitorId, then create
  // the account and store the visitorId on it.
  return { ok: true }
}

export async function requestPasswordReset(formData: FormData, eventId: string): Promise<ActionResult> {
  const check = await verifyEvent(eventId)
  if (!check.ok) return { ok: false, reason: check.reason }
  // ...cap reset / OTP sends per check.visitorId (e.g. 5 per 24 h), then send.
  return { ok: true }
}

export async function checkout(formData: FormData, eventId: string): Promise<ActionResult> {
  const check = await verifyEvent(eventId)
  if (!check.ok) return { ok: false, reason: check.reason }
  // ...cap orders per check.visitorId per day (card testing), store the visitorId on the order
  // (chargeback evidence), then charge.
  return { ok: true }
}

export async function redeemCoupon(formData: FormData, eventId: string): Promise<ActionResult> {
  const check = await verifyEvent(eventId)
  if (!check.ok) return { ok: false, reason: check.reason }
  // ...refuse when check.visitorId already redeemed the code, then apply the coupon.
  return { ok: true }
}
