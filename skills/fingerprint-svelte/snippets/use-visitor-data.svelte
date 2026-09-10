<!-- Identify at the moment of a sensitive action, rather than on mount. -->
<script>
  import { useVisitorData } from '@fingerprint/svelte'

  // immediate: false → don't identify on mount; only when we call getData()
  const { isLoading, error, getData } = useVisitorData({ immediate: false })

  async function handleSubmit() {
    // Each getData() call is a billable identification event, so call it on the action you care
    // about. It returns { visitor_id, event_id, ... }.
    const { visitor_id, event_id } = await getData()
    console.log('visitor_id:', visitor_id, 'event_id:', event_id)

    // Identification alone is a hint, not a trust decision: anything from the browser can be
    // forged. If this app has a backend, that is where the single-use `event_id` goes — send it
    // alongside the request and verify it there with the Server API (`fingerprint-node` /
    // `fingerprint-python`), then act on the verified result. Never send `visitor_id` as proof.
  }
</script>

<!-- ...form whose submit calls handleSubmit; disable it while $isLoading, surface $error... -->
