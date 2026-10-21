// Server-side verification of an event_id sent by the frontend. Returns a trust decision.
const { fingerprint } = require('./client')

const MAX_AGE_MS = 2 * 60 * 1000 // reject identifications older than 2 minutes (replay protection)
const MIN_CONFIDENCE = 0.9 // minimum identification confidence to trust the action
const ENFORCE_SIGNALS = false // log-only at first; set true once the warnings look right for your traffic

async function verifyEvent(eventId) {
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

  // Identification confidence and Smart Signals
  const flags = []
  if ((id.confidence?.score ?? 0) < MIN_CONFIDENCE) flags.push('low_confidence')
  if (event.bot && event.bot !== 'not_detected') flags.push('bot')
  if (event.vpn || event.proxy) flags.push('anonymizing_network')
  if (event.tampering) flags.push('tampering')
  if (flags.length) {
    if (ENFORCE_SIGNALS) return { ok: false, reason: flags.join(',') }
    console.warn(`[fingerprint] allowed despite: ${flags.join(', ')} (visitor ${id.visitor_id})`)
  }

  return { ok: true, visitorId: id.visitor_id, flags }
}

// Express usage:
//   app.post('/api/login', async (req, res) => {
//     const check = await verifyEvent(req.body.eventId)
//     if (!check.ok) {
//       console.warn(`[fingerprint] blocked: ${check.reason}`)
//       return res.status(403).json({ error: 'blocked', reason: check.reason })
//     }
//     // ...proceed; bind check.visitorId to the account...
//   })

module.exports = { verifyEvent }
