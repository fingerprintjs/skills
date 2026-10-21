// app/api/login/route.ts — look up the event_id, run the handler as before, return the signals.
import { verifyEvent } from '@/lib/fingerprint-server'

export async function POST(request: Request) {
  const { username, password, eventId } = await request.json()

  const fingerprint = await verifyEvent(eventId)
  console.log('[fingerprint]', fingerprint)

  // ...run login as before...
  return Response.json({ ok: true, fingerprint })
}
