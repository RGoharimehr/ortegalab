'use strict';

/**
 * Truncate a user-supplied string to `max` characters.
 * Prevents oversized strings from being stored in SQLite.
 */
function str(v, max) {
  return String(v == null ? '' : v).slice(0, max);
}

function clampInt(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function searchTerm(value, max = 160) {
  return str(value, max).trim();
}

function likePattern(value) {
  return `%${String(value).replace(/[\\%_]/g, '\\$&')}%`;
}

function queryFlag(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

function publicLimit(value, fallback = 250, max = 250) {
  return clampInt(value, fallback, { min: 1, max });
}

module.exports = { str, clampInt, searchTerm, likePattern, queryFlag, publicLimit };
