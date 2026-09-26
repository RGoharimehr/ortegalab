'use strict';

const crypto = require('node:crypto');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const BCRYPT_ROUNDS = 12;

function loadConfig(options = {}) {
  const env = options.env || process.env;
  const isProduction = env.NODE_ENV === 'production';
  const sessionSecret = options.sessionSecret || env.SESSION_SECRET;
  if (isProduction && !sessionSecret) {
    throw new Error('SESSION_SECRET is required in production');
  }
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error('PORT must be between 0 and 65535');
  return Object.freeze({
    port,
    isProduction,
    baseUrl: (env.BASE_URL || 'https://latfs.villanova.edu').replace(/\/$/, ''),
    databasePath: options.databasePath || env.DATABASE_PATH || path.join(PROJECT_ROOT, 'latfs.db'),
    uploadsPath: path.resolve(
      options.uploadsPath || env.UPLOADS_PATH || path.join(PROJECT_ROOT, 'uploads'),
    ),
    publicPath: path.join(PROJECT_ROOT, 'public'),
    sessionSecret: sessionSecret || crypto.randomBytes(64).toString('hex'),
    seedDemo: options.seedDemo ?? env.SEED_DEMO_DATA === 'true',
    adminSeedPassword: env.ADMIN_SEED_PASSWORD || '',
    labSeedPassword: env.LAB_SEED_PASSWORD || '',
    smtp: {
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 587,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.SMTP_FROM || env.SMTP_USER || 'no-reply@latfs.lab',
    },
  });
}

module.exports = { loadConfig, BCRYPT_ROUNDS };
