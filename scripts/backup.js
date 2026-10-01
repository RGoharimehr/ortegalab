'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const Database = require('better-sqlite3');

async function backup({ root, destination, database, uploads, retain = 14 }) {
  if (!Number.isInteger(retain) || retain < 1) throw new Error('Invalid backup retention');
  process.umask(0o077);
  await fs.mkdir(destination, { recursive: true, mode: 0o700 });
  const name = `latfs-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const stage = await fs.mkdtemp(path.join(destination, '.staging-'));
  const archive = path.join(destination, `${name}.tar.gz`);
  try {
    const db = new Database(database, { readonly: true, fileMustExist: true });
    try {
      await db.backup(path.join(stage, 'latfs.db'));
    } finally {
      db.close();
    }
    const snapshot = new Database(path.join(stage, 'latfs.db'), { readonly: true });
    try {
      if (snapshot.pragma('integrity_check', { simple: true }) !== 'ok')
        throw new Error('Database backup integrity check failed');
    } finally {
      snapshot.close();
    }
    await fs.copyFile(path.join(root, '.env'), path.join(stage, '.env'));
    await fs.cp(uploads, path.join(stage, 'uploads'), { recursive: true });
    await fs.writeFile(
      path.join(stage, 'manifest.json'),
      JSON.stringify({
        createdAt: new Date().toISOString(),
        database: 'latfs.db',
        uploads: 'uploads',
      }),
    );
    execFileSync('tar', ['-czf', `${archive}.partial`, '-C', stage, '.']);
    await fs.rename(`${archive}.partial`, archive);
    const previous = (await fs.readdir(destination))
      .filter((file) => /^latfs-\d{4}-.*\.tar\.gz$/.test(file))
      .sort()
      .reverse();
    for (const file of previous.slice(retain)) await fs.unlink(path.join(destination, file));
    return archive;
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
    await fs.rm(`${archive}.partial`, { force: true });
  }
}

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  backup({
    root,
    destination: process.env.BACKUP_DIR || path.join(require('node:os').homedir(), 'latfs-backups'),
    database: process.env.DATABASE_PATH || path.join(root, 'latfs.db'),
    uploads: process.env.UPLOADS_PATH || path.join(root, 'uploads'),
  })
    .then((archive) => console.log(`Backup verified: ${archive}`))
    .catch((error) => {
      console.error(`Backup failed: ${error.message}`);
      process.exitCode = 1;
    });
}
module.exports = { backup };
