// Visitor records: store the verified visitorId on your own rows; enforce bans; pull device history.
// `visitorId` comes from the server-side event (getEvent), never from the browser.
//
//   const records = visitorRecords(store)
//   if (await records.isBanned(visitorId)) return banned()
//   await store.insert('listings', { title, price, visitorId })  // name the columns; never spread req.body
//   await records.ban(visitorId, 'spam listings')                       // moderator action
//   const history = await records.related('purchases', { visitorId, email })  // dispute evidence

/**
 * @param {{ insert(table, row, opts?: { ignore?: boolean }): Promise<void>, find(table, where): Promise<object[]>, findOr(table, fields): Promise<object[]> }} store
 */
function visitorRecords(store) {
  return {
    async isBanned(visitorId) {
      return (await store.find('banned_visitors', { visitorId })).length > 0
    },
    async ban(visitorId, reason = '') {
      // Banning twice is a no-op: the only insert that may be ignored.
      await store.insert('banned_visitors', { visitorId, reason, bannedAt: Date.now() }, { ignore: true })
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
  // Column names come from the caller's keys and land in SQL, so only plain identifiers pass:
  // a request body spread into a row cannot smuggle anything in.
  const cols = (row) => Object.keys(row).map((c) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(c)) throw new Error(`Invalid column name: ${c}`)
    return c
  })
  return {
    // A plain INSERT: a NOT NULL or CHECK failure on your table is an error, not a lost row.
    async insert(table, row, { ignore = false } = {}) {
      const sql = `INSERT ${ignore ? 'OR IGNORE ' : ''}INTO ${table} (${cols(row).join(', ')}) VALUES (${cols(row).map(() => '?').join(', ')})`
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
    async insert(table, row, { ignore = false } = {}) {
      if (ignore && rows(table).some((r) => r.visitorId === row.visitorId)) return
      rows(table).push(row)
    },
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
