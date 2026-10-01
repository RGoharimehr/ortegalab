'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const Database = require('better-sqlite3');
const { backup } = require('../scripts/backup');
const { loadConfig } = require('../src/server/config');

test('backup restores a live WAL database, uploads and private configuration', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'latfs-backup-test-'));
  const database = path.join(root, 'live.db');
  const db = new Database(database);
  try {
    db.pragma('journal_mode = WAL');
    db.exec("CREATE TABLE sample (value TEXT); INSERT INTO sample VALUES ('preserved')");
    const uploads = path.join(root, 'uploads');
    await fs.mkdir(uploads);
    await fs.writeFile(path.join(uploads, 'photo.txt'), 'photo');
    await fs.writeFile(path.join(root, '.env'), 'TEST_ONLY=true');
    const destination = path.join(root, 'backups');
    await fs.mkdir(destination);
    await fs.writeFile(path.join(destination, 'latfs-2020-01-01.tar.gz'), 'old');
    await fs.writeFile(path.join(destination, 'latfs-2020-01-02.tar.gz'), 'previous');
    await fs.writeFile(path.join(destination, 'unrelated.txt'), 'keep');
    const archive = await backup({ root, destination, database, uploads });
    assert.equal(
      (await fs.readdir(destination)).filter((name) => name.endsWith('.tar.gz')).length,
      2,
    );
    assert.equal(await fs.readFile(path.join(destination, 'unrelated.txt'), 'utf8'), 'keep');
    await assert.rejects(fs.stat(path.join(destination, 'latfs-2020-01-01.tar.gz')), {
      code: 'ENOENT',
    });
    assert.equal((await fs.stat(archive)).mode & 0o777, 0o600);
    const restore = path.join(root, 'restore');
    await fs.mkdir(restore);
    execFileSync('tar', ['-xzf', archive, '-C', restore]);
    const restored = new Database(path.join(restore, 'latfs.db'));
    assert.equal(restored.prepare('SELECT value FROM sample').get().value, 'preserved');
    restored.close();
    assert.equal(await fs.readFile(path.join(restore, '.env'), 'utf8'), 'TEST_ONLY=true');
    assert.equal(await fs.readFile(path.join(restore, 'uploads/photo.txt'), 'utf8'), 'photo');
  } finally {
    db.close();
    await fs.rm(root, { recursive: true, force: true });
  }
});
test('server bind address is configurable without breaking container defaults', () => {
  assert.equal(loadConfig({ env: { HOST: '127.0.0.1' } }).host, '127.0.0.1');
  assert.equal(loadConfig({ env: {} }).host, '0.0.0.0');
});
