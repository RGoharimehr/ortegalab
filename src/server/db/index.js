'use strict';

const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { createSchema } = require('./schema');
const { migrateColumns, migrateData } = require('./migrations');
const { seedDatabase } = require('./seed');

function openDatabase(config, logger = console) {
  if (config.databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(config.databasePath)), { recursive: true });
  }
  const db = new Database(config.databasePath);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    initializeDatabase(db, config, logger);
    return db;
  } catch (error) {
    db.close();
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
