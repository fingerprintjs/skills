<!-- Identify at the moment of a sensitive action and send event_id to the backend. -->
<script setup>
import { useVisitorData } from '@fingerprint/vue'

// immediate: false → don't identify on mount; only when we call getData()
const { getData } = useVisitorData({ immediate: false })

async function handleSubmit() {
  const { event_id } = await getData()

  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, eventId: event_id }),
  })
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <!-- ...form... -->
  </form>
</template>
