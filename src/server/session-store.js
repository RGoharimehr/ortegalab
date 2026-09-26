'use strict';

const { Store } = require('express-session');

const DAY = 24 * 60 * 60 * 1000;

/** Persistent session storage on the application's existing SQLite connection. */
class SQLiteSessionStore extends Store {
  constructor({ db, ttl = DAY, cleanupInterval = 15 * 60 * 1000 }) {
    super();
    this.db = db;
    this.ttl = ttl;
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    `);
    this.purgeExpired();
    if (cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        try {
          this.purgeExpired();
        } catch (error) {
          console.error('[sessions] Cleanup failed:', error.message);
        }
      }, cleanupInterval);
      this.cleanupTimer.unref();
    }
  }

  expiresAt(session) {
    const expires = session.cookie?.expires;
    const timestamp = expires ? new Date(expires).getTime() : NaN;
    return Number.isFinite(timestamp) ? timestamp : Date.now() + this.ttl;
  }

  run(callback, operation) {
    let value;
    try {
      value = operation();
    } catch (error) {
      if (callback) queueMicrotask(() => callback(error));
      else throw error;
      return;
    }
    if (callback) queueMicrotask(() => callback(null, value));
  }

  get(sid, callback) {
    this.run(callback, () => {
      const row = this.db.prepare('SELECT data, expires_at FROM sessions WHERE sid=?').get(sid);
      if (!row) return null;
      if (row.expires_at <= Date.now()) {
        this.db.prepare('DELETE FROM sessions WHERE sid=?').run(sid);
        return null;
      }
      return JSON.parse(row.data);
    });
  }

  set(sid, session, callback) {
    this.run(callback, () => {
      this.db
        .prepare(
          `INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET data=excluded.data, expires_at=excluded.expires_at`,
        )
        .run(sid, JSON.stringify(session), this.expiresAt(session));
    });
  }

  touch(sid, session, callback) {
    this.run(callback, () => {
      this.db
        .prepare('UPDATE sessions SET expires_at=? WHERE sid=?')
        .run(this.expiresAt(session), sid);
    });
  }

  destroy(sid, callback) {
    this.run(callback, () => {
      this.db.prepare('DELETE FROM sessions WHERE sid=?').run(sid);
    });
  }

  clear(callback) {
    this.run(callback, () => {
      this.db.prepare('DELETE FROM sessions').run();
    });
  }

  length(callback) {
    this.run(
      callback,
      () =>
        this.db.prepare('SELECT COUNT(*) AS count FROM sessions WHERE expires_at>?').get(Date.now())
          .count,
    );
  }

  purgeExpired() {
    this.db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(Date.now());
  }

  close() {
    clearInterval(this.cleanupTimer);
  }
}

module.exports = SQLiteSessionStore;
