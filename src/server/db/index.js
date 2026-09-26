'use strict';

const Database = require('better-sqlite3');
const { prepareDatabasePath, storageError } = require('../storage');
const { createSchema } = require('./schema');
const { migrateColumns, migrateData } = require('./migrations');
const { seedDatabase } = require('./seed');

function openDatabase(config, logger = console) {
  prepareDatabasePath(config.databasePath);
  let db;
  try {
    db = new Database(config.databasePath);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    initializeDatabase(db, config, logger);
    return db;
  } catch (error) {
    if (db?.open) db.close();
    if (/^SQLITE_(CANTOPEN|READONLY|IOERR)/.test(error.code || '')) {
      throw storageError('DATABASE_PATH', config.databasePath, error);
    }
    throw error;
  }
}

function initializeDatabase(db, config, logger = console) {
  db.transaction(() => {
    createSchema(db);
    migrateColumns(db);
    seedDatabase(db, config, logger);
    migrateData(db);
  })();
}

module.exports = { openDatabase, initializeDatabase };
