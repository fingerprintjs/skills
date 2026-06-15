// app/api/login/route.ts — verify the event_id before running the sensitive handler.
import { verifyEvent } from '@/lib/fingerprint-server'

export async function POST(request: Request) {
  const { username, password, eventId } = await request.json()

  const check = await verifyEvent(eventId)
  if (!check.ok) {
    return Response.json({ error: 'blocked', reason: check.reason }, { status: 403 })
  }

  // ...proceed; bind check.visitorId to the account, then run login...
  return Response.json({ ok: true })
}
