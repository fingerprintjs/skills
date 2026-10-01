// Identify at the moment of a sensitive action, rather than on mount.
import { useVisitorData } from '@fingerprint/react'

function LoginForm() {
  // immediate: false → don't identify on mount; only when we call getData()
  const { getData, isLoading } = useVisitorData({ immediate: false })

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      // Each getData() call is a billable identification event, so call it on the action you care
      // about. It returns { visitor_id, event_id, ... }.
      const { visitor_id, event_id } = await getData()
      console.log('visitor_id:', visitor_id, 'event_id:', event_id)
    } catch (error) {
      // Ad blockers, offline, timeouts. Don't block the UI on identification; let the action continue.
      console.warn('Fingerprint failed:', error)
    }

    // Identification alone is a hint, not a trust decision: anything from the browser can be
    // forged. If this app has a backend, that is where the single-use `event_id` goes — send it
    // alongside the request and verify it there with the Server API (`fingerprint-node` /
    // `fingerprint-python`), then act on the verified result. Never send `visitor_id` as proof.
  }

  return /* ...form; disable submit while isLoading... */ null
}
