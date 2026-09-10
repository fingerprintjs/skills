// CommonJS version (package.json has no "type": "module"). For ESM, see client.mjs — there the
// .env load must be the first import, and this ordering note does not apply.
//
// Load .env before reading any keys. `require` runs in place, so this line executes before the
// keys are read below.
require('dotenv').config()

// Create one client at startup. Region MUST match your workspace or lookups fail — map it
// from FINGERPRINT_REGION ('us' | 'eu' | 'ap'), don't hardcode.
const { FingerprintServerApiClient, Region } = require('@fingerprint/node-sdk')

const REGIONS = { us: Region.Global, eu: Region.EU, ap: Region.AP }

const fingerprint = new FingerprintServerApiClient({
  apiKey: process.env.FINGERPRINT_SECRET_API_KEY,
  region: REGIONS[process.env.FINGERPRINT_REGION] ?? Region.Global,
})

module.exports = { fingerprint }
