'use strict';

const rateLimit = require('express-rate-limit');

function createRateLimiters() {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const apiWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const apiReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  // Strict limiter for heavy admin operations (e.g. DB backup, password reset)
  const adminOpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const uploadRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });
  return {
    authLimiter,
    apiWriteLimiter,
    apiReadLimiter,
    adminOpLimiter,
    uploadRateLimiter,
    passwordResetLimiter,
  };
}

module.exports = { createRateLimiters };
