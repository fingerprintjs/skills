// A client component: identify at the moment of a sensitive action and send event_id to the
// server. immediate: false → don't identify on mount; only when we call getData().
'use client'

import { useVisitorData } from '@fingerprint/react'

export function LoginForm() {
  const { getData } = useVisitorData({ immediate: false })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { event_id } = await getData()

    // Send the event_id (single-use, server-verifiable) — not the visitor_id.
    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, eventId: event_id }),
    })
  }

  return /* ...form... */ null
}
