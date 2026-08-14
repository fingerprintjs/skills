// ESM version (package.json has "type": "module"). For CommonJS, see client.js.
//
// The .env load must be the FIRST import, not a call in the body: ESM evaluates every import — in
// source order — before any statement in the file runs. A `dotenv.config()` line below would
// therefore execute after the SDK import and after the client is built, and any module that imports
// this one would evaluate it earlier still. Getting this wrong fails at startup with
// "Api key is not set".
import 'dotenv/config'
import { FingerprintServerApiClient, Region } from '@fingerprint/node-sdk'

// Region MUST match your workspace or lookups fail — map it from FINGERPRINT_REGION
// ('us' | 'eu' | 'ap'), don't hardcode.
const REGIONS = { us: Region.Global, eu: Region.EU, ap: Region.AP }

export const fingerprint = new FingerprintServerApiClient({
  apiKey: process.env.FINGERPRINT_SECRET_API_KEY,
  region: REGIONS[process.env.FINGERPRINT_REGION] ?? Region.Global,
})
