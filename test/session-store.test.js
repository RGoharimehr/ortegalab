'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const Database = require('better-sqlite3');
const SQLiteSessionStore = require('../src/server/session-store');

function call(store, method, ...args) {
  return new Promise((resolve, reject) =>
    store[method](...args, (error, value) => (error ? reject(error) : resolve(value))),
  );
}

function fixture(t) {
  const db = new Database(':memory:');
  const store = new SQLiteSessionStore({ db, cleanupInterval: 0 });
  t.after(() => {
    store.close();
    db.close();
  });
  return { db, store };
}

const session = () => ({
  userId: 42,
  role: 'student',
  cookie: { expires: new Date(Date.now() + 60_000).toISOString() },
});

test('sessions survive reopening the database and preserve authentication data', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'latfs-sessions-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'sessions.db');
  const firstDb = new Database(file);
  const first = new SQLiteSessionStore({ db: firstDb, cleanupInterval: 0 });
  const data = session();
  await call(first, 'set', 'opaque-id', data);
  first.close();
  firstDb.close();
  const secondDb = new Database(file);
  const second = new SQLiteSessionStore({ db: secondDb, cleanupInterval: 0 });
  t.after(() => {
    second.close();
    secondDb.close();
  });
  assert.deepEqual(await call(second, 'get', 'opaque-id'), data);
});

test('expired sessions are not returned and are removed', async (t) => {
  const { db, store } = fixture(t);
  await call(store, 'set', 'expired', {
    ...session(),
    cookie: { expires: '2000-01-01T00:00:00Z' },
  });
  assert.equal(await call(store, 'get', 'expired'), null);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
});

test('touch renews expiration without overwriting concurrent session data', async (t) => {
  const { db, store } = fixture(t);
  const data = session();
  await call(store, 'set', 'active', data);
  const future = new Date(Date.now() + 3600_000).toISOString();
  await call(store, 'touch', 'active', { ...data, userId: 99, cookie: { expires: future } });
  assert.equal((await call(store, 'get', 'active')).userId, 42);
  assert.equal(
    db.prepare('SELECT expires_at FROM sessions WHERE sid=?').get('active').expires_at,
    new Date(future).getTime(),
  );
  await call(store, 'destroy', 'active');
  assert.equal(await call(store, 'get', 'active'), null);
});

test('store reports database errors through callbacks', async (t) => {
  const { db, store } = fixture(t);
  db.exec('DROP TABLE sessions');
  await assert.rejects(call(store, 'get', 'missing'), /no such table/);
});
