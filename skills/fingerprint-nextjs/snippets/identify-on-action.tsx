// Client components: identify at the moment of a sensitive action and send the event_id to the
// server. One hook, reused by each sensitive form. Wire the login form first; once the user has seen
// it work, offer signup, password reset, checkout and coupon redemption the same way.
'use client'

import { useVisitorData } from '@fingerprint/react'

// immediate: false → don't identify on mount; only when the action fires. Each getData() call is a
// billable identification event, so call it per action, not per render.
export function useProtectedPost() {
  const { getData } = useVisitorData({ immediate: false })

  return async function post(url: string, body: Record<string, unknown>) {
    let eventId: string | undefined
    try {
      eventId = (await getData()).event_id
    } catch {
      // Ad blocker, offline, timeout: send without an event_id and let the server decide. The
      // server-side check fails closed (missing_event_id → 403) — relax that for low-risk routes.
    }
    // Send the event_id (single-use, server-verifiable) — never the visitor_id.
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, eventId }),
    })
  }
}

export function LoginForm() {
  const post = useProtectedPost()
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    await post('/api/login', { username: form.get('username'), password: form.get('password') })
  }
  return /* ...form with name="username" / name="password", onSubmit={handleSubmit}... */ null
}

export function SignupForm() {
  const post = useProtectedPost()
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    await post('/api/signup', { email: form.get('email'), password: form.get('password') })
  }
  return /* ...form... */ null
}

export function CheckoutButton({ cartId }: { cartId: string }) {
  const post = useProtectedPost()
  return <button onClick={() => post('/api/checkout', { cartId })}>Pay</button>
}

export function CouponField() {
  const post = useProtectedPost()
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    await post('/api/coupons/redeem', { code: form.get('code') })
  }
  return /* ...form with name="code"... */ null
}
