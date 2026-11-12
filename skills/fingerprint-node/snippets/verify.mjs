import { fingerprint } from './client.mjs'

const MAX_AGE_MS = 2 * 60 * 1000
const MIN_CONFIDENCE = 0.9

export async function verifyEvent(eventId) {
  if (!eventId) return { ok: false, reason: 'missing_event_id' }

  let event
  try {
    event = await fingerprint.getEvent(eventId)
  } catch {
    return { ok: false, reason: 'lookup_failed' }
  }

  const id = event.identification
  if (!id?.visitor_id) return { ok: false, reason: 'not_found' }

  if (event.replayed) return { ok: false, reason: 'replayed' }
  if (Date.now() - event.timestamp > MAX_AGE_MS) return { ok: false, reason: 'stale' }

  if ((id.confidence?.score ?? 0) < MIN_CONFIDENCE) return { ok: false, reason: 'low_confidence' }

  if (event.bot && event.bot !== 'not_detected') return { ok: false, reason: 'bot' }
  if (event.vpn || event.proxy) return { ok: false, reason: 'anonymizing_network' }
  if (event.tampering) return { ok: false, reason: 'tampering' }

  return { ok: true, visitorId: id.visitor_id }
}

// Wire this into one sensitive endpoint first (login), then the others (signup, password reset,
// checkout, coupon redemption) — see routes.js / routes.mjs for the Express middleware and routes.
