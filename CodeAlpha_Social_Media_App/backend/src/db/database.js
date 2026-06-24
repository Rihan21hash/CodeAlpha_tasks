/* ═══════════════════════════════════════════════════════════
   NEXUS — SQLite Database (sql.js — pure JS, no native build)
   Database is held in-memory and saved to disk after each write.
   ═══════════════════════════════════════════════════════════ */

'use strict';

const path   = require('path');
const fs     = require('fs');
const bcrypt = require('bcryptjs');

/* ── Ensure data directory exists ── */
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, 'nexus.db');

/* ══════════════════════════════════════════════════════
   Lazy-load sql.js and return a wrapped synchronous DB
══════════════════════════════════════════════════════ */
let _db = null; // sql.js Database instance

function getDb() {
  if (_db) return _db;

  const initSqlJs = require('sql.js');
  // sql.js is async at init time only; we use a synchronous workaround via
  // a pre-initialized module pattern — but since require() is sync and
  // sql.js exposes synchronous run/exec once initialized, we initialise
  // with the sync initSqlJs({}) when loading from file.

  // Because sql.js init is async, we need to initialise synchronously at
  // module load time. We do this by calling the exported promise inside
  // a synchronous wrapper using a shared initialized flag.
  throw new Error('DB not yet initialized. Call initDb() first.');
}

/* Persistent wrapper — save to file after every mutating operation */
class NexusDB {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  /* Save current in-memory state to disk */
  _save() {
    const data = this._db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
  }

  exec(sql) {
    this._db.run(sql);
    this._save();
    return this;
  }

  /* Run a single statement (INSERT / UPDATE / DELETE) */
  run(sql, params = []) {
    const stmt = this._db.prepare(sql);
    stmt.run(params);
    stmt.free();
    this._save();
  }

  /* Return one row or null */
  get(sql, params = []) {
    const stmt = this._db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  /* Return all matching rows */
  all(sql, params = []) {
    const stmt    = this._db.prepare(sql);
    const results = [];
    stmt.bind(params);
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
  }

  /* Convenience: prepare returns an object with run/get/all bound */
  prepare(sql) {
    const self = this;
    return {
      run: (...args) => {
        // Accept positional array or spread args
        const params = Array.isArray(args[0]) ? args[0] : args;
        self.run(sql, params);
      },
      get: (...args) => {
        const params = Array.isArray(args[0]) ? args[0] : args;
        return self.get(sql, params);
      },
      all: (...args) => {
        const params = Array.isArray(args[0]) ? args[0] : args;
        return self.all(sql, params);
      },
    };
  }
}

/* ══════════════════════════════════════════════════════
   Initialise — called once before server starts
══════════════════════════════════════════════════════ */
let dbInstance = null;

async function initDb() {
  if (dbInstance) return dbInstance;

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_FILE)) {
    const buf = fs.readFileSync(DB_FILE);
    sqlDb = new SQL.Database(buf);
  } else {
    sqlDb = new SQL.Database();
  }

  dbInstance = new NexusDB(sqlDb);

  /* ── Schema ── */
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      username     TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      bio          TEXT DEFAULT '',
      password     TEXT NOT NULL,
      joined_at    TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS follows (
      follower  TEXT NOT NULL,
      following TEXT NOT NULL,
      PRIMARY KEY (follower, following)
    );
    CREATE TABLE IF NOT EXISTS posts (
      id         TEXT PRIMARY KEY,
      author     TEXT NOT NULL,
      content    TEXT NOT NULL,
      image_url  TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS likes (
      post_id  TEXT NOT NULL,
      username TEXT NOT NULL,
      PRIMARY KEY (post_id, username)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id         TEXT PRIMARY KEY,
      post_id    TEXT NOT NULL,
      author     TEXT NOT NULL,
      text       TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  dbInstance._save();

  /* ── Seed ── */
  _seed(dbInstance);

  return dbInstance;
}

/* ── ID generator ── */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function _seed(db) {
  const existing = db.get('SELECT COUNT(*) AS c FROM users');
  if (existing && existing.c > 0) return;

  const now = Date.now();

  db.run(`INSERT OR IGNORE INTO users VALUES (?,?,?,?,?)`, [
    'alice', 'Alice Chen',
    'Designer & creative thinker. Coffee enthusiast ☕',
    bcrypt.hashSync('pass123', 10),
    new Date(now - 30 * 86400000).toISOString(),
  ]);
  db.run(`INSERT OR IGNORE INTO users VALUES (?,?,?,?,?)`, [
    'bob', 'Bob Martinez',
    'Full-stack developer. Open source contributor.',
    bcrypt.hashSync('pass123', 10),
    new Date(now - 28 * 86400000).toISOString(),
  ]);

  db.run(`INSERT OR IGNORE INTO follows VALUES (?,?)`, ['alice', 'bob']);
  db.run(`INSERT OR IGNORE INTO follows VALUES (?,?)`, ['bob', 'alice']);

  const p1 = genId(), p2 = genId(), p3 = genId();
  db.run(`INSERT OR IGNORE INTO posts VALUES (?,?,?,?,?)`, [
    p1, 'alice',
    'Just finished redesigning our dashboard — focusing on reducing cognitive load. Less is more. 🎨',
    '', new Date(now - 2 * 3600000).toISOString(),
  ]);
  db.run(`INSERT OR IGNORE INTO posts VALUES (?,?,?,?,?)`, [
    p2, 'bob',
    'Shipped a new open-source CLI tool today. It handles file watching with zero config. Check it out!',
    '', new Date(now - 5 * 3600000).toISOString(),
  ]);
  db.run(`INSERT OR IGNORE INTO posts VALUES (?,?,?,?,?)`, [
    p3, 'alice',
    'Typography tip: Use a type scale based on a ratio (like 1.25 or 1.333) for visual harmony. Your designs will look instantly more polished.',
    '', new Date(now - 24 * 3600000).toISOString(),
  ]);

  db.run(`INSERT OR IGNORE INTO likes VALUES (?,?)`, [p1, 'bob']);
  db.run(`INSERT OR IGNORE INTO likes VALUES (?,?)`, [p2, 'alice']);

  db.run(`INSERT OR IGNORE INTO comments VALUES (?,?,?,?,?)`, [
    genId(), p1, 'bob',
    'Looks incredible! Would love to see a walkthrough.',
    new Date(now - 1800000).toISOString(),
  ]);

  console.log('✅  Database seeded — demo accounts: alice & bob (password: pass123)');
}

module.exports = { initDb, getDbInstance: () => dbInstance };
