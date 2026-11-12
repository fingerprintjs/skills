// One per device: a visitorId may claim a thing once (optionally once per scope value).
// `visitorId` comes from protectAction() (fingerprint-protect-action), never from the browser.
//
//   const once = oncePerDevice(store, { key: 'redemptions', scope: 'code' })
//   if (await once.claimed(visitorId, coupon.code)) return alreadyClaimed()
//   await once.claim(visitorId, coupon.code)              // returns false if a parallel request won
//
//   const signup = oncePerDevice(store, { key: 'accounts' })  // global: one account per device
//   if (await signup.claimed(visitorId)) return fail()

/**
 * @param {{ exists(key, visitorId, scopeValue): Promise<boolean>, insert(key, row): Promise<boolean> }} store
 * @param {{ key: string, scope?: string }} opts - scope: column that narrows uniqueness (e.g. 'code')
 */
function oncePerDevice(store, { key, scope }) {
  return {
    async claimed(visitorId, scopeValue) {
      return store.exists(key, visitorId, scope ? scopeValue : undefined)
    },
    async claim(visitorId, scopeValue, extra = {}) {
      const row = { visitorId, createdAt: Date.now(), ...extra }
      if (scope) row[scope] = scopeValue
      return store.insert(key, row) // false when the unique index rejected it (lost the race)
    },
  }
}

// --- SQLite store (better-sqlite3). `scope` column is created when given. ---
function sqliteStore(db, { scope } = {}) {
  const ready = new Set()
  function ensure(key) {
    if (ready.has(key)) return
    const cols = scope ? `${scope} TEXT NOT NULL,` : ''
    const unique = scope ? `(${scope}, visitorId)` : '(visitorId)'
    db.exec(`CREATE TABLE IF NOT EXISTS ${key} (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ${cols} visitorId TEXT NOT NULL, createdAt INTEGER NOT NULL, extra TEXT
    ); CREATE UNIQUE INDEX IF NOT EXISTS ${key}_once ON ${key} ${unique}`)
    ready.add(key)
  }
  return {
    async exists(key, visitorId, scopeValue) {
      ensure(key)
      const sql = scope
        ? `SELECT 1 FROM ${key} WHERE ${scope} = ? AND visitorId = ? LIMIT 1`
        : `SELECT 1 FROM ${key} WHERE visitorId = ? LIMIT 1`
      const row = scope ? db.prepare(sql).get(scopeValue, visitorId) : db.prepare(sql).get(visitorId)
      return Boolean(row)
    },
    async insert(key, { visitorId, createdAt, [scope]: scopeValue, ...extra }) {
      ensure(key)
      const sql = scope
        ? `INSERT OR IGNORE INTO ${key} (${scope}, visitorId, createdAt, extra) VALUES (?, ?, ?, ?)`
        : `INSERT OR IGNORE INTO ${key} (visitorId, createdAt, extra) VALUES (?, ?, ?)`
      const args = scope ? [scopeValue, visitorId, createdAt, JSON.stringify(extra)] : [visitorId, createdAt, JSON.stringify(extra)]
      return db.prepare(sql).run(...args).changes === 1
    },
  }
}

// --- In-memory store, for tests and prototypes ---
function memoryStore({ scope } = {}) {
  const keys = new Map()
  const id = (visitorId, scopeValue) => (scope ? `${scopeValue}\u0000${visitorId}` : visitorId)
  return {
    async exists(key, visitorId, scopeValue) {
      return (keys.get(key) ?? new Set()).has(id(visitorId, scopeValue))
    },
    async insert(key, row) {
      if (!keys.has(key)) keys.set(key, new Set())
      const set = keys.get(key)
      const k = id(row.visitorId, scope ? row[scope] : undefined)
      if (set.has(k)) return false
      set.add(k)
      return true
    },
  }
}

module.exports = { oncePerDevice, sqliteStore, memoryStore }
