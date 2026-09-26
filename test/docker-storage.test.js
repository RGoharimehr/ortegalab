'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { loadConfig } = require('../src/server/config');
const { openDatabase } = require('../src/server/db');
const { ensureWritableDirectory } = require('../src/server/storage');
const { createApp } = require('../src/server/app');

const logger = { log() {}, warn() {}, error() {} };
const canCheckPermissions = process.platform !== 'win32' && process.getuid?.() !== 0;

function directory(t) {
  const value = fs.mkdtempSync(path.join(os.tmpdir(), 'latfs-storage-'));
  t.after(() => fs.rmSync(value, { recursive: true, force: true }));
  return value;
}

function config(databasePath) {
  return loadConfig({ databasePath, env: { NODE_ENV: 'test' } });
}

test('configured database directories are created and existing data is reopened', (t) => {
  const databasePath = path.join(directory(t), 'persistent', 'nested', 'lab.db');
  let db = openDatabase(config(databasePath), logger);
  db.prepare('INSERT INTO news (title, content, date) VALUES (?, ?, ?)').run(
    'Existing data',
    'Preserve this',
    '2026-01-01',
  );
  db.close();
  db = openDatabase(config(databasePath), logger);
  assert.equal(db.prepare('SELECT content FROM news').get().content, 'Preserve this');
  db.close();
});

test('a file used as DATABASE_PATH parent reports the setting and path', (t) => {
  const parent = path.join(directory(t), 'not-a-directory');
  fs.writeFileSync(parent, 'keep this file');
  assert.throws(
    () => openDatabase(config(path.join(parent, 'latfs.db')), logger),
    (error) => {
      assert.match(error.message, /Cannot use DATABASE_PATH/);
      assert.ok(error.message.includes(parent));
      assert.match(error.message, /existing data/);
      return true;
    },
  );
  assert.equal(fs.readFileSync(parent, 'utf8'), 'keep this file');
});

test(
  'a read-only database directory fails instead of opening a different database',
  { skip: !canCheckPermissions },
  (t) => {
    const parent = directory(t);
    const databasePath = path.join(parent, 'latfs.db');
    openDatabase(config(databasePath), logger).close();
    const before = fs.readFileSync(databasePath);
    fs.chmodSync(parent, 0o500);
    try {
      assert.throws(
        () => openDatabase(config(databasePath), logger),
        /Cannot use DATABASE_PATH.*UID/,
      );
    } finally {
      fs.chmodSync(parent, 0o700);
    }
    assert.deepEqual(fs.readFileSync(databasePath), before);
  },
);

test(
  'a read-only database file identifies the existing file that needs permission repair',
  { skip: !canCheckPermissions },
  (t) => {
    const databasePath = path.join(directory(t), 'existing.db');
    openDatabase(config(databasePath), logger).close();
    fs.chmodSync(databasePath, 0o400);
    try {
      assert.throws(
        () => openDatabase(config(databasePath), logger),
        (error) => {
          assert.ok(error.message.includes(databasePath));
          assert.match(error.message, /Cannot use DATABASE_PATH/);
          return true;
        },
      );
    } finally {
      fs.chmodSync(databasePath, 0o600);
    }
  },
);

test(
  'uploads permissions fail before an application creates a new database',
  { skip: !canCheckPermissions },
  (t) => {
    const parent = directory(t);
    const uploadsPath = path.join(parent, 'uploads');
    const databasePath = path.join(parent, 'should-not-exist.db');
    fs.mkdirSync(uploadsPath, { mode: 0o500 });
    try {
      assert.throws(
        () => createApp({ env: { NODE_ENV: 'test' }, databasePath, uploadsPath, logger }),
        /Cannot use UPLOADS_PATH/,
      );
    } finally {
      fs.chmodSync(uploadsPath, 0o700);
    }
    assert.equal(fs.existsSync(databasePath), false);
  },
);

test('upload directory diagnostics identify invalid mount targets', (t) => {
  const uploadsPath = path.join(directory(t), 'uploads');
  fs.writeFileSync(uploadsPath, 'keep this file');
  assert.throws(
    () => ensureWritableDirectory(uploadsPath, 'UPLOADS_PATH'),
    /Cannot use UPLOADS_PATH/,
  );
  assert.equal(fs.readFileSync(uploadsPath, 'utf8'), 'keep this file');
});
