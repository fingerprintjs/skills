// app/actions.ts — same lookup from a Server Action instead of a Route Handler.
// The client calls this action and passes the event_id from getData() as an argument.
'use server'

import { verifyEvent } from '@/lib/fingerprint-server'

export async function login(formData: FormData, eventId: string) {
  const fingerprint = await verifyEvent(eventId)
  console.log('[fingerprint]', fingerprint)

  // ...run login as before...
  return { ok: true as const, fingerprint }
}
