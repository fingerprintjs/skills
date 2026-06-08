// Create one client at startup. Region must match your workspace: Region.Global | Region.EU | Region.AP.
const { FingerprintServerApiClient, Region } = require('@fingerprint/node-sdk')

const fingerprint = new FingerprintServerApiClient({
  apiKey: process.env.FINGERPRINT_SECRET_API_KEY,
  region: Region.Global,
})

module.exports = { fingerprint }
