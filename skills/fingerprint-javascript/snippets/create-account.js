// src/main.js — identify at the moment of a sensitive action and send event_id to the backend.
import { fp } from './fingerprint.js'
import { isFingerprintError } from '@fingerprint/agent'

const usernameInput = document.getElementById('username')
const passwordInput = document.getElementById('password')

document.getElementById('create-account-btn').addEventListener('click', async () => {
  let eventId = null

  try {
    // Only call get() when you actually need it — each call is a billable identification event.
    const result = await fp.get()
    eventId = result.event_id
  } catch (error) {
    // Ad blockers, offline, timeouts. Don't break the flow — let the server decide
    // how to treat a request with no identification.
    if (isFingerprintError(error)) console.warn('Fingerprint failed:', error.code)
  }

  await fetch('/api/create-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: usernameInput.value,
      password: passwordInput.value,
      event_id: eventId,
    }),
  })
})
