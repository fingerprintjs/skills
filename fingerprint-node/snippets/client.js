// Load .env before reading any keys (order-independent: this runs when the module is required).
require('dotenv').config()

// Create one client at startup. Region MUST match your workspace or lookups fail — map it
// from FINGERPRINT_REGION ('us' | 'eu' | 'ap'), don't hardcode.
const { FingerprintServerApiClient, Region } = require('@fingerprint/node-sdk')

const REGIONS = { us: Region.Global, eu: Region.EU, ap: Region.AP }

// Optional: route the Server API at a non-default host (e.g. staging) via FINGERPRINT_SERVER_API_URL.
// The SDK has no endpoint option, so we override its fetch and swap the host (keeping the path).
const apiBase = process.env.FINGERPRINT_SERVER_API_URL
const fetchImpl = apiBase
  ? (input, init) => {
      const u = new URL(typeof input === 'string' ? input : input.url)
      return fetch(new URL(u.pathname + u.search, apiBase), init)
    }
  : undefined

const fingerprint = new FingerprintServerApiClient({
  apiKey: process.env.FINGERPRINT_SECRET_API_KEY,
  region: REGIONS[process.env.FINGERPRINT_REGION] ?? Region.Global,
  ...(fetchImpl ? { fetch: fetchImpl } : {}),
})

module.exports = { fingerprint }
