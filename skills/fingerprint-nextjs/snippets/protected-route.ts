// lib/protected-route.ts — wraps a sensitive Route Handler so it verifies the event_id first.
// Imported only from Route Handlers, never from a 'use client' file.
import 'server-only'
import { verifyEvent } from '@/lib/fingerprint-server'

type ProtectedHandler<Body> = (ctx: { body: Body; visitorId: string; request: Request }) => Promise<Response>

export function withVerifiedEvent<Body extends { eventId?: string }>(handler: ProtectedHandler<Body>) {
  return async function POST(request: Request): Promise<Response> {
    const body = (await request.json()) as Body
    const check = await verifyEvent(body.eventId)
    if (!check.ok) {
      return Response.json({ error: 'blocked', reason: check.reason }, { status: 403 })
    }
    return handler({ body, visitorId: check.visitorId, request })
  }
}
