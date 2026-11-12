// Bind devices (visitorId) to accounts. One table serves account takeover and account sharing.
// `visitorId` comes from protectAction() (fingerprint-protect-action); run AFTER the password check.
//
//   const devices = deviceBinding(store, { mode: 'step-up' })           // account takeover
//   const devices = deviceBinding(store, { mode: 'cap', maxDevices: 1 }) // account sharing
//   const d = await devices.check(accountId, visitorId, { riskSignals: softRisk(event) })
//   if (d.outcome === 'block') return fail()
//   if (d.outcome === 'step_up') return requireOtp()  // then: await devices.bind(accountId, visitorId)

/**
 * @param {{ list(accountId): Promise<Array<{visitorId:string}>>, upsert(accountId, visitorId): Promise<void>, remove(accountId, visitorId): Promise<void> }} store
 * @param {{ mode?: 'step-up'|'cap', maxDevices?: number }} opts
 */
function deviceBinding(store, { mode = 'step-up', maxDevices = 1 } = {}) {
  return {
    async check(accountId, visitorId, { riskSignals = [] } = {}) {
      const bound = await store.list(accountId)
      const known = bound.some((d) => d.visitorId === visitorId)

      if (bound.length === 0) {
        await store.upsert(accountId, visitorId) // first device is the baseline
        return { outcome: riskSignals.length ? 'step_up' : 'allow', known: false, bound: 1 }
      }
      if (known) {
        await store.upsert(accountId, visitorId) // bumps lastSeenAt
        return { outcome: riskSignals.length ? 'step_up' : 'allow', known: true, bound: bound.length }
      }
      if (mode === 'cap') {
        if (bound.length >= maxDevices) return { outcome: 'block', known: false, bound: bound.length, reason: 'device_cap' }
        await store.upsert(accountId, visitorId)
        return { outcome: 'allow', known: false, bound: bound.length + 1 }
      }
      return { outcome: 'step_up', known: false, bound: bound.length, reason: 'unknown_device' }
    },
    bind: (accountId, visitorId) => store.upsert(accountId, visitorId),
    unbind: (accountId, visitorId) => store.remove(accountId, visitorId),
    list: (accountId) => store.list(accountId),
  }
}

// Soft risk from the verified event: turns 'allow' into 'step_up' even on a known device.
function softRisk(event) {
  const r = []
  if (event.vpn) r.push('vpn')
  if (event.proxy) r.push('proxy')
  if (event.tampering) r.push('tampering')
  const ipbl = event.ip_blocklist
  if (ipbl && (ipbl.attack_source || ipbl.email_spam || ipbl.tor_node)) r.push('ip_blocklist')
  // Many devices on one account (identify with linkedId = accountId for this to be populated).
  if ((event.velocity?.distinct_visitor_id_by_linked_id?.['24_hours'] ?? 0) > 3) r.push('velocity')
  return r
}

// --- SQLite store (better-sqlite3) ---
function sqliteStore(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS account_devices (
    accountId TEXT NOT NULL, visitorId TEXT NOT NULL, createdAt INTEGER NOT NULL, lastSeenAt INTEGER NOT NULL,
    PRIMARY KEY (accountId, visitorId))`)
  return {
    async list(accountId) {
      return db.prepare('SELECT visitorId, createdAt, lastSeenAt FROM account_devices WHERE accountId = ?').all(accountId)
    },
    async upsert(accountId, visitorId) {
      const now = Date.now()
      db.prepare(`INSERT INTO account_devices (accountId, visitorId, createdAt, lastSeenAt) VALUES (?, ?, ?, ?)
        ON CONFLICT(accountId, visitorId) DO UPDATE SET lastSeenAt = excluded.lastSeenAt`).run(accountId, visitorId, now, now)
    },
    async remove(accountId, visitorId) {
      db.prepare('DELETE FROM account_devices WHERE accountId = ? AND visitorId = ?').run(accountId, visitorId)
    },
  }
}

// --- In-memory store, for tests and prototypes ---
function memoryStore() {
  const m = new Map()
  return {
    async list(a) { return [...(m.get(a) ?? new Map()).values()] },
    async upsert(a, v) {
      if (!m.has(a)) m.set(a, new Map())
      const now = Date.now()
      const cur = m.get(a).get(v)
      m.get(a).set(v, { visitorId: v, createdAt: cur?.createdAt ?? now, lastSeenAt: now })
    },
    async remove(a, v) { m.get(a)?.delete(v) },
  }
}

module.exports = { deviceBinding, softRisk, sqliteStore, memoryStore }
