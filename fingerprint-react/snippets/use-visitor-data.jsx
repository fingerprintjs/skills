// Identify at the moment of a sensitive action and send event_id to the backend.
import { useVisitorData } from '@fingerprint/react'

function LoginForm() {
  // immediate: false → don't identify on mount; only when we call getData()
  const { getData } = useVisitorData({ immediate: false })

  async function handleSubmit(e) {
    e.preventDefault()
    const { event_id } = await getData()

    await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, eventId: event_id }),
    })
  }

  return /* ...form... */ null
}
