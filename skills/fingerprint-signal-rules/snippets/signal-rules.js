// Signal rules: one small function per scenario over the server-verified event from getEvent().
// Each returns { ok, reason?, message? }. Compose them after protectAction() has passed.

const geo = (event) => event.ip_info?.v4?.geolocation ?? event.ip_info?.v6?.geolocation ?? {}
const ipInfo = (event) => event.ip_info?.v4 ?? event.ip_info?.v6 ?? {}

// Regional pricing / local discount: VPN hides the country, so no discount behind one.
function regionalDiscount(event, { allowedCountries }) {
  if (event.vpn) return { ok: false, reason: 'vpn', message: 'Turn off your VPN to use a local discount.' }
  const country = geo(event).country_code
  if (!country || !allowedCountries.includes(country)) {
    return { ok: false, reason: `country:${country ?? 'unknown'}`, message: 'No discount available for your location.' }
  }
  return { ok: true, country }
}

// Geo restriction / compliance: block the country and everything that hides a country.
function geoRestrict(event, { blockedCountries }) {
  const country = geo(event).country_code
  if (country && blockedCountries.includes(country)) return { ok: false, reason: `country:${country}` }
  if (event.vpn) return { ok: false, reason: `vpn:${event.vpn_origin_country ?? 'unknown_origin'}` }
  if (event.proxy) return { ok: false, reason: 'proxy' }
  if (event.ip_blocklist?.tor_node) return { ok: false, reason: 'tor' }
  return { ok: true, country }
}

// Timezone mismatch: a risk signal, never a block on its own.
function timezoneMismatch(event) {
  const method = event.vpn_methods?.timezone_mismatch
  if (method !== undefined) return { ok: !method, reason: method ? 'timezone_mismatch' : undefined }
  const device = event.raw_device_attributes?.timezone
  const ip = geo(event).timezone
  if (device && ip && device !== ip) return { ok: false, reason: `timezone:${device}!=${ip}` }
  return { ok: true }
}

// Datacenter / hosting traffic: block on write actions.
function datacenterTraffic(event) {
  const ip = ipInfo(event)
  if (ip.datacenter_result || ip.asn_type === 'hosting') {
    return { ok: false, reason: `datacenter:${ip.datacenter_name ?? ip.asn_name ?? 'unknown'}` }
  }
  return { ok: true }
}

function knownBadIp(event) {
  const b = event.ip_blocklist ?? {}
  const flags = ['attack_source', 'email_spam', 'tor_node'].filter((k) => b[k])
  return flags.length ? { ok: false, reason: `ip_blocklist:${flags.join(',')}` } : { ok: true }
}

// Anti-detect browser: block when confidence is high or the anti-detect flag is set.
function antiDetectBrowser(event) {
  if (!event.tampering) return { ok: true }
  const hard = event.tampering_confidence === 'high' || event.tampering_details?.anti_detect_browser
  return hard ? { ok: false, reason: 'anti_detect_browser' } : { ok: true, reason: 'tampering_low' }
}

// Mobile app integrity: fail closed in apps that move money.
function mobileIntegrity(event) {
  const flags = ['jailbroken', 'root_apps', 'frida', 'emulator', 'simulator', 'cloned_app', 'mitm_attack'].filter((k) => event[k])
  return flags.length ? { ok: false, reason: `device_integrity:${flags.join(',')}` } : { ok: true }
}

// New vs returning device: higher risk on checkout/login when never seen before.
function newDevice(event, { minAgeMs = 24 * 60 * 60 * 1000 } = {}) {
  const id = event.identification ?? {}
  if (id.visitor_found === false) return { ok: false, reason: 'first_seen' }
  // first_seen_at is Unix ms in the Node SDK event.
  if (id.first_seen_at && Date.now() - id.first_seen_at < minAgeMs) return { ok: false, reason: 'seen_recently' }
  return { ok: true }
}

// Burst detection with Fingerprint's own counters; no table needed. Thresholds are examples.
function burst(event, { events5m = 20, distinctIp24h = 5, devicesPerAccount24h = 3 } = {}) {
  const v = event.velocity ?? {}
  const reasons = []
  if ((v.events?.['5_minutes'] ?? 0) > events5m) reasons.push('events_5m')
  if ((v.distinct_ip?.['24_hours'] ?? 0) > distinctIp24h) reasons.push('distinct_ip_24h')
  if ((v.distinct_country?.['1_hour'] ?? 0) > 1) reasons.push('distinct_country_1h')
  if ((v.distinct_visitor_id_by_linked_id?.['24_hours'] ?? 0) > devicesPerAccount24h) reasons.push('devices_per_account_24h')
  return reasons.length ? { ok: false, reason: reasons.join(',') } : { ok: true }
}

module.exports = {
  regionalDiscount, geoRestrict, timezoneMismatch, datacenterTraffic, knownBadIp,
  antiDetectBrowser, mobileIntegrity, newDevice, burst,
}
