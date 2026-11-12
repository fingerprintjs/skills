// Express — the gate on each sensitive endpoint. Wire one first (login), verify, then add the rest.
// (CommonJS; see routes.mjs for ESM.)
const express = require('express')
const { verifyEvent } = require('./verify')

// Middleware: verify the event_id the frontend sent with this request. On success the trusted
// visitor_id is on req.fingerprint; on failure the request is rejected and the handler never runs.
// verifyEvent never throws (lookup errors come back as { ok: false }), so no try/catch is needed.
async function requireVerifiedEvent(req, res, next) {
  const check = await verifyEvent(req.body?.eventId)
  if (!check.ok) return res.status(403).json({ error: 'blocked', reason: check.reason })
  req.fingerprint = { visitorId: check.visitorId }
  next()
}

const router = express.Router()
router.use(express.json())

// Start with the one the user wants to see first (login), then offer the others that exist in the
// app. Route names differ per codebase — a login can be POST /sessions and a signup POST /users —
// so match on what the handler does.

router.post('/api/login', requireVerifiedEvent, async (req, res) => {
  const { visitorId } = req.fingerprint
  // ...check credentials. Bind visitorId to the account on its first trusted login; when the
  // account has never been seen from this visitorId, step up (email / OTP) instead of letting it in.
  res.json({ ok: true })
})

router.post('/api/signup', requireVerifiedEvent, async (req, res) => {
  const { visitorId } = req.fingerprint
  // ...refuse (or flag for review) when an account already exists for visitorId, then create the
  // account and store visitorId on it.
  res.status(201).json({ ok: true })
})

router.post('/api/password-reset', requireVerifiedEvent, async (req, res) => {
  const { visitorId } = req.fingerprint
  // ...cap reset / OTP sends per visitorId (e.g. 5 per 24 h), then send.
  res.json({ ok: true })
})

router.post('/api/checkout', requireVerifiedEvent, async (req, res) => {
  const { visitorId } = req.fingerprint
  // ...cap orders per visitorId per day (card testing), store visitorId on the order (chargeback
  // evidence), then charge.
  res.json({ ok: true })
})

router.post('/api/coupons/redeem', requireVerifiedEvent, async (req, res) => {
  const { visitorId } = req.fingerprint
  // ...refuse when this visitorId already redeemed req.body.code, then apply the coupon.
  res.json({ ok: true })
})

module.exports = { router, requireVerifiedEvent }
