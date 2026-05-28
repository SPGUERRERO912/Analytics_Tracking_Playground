// db.js — sql.js SQLite (pure JS, no native compilation needed)
// The DB is loaded from / saved to events.db on disk for persistence.
const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "events.db");

// Singleton promise so the server waits for init before accepting requests
let _db = null;
let _saveTimer = null;

async function getDb() {
  if (_db) return _db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  TEXT    NOT NULL,
      event_type  TEXT    NOT NULL,
      page        TEXT,
      element     TEXT,
      metadata    TEXT,
      ts          INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      session_id  TEXT PRIMARY KEY,
      started_at  INTEGER NOT NULL,
      last_seen   INTEGER NOT NULL,
      user_agent  TEXT,
      referrer    TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_events_ts      ON events(ts);
    CREATE INDEX IF NOT EXISTS idx_events_type    ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  `);

  scheduleSave();
  return _db;
}

// Debounced disk save — sql.js keeps DB in memory; we flush to disk periodically
function scheduleSave() {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    if (!_db) return;
    try {
      const data = _db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      console.error("DB save error:", e.message);
    }
    scheduleSave(); // keep saving every 5 s
  }, 5000);
}

// Helper: run a query that returns rows as plain objects
function query(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Helper: run a query that returns a single row
function queryOne(db, sql, params = []) {
  return query(db, sql, params)[0] || null;
}

module.exports = { getDb, query, queryOne, scheduleSave };