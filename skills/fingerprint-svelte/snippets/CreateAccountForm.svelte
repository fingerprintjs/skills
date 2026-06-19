<!-- Identify at the moment of a sensitive action and send event_id to the backend. -->
<script>
  import { useVisitorData } from '@fingerprint/svelte'

  let username = $state('')
  let password = $state('')

  // immediate: false → don't identify on mount; only when we call getData()
  const { isLoading, getData } = useVisitorData({ immediate: false })

  async function handleSubmit() {
    const { event_id } = await getData()

    await fetch('/api/create-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, eventId: event_id }),
    })
  }
</script>

<!-- ...form bound to username/password, submit calls handleSubmit; disable while $isLoading... -->
