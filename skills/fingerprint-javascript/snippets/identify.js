// src/main.js — identify the visitor. Each get() call is a billable identification event,
// so call it where you need the result (on load, or on an action) rather than on every render.
// For a backend-verified flow, call it in the submit handler of the login form first and send the
// event_id with that request; once it works, do the same on signup, checkout and coupon forms.
import { fp } from './fingerprint.js'
import { isFingerprintError } from '@fingerprint/agent'

try {
  const { visitor_id, event_id } = await fp.get()
  console.log('visitor_id:', visitor_id)
  console.log('event_id:', event_id)
} catch (error) {
  // Ad blockers, offline, timeouts. Don't block the UI on identification.
  if (isFingerprintError(error)) console.warn('Fingerprint failed:', error.code)
}
