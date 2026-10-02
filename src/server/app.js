'use strict';

const express = require('express');
const { loadConfig } = require('./config');
const { ensureWritableDirectory } = require('./storage');
const { openDatabase, initializeDatabase } = require('./db');
const SQLiteSessionStore = require('./session-store');
const { configureHttp, createErrorHandler } = require('./middleware/http');
const auth = require('./middleware/auth');
const { createRateLimiters } = require('./middleware/limits');
const { createMailService } = require('./services/mail');
const { createUploadService } = require('./services/uploads');
const { createPeopleService } = require('./services/people');
const { createEquipmentService } = require('./services/equipment');
const { createTasksService } = require('./services/tasks');
const { createBackupCodesService } = require('./services/backup-codes');
const { registerRoutes } = require('./routes');

/** Construct an isolated application without opening a network listener. */
function createApp(options = {}) {
  const config = loadConfig(options);
  const logger = options.logger || console;
  // Fail before allocating the database or session store if a mounted upload
  // directory cannot be used by the configured runtime user.
  ensureWritableDirectory(config.uploadsPath, 'UPLOADS_PATH');
  const db = options.db || openDatabase(config, logger);
  if (options.db) initializeDatabase(db, config, logger);
  const sessionStore = options.sessionStore || new SQLiteSessionStore({ db });
  const mail = createMailService(config, logger);
  const uploads = createUploadService({ db, config, logger });
  const app = express();
  configureHttp(app, { config, db, sessionStore, logger });
  app.use(
    '/uploads',
    uploads.authorizeUpload,
    express.static(config.uploadsPath, {
      dotfiles: 'deny',
      index: false,
      setHeaders(res) {
        if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );
  app.use((req, res, next) => {
    if (/^\/(?:admin|platform|reset-password)(?:\.html)?(?:\/|$)/.test(req.path))
      res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
  app.use(require('./routes/seo').createSeoRouter({ db, config }));
  app.use(express.static(config.publicPath, { dotfiles: 'deny', index: false }));
  const dependencies = {
    db,
    config,
    ...auth,
    ...createRateLimiters(),
    ...require('./services/validation'),
    ...require('./services/roles'),
    ...require('./services/queries'),
    ...createPeopleService(db),
    ...createEquipmentService(db),
    ...createTasksService(db),
    ...createBackupCodesService(db),
    ...mail,
    ...uploads,
    sendInternalError(res, error, context = 'request') {
      logger.error(`[${context}]`, error);
      return res.status(500).json({ error: 'Internal server error' });
    },
  };
  registerRoutes(app, dependencies);
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(createErrorHandler(logger));
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    if (!options.sessionStore) sessionStore.close?.();
    mail.close();
    if (!options.db && db.open) db.close();
  }
  return { app, db, config, sessionStore, close };
}

module.exports = { createApp };
