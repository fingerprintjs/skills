// lib/fingerprint-server.ts — server-only Fingerprint client + verification helper.
// Imported only from Route Handlers / Server Actions, never from a 'use client' file.
// Next.js auto-loads .env.local, so no dotenv. Region MUST match your workspace or lookups fail —
// map it from FINGERPRINT_REGION ('us' | 'eu' | 'ap'), don't hardcode.
import 'server-only'
import { FingerprintServerApiClient, Region } from '@fingerprint/node-sdk'

const REGIONS: Record<string, Region> = {
  us: Region.Global,
  eu: Region.EU,
  ap: Region.AP,
}

const fingerprint = new FingerprintServerApiClient({
  apiKey: process.env.FINGERPRINT_SECRET_API_KEY!,
  region: REGIONS[process.env.FINGERPRINT_REGION ?? 'us'] ?? Region.Global,
})

const MAX_AGE_MS = 2 * 60 * 1000 // reject identifications older than 2 minutes (replay protection)
const MIN_CONFIDENCE = 0.9 // minimum identification confidence to trust the action

export type VerifyResult =
  | { ok: true; visitorId: string }
  | { ok: false; reason: string }

export async function verifyEvent(eventId?: string): Promise<VerifyResult> {
  if (!eventId) return { ok: false, reason: 'missing_event_id' }

  let event
  try {
    event = await fingerprint.getEvent(eventId)
  } catch {
    return { ok: false, reason: 'lookup_failed' } // fail closed for sensitive actions
  }

  const id = event.identification
  if (!id?.visitor_id) return { ok: false, reason: 'not_found' }

  // Replay / freshness
  if (event.replayed) return { ok: false, reason: 'replayed' }
  if (Date.now() - event.timestamp > MAX_AGE_MS) return { ok: false, reason: 'stale' }

  // Identification confidence
  if ((id.confidence?.score ?? 0) < MIN_CONFIDENCE) return { ok: false, reason: 'low_confidence' }

  // Smart signals (fail closed for high-risk actions)
  if (event.bot && event.bot !== 'not_detected') return { ok: false, reason: 'bot' }
  if (event.vpn || event.proxy) return { ok: false, reason: 'anonymizing_network' }
  if (event.tampering) return { ok: false, reason: 'tampering' }

  return { ok: true, visitorId: id.visitor_id }
}
