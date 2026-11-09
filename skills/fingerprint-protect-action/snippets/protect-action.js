// Per-action protection: the gate every Fingerprint use-case runs before its own logic.
// Stack-agnostic Node; `client` is a FingerprintServerApiClient (see fingerprint-node).
//
//   const result = await protectAction(client, req.body.eventId, { route: 'action' })
//   if (result.outcome === 'block') return res.json({ success: false, error: 'Login failed.' })
//   const { visitorId, event } = result  // continue into the action

const SUSPECT_SCORE_THRESHOLD = Number(process.env.FINGERPRINT_SUSPECT_SCORE_THRESHOLD ?? 20)

/**
 * @param {object} client - Fingerprint Server API client
 * @param {string} eventId - the single-use event_id the browser sent
 * @param {object} [opts]
 * @param {'action'|'content'} [opts.route='action'] - 'action' rejects every bot; 'content' lets
 *   verified / signed crawlers through and rejects only bad or spoofed bots
 * @param {'block'|'degrade'} [opts.onSuspect='block'] - what a high Suspect Score does
 * @param {number} [opts.threshold]
 */
async function protectAction(client, eventId, opts = {}) {
  const { route = 'action', onSuspect = 'block', threshold = SUSPECT_SCORE_THRESHOLD } = opts
  if (!eventId) return { outcome: 'block', reason: 'missing_event_id' }

  let event
  try {
    event = await client.getEvent(eventId)
  } catch {
    return { outcome: 'block', reason: 'lookup_failed' } // fail closed
  }

  const visitorId = event.identification?.visitor_id
  if (!visitorId) return { outcome: 'block', reason: 'not_found' }
  if (event.replayed) return { outcome: 'block', reason: 'replayed' }

  // Bot check. `event.bot` is absent when Bot Detection is not enabled on the workspace.
  if (event.bot === undefined) console.warn('fingerprint: event.bot missing — enable Bot Detection')
  const botReason = botCheck(event, route)
  if (botReason) return { outcome: 'block', reason: botReason, visitorId, event }

  // Suspect Score: sum of the weights of every Smart Signal that fired. Missing means 0.
  const score = event.suspect_score ?? 0
  const suspect = score > threshold
  if (suspect && onSuspect === 'block') {
    return { outcome: 'block', reason: `suspect_score:${score}`, visitorId, event, score }
  }

  return { outcome: 'allow', visitorId, event, score, suspect }
}

function botCheck(event, route) {
  const info = event.bot_info
  if (route === 'content') {
    // Content routes are crawled on purpose: block automation and impersonators, keep crawlers.
    if (event.bot === 'bad') return `bot:${info?.category ?? 'automation'}`
    if (info?.identity === 'spoofed') return `spoofed_bot:${info.name}`
    return null
  }
  // Action routes: nothing automated belongs here, including good bots.
  if (event.bot && event.bot !== 'not_detected') return `bot:${info?.category ?? event.bot}`
  return null
}

module.exports = { protectAction, SUSPECT_SCORE_THRESHOLD }
