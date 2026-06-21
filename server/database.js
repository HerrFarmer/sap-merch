require('dotenv').config();
const { Pool } = require('pg');

// In test mode, use SQLite in-memory (keeps tests fast and isolated)
if (process.env.NODE_ENV === 'test') {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT
    );
    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id   TEXT NOT NULL,
      product_name TEXT NOT NULL,
      gender   TEXT NOT NULL,
      size     TEXT NOT NULL,
      quantity INTEGER NOT NULL
    );
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    INSERT INTO settings VALUES ('ordering_open', 'true');
    INSERT INTO settings VALUES ('admin_password', 'admin123');
  `);
  module.exports = { type: 'sqlite', db };
} else {
  // Use separate params to avoid URL-encoding issues with special chars in password
  const pool = new Pool({
    host:     process.env.DB_HOST     || new URL(process.env.DATABASE_URL).hostname,
    port:     process.env.DB_PORT     || new URL(process.env.DATABASE_URL).port || 5432,
    database: process.env.DB_NAME     || new URL(process.env.DATABASE_URL).pathname.slice(1),
    user:     process.env.DB_USER     || new URL(process.env.DATABASE_URL).username,
    password: process.env.DB_PASSWORD || decodeURIComponent(new URL(process.env.DATABASE_URL).password),
    ssl: { rejectUnauthorized: false },
  });
  module.exports = { type: 'pg', pool };
}
