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

export type VerifyResult =
  | { error: string }
  | {
      visitorId?: string
      confidence?: number
      replayed?: boolean
      bot?: string
      botInfo?: unknown
      vpn?: boolean
      proxy?: boolean
      tampering?: boolean
      incognito?: boolean
      suspectScore?: number
    }

// Returns what the Server API reports and rejects nothing — which signals should stop an action is
// up to the use-case skills.
export async function verifyEvent(eventId?: string): Promise<VerifyResult> {
  if (!eventId) return { error: 'missing_event_id' }

  let event
  try {
    event = await fingerprint.getEvent(eventId)
  } catch {
    return { error: 'lookup_failed' } // usually a wrong secret key or region
  }

  return {
    visitorId: event.identification?.visitor_id,
    confidence: event.identification?.confidence?.score,
    replayed: event.replayed,
    bot: event.bot,
    botInfo: event.bot_info,
    vpn: event.vpn,
    proxy: event.proxy,
    tampering: event.tampering,
    incognito: event.incognito,
    suspectScore: event.suspect_score,
  }
}
