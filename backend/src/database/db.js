/**
 * database/db.js
 * Uses Node 22 built-in sqlite — no native compilation needed.
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.join(__dirname, '../../data/auction.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let _db;
function rawDB() {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec('PRAGMA journal_mode = WAL');
    _db.exec('PRAGMA foreign_keys = ON');
  }
  return _db;
}

// Wrap to return plain objects (not null-prototype) matching better-sqlite3 API
function getDB() {
  const db = rawDB();
  return {
    prepare(sql) {
      const stmt = db.prepare(sql);
      return {
        run:  (...a) => stmt.run(...a),
        all:  (...a) => stmt.all(...a).map(r => Object.assign({}, r)),
        get:  (...a) => { const r = stmt.get(...a); return r ? Object.assign({}, r) : undefined; },
      };
    },
    exec: (sql) => db.exec(sql),
  };
}

function initDB() {
  const db = rawDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE,
      email TEXT, company TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_supplier_name ON suppliers(name);

    CREATE TABLE IF NOT EXISTS rfqs (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
      start_time TEXT NOT NULL, end_time TEXT NOT NULL, forced_end_time TEXT NOT NULL,
      trigger_window INTEGER NOT NULL, extension_duration INTEGER NOT NULL,
      extension_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_rfqs_status ON rfqs(status);
    CREATE INDEX IF NOT EXISTS idx_rfqs_times  ON rfqs(start_time, end_time, forced_end_time);

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY, rfq_id TEXT NOT NULL, supplier_id TEXT NOT NULL,
      carrier_name TEXT NOT NULL,
      freight_charges REAL NOT NULL, origin_charges REAL NOT NULL,
      destination_charges REAL NOT NULL, total_price REAL NOT NULL,
      transit_time INTEGER NOT NULL, quote_validity INTEGER NOT NULL,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_bids_rfq       ON bids(rfq_id);
    CREATE INDEX IF NOT EXISTS idx_bids_supplier  ON bids(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_bids_price     ON bids(rfq_id, total_price);
    CREATE INDEX IF NOT EXISTS idx_bids_submitted ON bids(rfq_id, submitted_at);

    CREATE TABLE IF NOT EXISTS auction_logs (
      id TEXT PRIMARY KEY, rfq_id TEXT NOT NULL, event_type TEXT NOT NULL,
      description TEXT NOT NULL, metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_logs_rfq     ON auction_logs(rfq_id);
    CREATE INDEX IF NOT EXISTS idx_logs_created ON auction_logs(created_at);

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, rfq_id TEXT NOT NULL, supplier_id TEXT,
      type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_notif_supplier ON notifications(supplier_id);
  `);
  console.log('Database initialised:', DB_PATH);
  return db;
}

module.exports = { getDB, initDB };
