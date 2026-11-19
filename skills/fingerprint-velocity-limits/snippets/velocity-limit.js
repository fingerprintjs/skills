// Velocity limit per device: count an action per visitorId within a window, refuse past a limit.
// `visitorId` comes from protectAction() (fingerprint-protect-action), never from the browser.
//
//   const limiter = velocityLimit(store, { key: 'failed_logins', limit: 3, windowMs: DAY })
//   if (await limiter.exceeded(visitorId)) return fail()
//   ...
//   await limiter.record(visitorId, { email })   // on failure (attacks) or on success (costly actions)

const DAY = 24 * 60 * 60 * 1000

/**
 * @param {{ countSince(key, visitorId, since): Promise<number>, insert(key, row): Promise<void> }} store
 * @param {{ key: string, limit: number, windowMs?: number }} opts - omit windowMs for a lifetime cap
 */
function velocityLimit(store, { key, limit, windowMs }) {
  return {
    async count(visitorId) {
      const since = windowMs ? Date.now() - windowMs : 0
      return store.countSince(key, visitorId, since)
    },
    async exceeded(visitorId) {
      return (await this.count(visitorId)) >= limit
    },
    async record(visitorId, extra = {}) {
      await store.insert(key, { visitorId, createdAt: Date.now(), ...extra })
    },
  }
}

// --- SQLite store (better-sqlite3). One table per key, created on first use. ---
function sqliteStore(db) {
  const ready = new Set()
  function ensure(key) {
    if (ready.has(key)) return
    db.exec(`CREATE TABLE IF NOT EXISTS ${key} (
      id INTEGER PRIMARY KEY AUTOINCREMENT, visitorId TEXT NOT NULL, createdAt INTEGER NOT NULL, extra TEXT
    ); CREATE INDEX IF NOT EXISTS ${key}_visitor ON ${key} (visitorId, createdAt)`)
    ready.add(key)
  }
  return {
    async countSince(key, visitorId, since) {
      ensure(key)
      // .get() returns a row object; read the column, don't compare the object to a number.
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${key} WHERE visitorId = ? AND createdAt >= ?`).get(visitorId, since)
      return row.n
    },
    async insert(key, { visitorId, createdAt, ...extra }) {
      ensure(key)
      db.prepare(`INSERT INTO ${key} (visitorId, createdAt, extra) VALUES (?, ?, ?)`).run(visitorId, createdAt, JSON.stringify(extra))
    },
  }
}

// --- In-memory store, for tests and prototypes ---
function memoryStore() {
  const rows = new Map()
  return {
    async countSince(key, visitorId, since) {
      return (rows.get(key) ?? []).filter((r) => r.visitorId === visitorId && r.createdAt >= since).length
    },
    async insert(key, row) {
      if (!rows.has(key)) rows.set(key, [])
      rows.get(key).push(row)
    },
  }
}

module.exports = { velocityLimit, sqliteStore, memoryStore, DAY }
