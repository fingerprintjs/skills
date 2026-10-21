// Server-side lookup of an event_id sent by the frontend. Returns what the Server API reports and
// rejects nothing — which signals should stop an action is up to the use-case skills.
const { fingerprint } = require('./client')

async function verifyEvent(eventId) {
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

// Express usage — run the action as before and hand the signals to the frontend:
//   app.post('/api/login', async (req, res) => {
//     const fingerprint = await verifyEvent(req.body.eventId)
//     console.log('[fingerprint]', fingerprint)
//     // ...run login as before...
//     res.json({ ...result, fingerprint })
//   })

module.exports = { verifyEvent }
