/* eslint-disable */
// @ts-nocheck
// Reference snippet: the two lines above keep the host repo's linter off this file. Drop them when copying.
// app/actions.ts — same verification from a Server Action instead of a Route Handler.
// The client calls this action and passes the event_id from getData() as an argument.
'use server'

import { verifyEvent } from '@/lib/fingerprint-server'

export async function login(formData: FormData, eventId: string) {
  const check = await verifyEvent(eventId)
  if (!check.ok) {
    return { ok: false as const, reason: check.reason }
  }

  // ...proceed; bind check.visitorId to the account, then run login...
  return { ok: true as const }
}
