// Unified async query interface for both PostgreSQL (production) and SQLite (tests)
const conn = require('./database');

// Convert PostgreSQL syntax to SQLite
function toSQLite(text) {
  return text
    .replace(/\$\d+/g, '?')                        // $1,$2 → ?
    .replace(/NOW\(\)/gi, "datetime('now')")        // NOW() → datetime('now')
    .replace(/\s+RETURNING\s+\w+/gi, '')            // strip RETURNING id
}

async function query(text, params = []) {
  if (conn.type === 'sqlite') {
    const sql = toSQLite(text)
    const stmt = conn.db.prepare(sql)
    const trimmed = text.trimStart().toUpperCase()
    if (trimmed.startsWith('SELECT')) {
      return { rows: stmt.all(...params) }
    } else {
      const info = stmt.run(...params)
      return { rows: [], rowCount: info.changes }
    }
  } else {
    return conn.pool.query(text, params)
  }
}

async function insert(text, params = []) {
  if (conn.type === 'sqlite') {
    const sql = toSQLite(text)
    const info = conn.db.prepare(sql).run(...params)
    return info.lastInsertRowid
  } else {
    const res = await conn.pool.query(text, params)
    return res.rows[0].id
  }
}

// Run multiple statements in a transaction
async function transaction(fn) {
  if (conn.type === 'sqlite') {
    const run = conn.db.transaction(fn);
    return run();
  } else {
    const client = await conn.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

// Get settings value
async function getSetting(key) {
  const res = await query('SELECT value FROM settings WHERE key = $1', [key]);
  return res.rows[0]?.value;
}

// Set settings value
async function setSetting(key, value) {
  await query('UPDATE settings SET value = $1 WHERE key = $2', [value, key]);
}

module.exports = { query, insert, transaction, getSetting, setSetting };
