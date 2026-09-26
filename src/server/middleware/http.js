'use strict';

const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const { refreshSessionUser } = require('./auth');

function configureHttp(app, { config, db, sessionStore, logger }) {
  app.disable('x-powered-by');
  if (config.isProduction) app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: config.isProduction ? [] : null,
        },
      },
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true, limit: '256kb' }));
  app.use(
    session({
      store: sessionStore,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'strict',
        secure: config.isProduction,
        httpOnly: true,
      },
    }),
  );
  app.use(refreshSessionUser(db));
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () =>
      logger.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`),
    );
    next();
  });
}

function createErrorHandler(logger = console) {
  return (error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'Invalid JSON body' });
    if (error.type === 'entity.too.large')
      return res.status(413).json({ error: 'Request body too large' });
    logger.error('Unhandled route error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  };
}

module.exports = { configureHttp, createErrorHandler };
