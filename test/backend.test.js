'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/server/app');
const { createUploadService } = require('../src/server/services/uploads');
const { refreshSessionUser } = require('../src/server/middleware/auth');

const logger = { log() {}, warn() {}, error() {} };

function fixture(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'latfs-backend-'));
  const config = {
    env: { NODE_ENV: 'test', SESSION_SECRET: 'test-only-persistent-secret' },
    databasePath: path.join(directory, 'lab.db'),
    uploadsPath: path.join(directory, 'uploads'),
    logger,
    ...options,
  };
  let runtime = createApp(config);
  t.after(() => {
    runtime.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return {
    get runtime() {
      return runtime;
    },
    restart() {
      runtime.close();
      runtime = createApp(config);
      return runtime;
    },
  };
}

test('database upgrades preserve edited content and do not repopulate empty tables', (t) => {
  const application = fixture(t);
  const { db } = application.runtime;
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM news').get().count, 0);
  db.prepare(
    "INSERT INTO news (title, content, date) VALUES ('Real lab news', 'Preserve this content', '2026-09-25')",
  ).run();
  application.restart();
  assert.equal(
    application.runtime.db.prepare('SELECT title FROM news').get().title,
    'Real lab news',
  );
  application.runtime.db.prepare('DELETE FROM news').run();
  application.restart();
  assert.equal(application.runtime.db.prepare('SELECT COUNT(*) AS count FROM news').get().count, 0);
  assert.equal(
    application.runtime.db
      .prepare(
        "SELECT COUNT(*) AS count FROM schema_migrations WHERE name='legacy-content-and-workflow-v1'",
      )
      .get().count,
    1,
  );
});

test('explicit demo data is seeded once and remains editable', (t) => {
  const application = fixture(t, { seedDemo: true });
  assert.ok(application.runtime.db.prepare('SELECT COUNT(*) AS count FROM news').get().count > 0);
  application.runtime.db.prepare('DELETE FROM news').run();
  application.restart();
  assert.equal(application.runtime.db.prepare('SELECT COUNT(*) AS count FROM news').get().count, 0);
});

test('upload access uses exact decoded references and published state', (t) => {
  const { runtime } = fixture(t);
  const uploads = createUploadService({ db: runtime.db, config: runtime.config, logger });
  const publication = runtime.db.prepare(
    "INSERT INTO documents (entity_type, entity_id, title, file_url, published) VALUES ('download', 0, 'Test download', ?, 1)",
  );
  const documentId = publication.run('/uploads/private.txt.longer').lastInsertRowid;
  function access(filePath, session) {
    let status;
    let passed = false;
    const res = {
      setHeader() {},
      vary() {},
      status(code) {
        status = code;
        return this;
      },
      json() {},
    };
    uploads.authorizeUpload({ path: filePath, session }, res, () => {
      passed = true;
    });
    return passed ? 200 : status;
  }
  assert.equal(
    access('/private.txt'),
    401,
    'A published filename prefix cannot expose a private file',
  );
  assert.equal(access('/private.txt.longer'), 200);
  runtime.db
    .prepare('UPDATE documents SET file_url=? WHERE id=?')
    .run('/uploads/file%20name.txt', documentId);
  assert.equal(access('/file%20name.txt'), 200);
  runtime.db.prepare('UPDATE documents SET published=0 WHERE id=?').run(documentId);
  assert.equal(access('/file%20name.txt'), 401);
  assert.equal(access('/file%20name.txt', { userId: 1 }), 200);
  assert.equal(access('/%2e%2e%2fsecret.txt'), 404);
});

test('photo uploads reject mismatched or executable extensions', (t) => {
  const { runtime } = fixture(t);
  const uploads = createUploadService({ db: runtime.db, config: runtime.config, logger });
  let error;
  let accepted;
  function check(originalname, mimetype) {
    uploads.photoUpload.fileFilter({}, { originalname, mimetype }, (err, allow) => {
      error = err;
      accepted = allow;
    });
  }
  check('photo.html', 'image/png');
  assert.match(error.message, /Only JPEG/);
  check('photo.svg', 'image/png');
  assert.ok(error);
  check('photo.png', 'image/jpeg');
  assert.ok(error);
  check('photo.PNG', 'image/png');
  assert.equal(error, null);
  assert.equal(accepted, true);
});

test('current roles and deactivation apply to restored sessions immediately', (t) => {
  const { runtime } = fixture(t);
  const id = runtime.db
    .prepare(
      "INSERT INTO users (username, password, role, active) VALUES ('member', 'test-hash', 'student', 1)",
    )
    .run().lastInsertRowid;
  const req = { session: { userId: id, username: 'member', role: 'admin' } };
  let continued = false;
  refreshSessionUser(runtime.db)(req, {}, () => {
    continued = true;
  });
  assert.equal(req.session.role, 'student');
  assert.equal(continued, true);
  runtime.db.prepare('UPDATE users SET active=0 WHERE id=?').run(id);
  let destroyed = false;
  let cleared = false;
  req.session.destroy = (callback) => {
    destroyed = true;
    delete req.session;
    callback();
  };
  refreshSessionUser(runtime.db)(
    req,
    {
      clearCookie() {
        cleared = true;
      },
    },
    () => {},
  );
  assert.equal(destroyed, true);
  assert.equal(cleared, true);
});

test('legacy user tables gain new columns without changing stored credentials', (t) => {
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.prepare('INSERT INTO users (id, username, password) VALUES (42, ?, ?)').run(
    'existing-member',
    'preserve-password-hash',
  );
  const application = fixture(t, { db });
  t.after(() => db.close());
  const user = application.runtime.db.prepare('SELECT * FROM users WHERE id=42').get();
  assert.equal(user.username, 'existing-member');
  assert.equal(user.password, 'preserve-password-hash');
  assert.equal(user.active, 1);
  assert.equal(user.role, 'student');
  application.runtime.close();
  assert.equal(db.open, true, 'The factory must not close a caller-owned connection');
});
