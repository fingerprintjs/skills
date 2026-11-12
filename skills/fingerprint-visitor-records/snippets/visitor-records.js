// Visitor records: store the verified visitorId on your own rows; enforce bans; pull device history.
// `visitorId` comes from the server-side event (getEvent), never from the browser.
//
//   const records = visitorRecords(store)
//   if (await records.isBanned(visitorId)) return banned()
//   await store.insert('listings', { ...listing, visitorId })
//   await records.ban(visitorId, 'spam listings')                       // moderator action
//   const history = await records.related('purchases', { visitorId, email })  // dispute evidence

/**
 * @param {{ insert(table, row): Promise<void>, find(table, where): Promise<object[]>, findOr(table, fields): Promise<object[]> }} store
 */
function visitorRecords(store) {
  return {
    async isBanned(visitorId) {
      return (await store.find('banned_visitors', { visitorId })).length > 0
    },
    async ban(visitorId, reason = '') {
      await store.insert('banned_visitors', { visitorId, reason, bannedAt: Date.now() })
    },
    // Every row that shares the device OR the identifier (email). OR, not AND: a fraudster
    // changes the email, not the device.
    async related(table, { visitorId, email }) {
      const fields = {}
      if (visitorId) fields.visitorId = visitorId
      if (email) fields.email = email
      return store.findOr(table, fields)
    },
  }
}

// --- SQLite store (better-sqlite3). Tables for your records already exist; banned_visitors is created. ---
function sqliteStore(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS banned_visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT, visitorId TEXT NOT NULL UNIQUE, reason TEXT, bannedAt INTEGER NOT NULL)`)
  const cols = (row) => Object.keys(row)
  return {
    async insert(table, row) {
      const sql = `INSERT OR IGNORE INTO ${table} (${cols(row).join(', ')}) VALUES (${cols(row).map(() => '?').join(', ')})`
      db.prepare(sql).run(...Object.values(row))
    },
    async find(table, where) {
      const sql = `SELECT * FROM ${table} WHERE ${cols(where).map((c) => `${c} = ?`).join(' AND ')}`
      return db.prepare(sql).all(...Object.values(where))
    },
    async findOr(table, fields) {
      const sql = `SELECT * FROM ${table} WHERE ${cols(fields).map((c) => `${c} = ?`).join(' OR ')} ORDER BY createdAt DESC`
      return db.prepare(sql).all(...Object.values(fields))
    },
  }
}

// --- In-memory store, for tests and prototypes ---
function memoryStore() {
  const t = new Map()
  const rows = (table) => (t.has(table) ? t.get(table) : (t.set(table, []), t.get(table)))
  return {
    async insert(table, row) { rows(table).push(row) },
    async find(table, where) {
      return rows(table).filter((r) => Object.entries(where).every(([k, v]) => r[k] === v))
    },
    async findOr(table, fields) {
      return rows(table)
        .filter((r) => Object.entries(fields).some(([k, v]) => r[k] === v))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    },
  }
}

module.exports = { visitorRecords, sqliteStore, memoryStore }
