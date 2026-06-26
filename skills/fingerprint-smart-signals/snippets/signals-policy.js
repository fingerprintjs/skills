// Compose Smart Signals into a per-action policy. Returns a decision: 'allow' | 'step_up' | 'block'.
// Run this on the *verified* event from getEvent(eventId) — never on client-reported values.

function evaluateSignals(event, { risk = 'high' } = {}) {
  const reasons = []

  // Hard blocks — reject regardless of action risk.
  if (event.bot && event.bot !== 'not_detected') reasons.push('bot')
  if (event.tampering) reasons.push('tampering')
  if (reasons.length) return { decision: 'block', reasons }

  // Anonymizing network / known-bad IP — block for high-risk, step-up otherwise.
  const networkFlags = []
  if (event.vpn) networkFlags.push('vpn')
  if (event.proxy) networkFlags.push('proxy')
  // ip_blocklist is an object of flags, always present — check the sub-fields, not truthiness.
  const ipbl = event.ip_blocklist
  if (ipbl && (ipbl.attack_source || ipbl.email_spam || ipbl.tor_node)) networkFlags.push('ip_blocklist')
  if (networkFlags.length) {
    return risk === 'high'
      ? { decision: 'block', reasons: networkFlags }
      : { decision: 'step_up', reasons: networkFlags }
  }

  // Soft signals — score but don't block on their own.
  const soft = []
  if (event.incognito) soft.push('incognito')
  if (event.location_spoofing) soft.push('location_spoofing')
  if (event.virtual_machine) soft.push('virtual_machine')
  if ((event.suspect_score ?? 0) > 0) soft.push(`suspect_score=${event.suspect_score}`)
  if (soft.length && risk === 'high') return { decision: 'step_up', reasons: soft }

  return { decision: 'allow', reasons: soft }
}

module.exports = { evaluateSignals }
