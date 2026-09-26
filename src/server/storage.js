'use strict';

const fs = require('node:fs');
const path = require('node:path');

function storageError(setting, location, cause) {
  const identity =
    typeof process.getuid === 'function'
      ? `UID ${process.getuid()}, GID ${process.getgid()}`
      : 'the current runtime user';
  const error = new Error(
    `Cannot use ${setting} "${location}" as ${identity}: ${cause.message}. ` +
      'The configured directory and existing files must be writable by this user. ' +
      'Check persistent-disk ownership and read-only mounts; retain the path to your existing data.',
    { cause },
  );
  error.code = cause.code || 'STORAGE_NOT_WRITABLE';
  return error;
}

function ensureWritableDirectory(directory, setting) {
  const resolved = path.resolve(directory);
  try {
    fs.mkdirSync(resolved, { recursive: true, mode: 0o750 });
    fs.accessSync(resolved, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
  } catch (cause) {
    throw storageError(setting, resolved, cause);
  }
}

function prepareDatabasePath(databasePath) {
  if (databasePath === ':memory:') return;
  const resolved = path.resolve(databasePath);
  // SQLite also writes journal, WAL and shared-memory files beside the database.
  // A writable .db file alone is insufficient when its parent is read-only.
  ensureWritableDirectory(path.dirname(resolved), 'DATABASE_PATH');
  try {
    if (fs.existsSync(resolved)) {
      if (!fs.statSync(resolved).isFile()) throw new Error('The database path must name a file');
      fs.accessSync(resolved, fs.constants.R_OK | fs.constants.W_OK);
    }
  } catch (cause) {
    throw storageError('DATABASE_PATH', resolved, cause);
  }
}

module.exports = { ensureWritableDirectory, prepareDatabasePath, storageError };
