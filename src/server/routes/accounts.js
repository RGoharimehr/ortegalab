'use strict';

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { BCRYPT_ROUNDS } = require('../config');
const crypto = require('node:crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

function createAccountsRouter({
  db,
  sendInternalError,
  normalizeUserRole,
  withUserProfile,
  generateAndStoreBackupCodes,
  requireAuth,
  requireCsrf,
  requireStaff,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // ---- Self / current user ----
  router.get('/api/me', apiReadLimiter, requireAuth, (req, res) => {
    const rawUser = db
      .prepare(
        'SELECT id, username, name, role, email, person_id, totp_enabled, last_login_at, last_login_ip FROM users WHERE id=?',
      )
      .get(req.session.userId);
    const u = withUserProfile(rawUser);
    if (!u) return res.status(401).json({ error: 'Auth required' });
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    res.json({ loggedIn: true, ...u, csrfToken: req.session.csrfToken });
  });

  // Legacy self-edit endpoint: identity changes now belong to staff in Web Admin.
  router.put('/api/me/profile', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    res.status(403).json({ error: 'People details are managed in Web Admin by lab staff.' });
  });

  // Self-service: change own password
  router.put('/api/me/password', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'current_password and new_password required' });
    if (new_password.length < 12)
      return res.status(400).json({ error: 'New password must be at least 12 characters' });
    const user = db.prepare('SELECT password FROM users WHERE id=?').get(req.session.userId);
    if (!user || !bcrypt.compareSync(current_password, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hash = bcrypt.hashSync(new_password, BCRYPT_ROUNDS);
    db.prepare('UPDATE users SET password=?, failed_attempts=0, locked_until=NULL WHERE id=?').run(
      hash,
      req.session.userId,
    );
    res.json({ success: true });
  });

  // ── TOTP / 2FA endpoints ─────────────────────────────────────────────────────

  // Begin TOTP enrollment: generate a new secret and return a QR code URI
  router.post('/api/me/totp/setup', apiWriteLimiter, requireAuth, requireCsrf, async (req, res) => {
    try {
      const user = db
        .prepare('SELECT username, email FROM users WHERE id=?')
        .get(req.session.userId);
      const secret = authenticator.generateSecret(20);
      const issuer = 'LATFS';
      const otpauth = authenticator.keyuri(user.email || user.username, issuer, secret);
      const qrDataUrl = await QRCode.toDataURL(otpauth);
      // Store secret as pending (enabled=0) — becomes active after first verify
      db.prepare(
        'INSERT INTO totp_secrets (user_id, secret, enabled) VALUES (?,?,0) ON CONFLICT(user_id) DO UPDATE SET secret=excluded.secret, enabled=0',
      ).run(req.session.userId, secret);
      res.json({ secret, otpauth, qr: qrDataUrl });
    } catch (e) {
      sendInternalError(res, e, 'totp setup');
    }
  });

  // Verify a TOTP code and activate 2FA for the account
  router.post('/api/me/totp/verify', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const row = db
      .prepare('SELECT secret FROM totp_secrets WHERE user_id=?')
      .get(req.session.userId);
    if (!row)
      return res
        .status(400)
        .json({ error: 'No TOTP setup in progress. Call /api/me/totp/setup first.' });
    if (!authenticator.check(String(code), row.secret)) {
      return res
        .status(400)
        .json({ error: 'Invalid code — check your authenticator app and try again' });
    }
    db.prepare(
      'UPDATE totp_secrets SET enabled=1, enrolled_at=CURRENT_TIMESTAMP WHERE user_id=?',
    ).run(req.session.userId);
    db.prepare('UPDATE users SET totp_enabled=1 WHERE id=?').run(req.session.userId);
    const backupCodes = generateAndStoreBackupCodes(req.session.userId);
    res.json({ success: true, message: '2FA enabled successfully', backup_codes: backupCodes });
  });

  // Regenerate backup codes (user must be authenticated and have TOTP enabled)
  router.post(
    '/api/me/totp/backup-codes',
    apiWriteLimiter,
    requireAuth,
    requireCsrf,
    (req, res) => {
      const user = db.prepare('SELECT totp_enabled FROM users WHERE id=?').get(req.session.userId);
      if (!user || !user.totp_enabled)
        return res.status(400).json({ error: '2FA must be enabled before managing backup codes' });
      const backupCodes = generateAndStoreBackupCodes(req.session.userId);
      res.json({ backup_codes: backupCodes });
    },
  );

  // Count remaining (unused) backup codes for the current user
  router.get('/api/me/totp/backup-codes', apiReadLimiter, requireAuth, (req, res) => {
    const count = db
      .prepare('SELECT COUNT(*) as n FROM totp_backup_codes WHERE user_id=? AND used=0')
      .get(req.session.userId);
    res.json({ remaining: count ? count.n : 0 });
  });

  // Disable TOTP — requires current password for safety
  router.delete('/api/me/totp', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password required to disable 2FA' });
    const user = db.prepare('SELECT password FROM users WHERE id=?').get(req.session.userId);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Incorrect password' });
    }
    db.prepare('DELETE FROM totp_secrets WHERE user_id=?').run(req.session.userId);
    db.prepare('DELETE FROM totp_backup_codes WHERE user_id=?').run(req.session.userId);
    db.prepare('UPDATE users SET totp_enabled=0 WHERE id=?').run(req.session.userId);
    res.json({ success: true, message: '2FA disabled' });
  });

  // ── Admin: login audit log ───────────────────────────────────────────────────
  router.get('/api/admin/login-events', apiReadLimiter, requireStaff, (req, res) => {
    const { page, limit, user_id } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    let sql =
      'SELECT l.*, u.name AS user_name FROM login_events l LEFT JOIN users u ON u.id=l.user_id';
    const params = [];
    if (user_id) {
      sql += ' WHERE l.user_id=?';
      params.push(user_id);
    }
    sql += ' ORDER BY l.id DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (pageNum - 1) * pageSize);
    const rows = db.prepare(sql).all(...params);
    const total = user_id
      ? db.prepare('SELECT COUNT(*) as n FROM login_events WHERE user_id=?').get(user_id).n
      : db.prepare('SELECT COUNT(*) as n FROM login_events').get().n;
    res.json({ total, page: pageNum, limit: pageSize, rows });
  });

  // Admin: unlock a locked user account
  router.post(
    '/api/admin/users/:id/unlock',
    apiWriteLimiter,
    requireStaff,
    requireCsrf,
    (req, res) => {
      db.prepare('UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?').run(
        req.params.id,
      );
      res.json({ success: true });
    },
  );

  // ---- Users (admin/professor manage; everyone can list lightweight roster for assignment) ----
  router.get('/api/users', apiReadLimiter, requireAuth, (req, res) => {
    const includeDisabled =
      req.query.include_disabled === '1' && ['admin', 'professor'].includes(req.session.role);
    const rows = db
      .prepare(
        `SELECT id, username, name, role, email, active FROM users ${includeDisabled ? '' : 'WHERE active!=0'} ORDER BY role, name, username`,
      )
      .all();
    res.json(rows);
  });
  router.post('/api/users', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { username, password, name, role, email } = req.body;
    const normalizedRole = normalizeUserRole(role);
    if (!username || !password || !normalizedRole)
      return res.status(400).json({ error: 'username, password, valid role required' });
    if (password.length < 12)
      return res.status(400).json({ error: 'Password must be at least 12 characters' });
    if (db.prepare('SELECT 1 FROM users WHERE username=?').get(username))
      return res.status(409).json({ error: 'username exists' });
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    const r = db
      .prepare(
        'INSERT INTO users (username, password, name, role, email, active) VALUES (?,?,?,?,?,1)',
      )
      .run(username, hash, name || '', normalizedRole, email || '');
    res.json({ id: r.lastInsertRowid });
  });
  router.put('/api/users/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const { name, role, email, active, password } = req.body;
    if (
      Number(req.params.id) === req.session.userId &&
      (active === false || (role !== undefined && !['admin', 'professor'].includes(role)))
    ) {
      return res
        .status(400)
        .json({ error: 'You cannot disable your own account or remove your own staff access' });
    }
    const sets = [],
      params = [];
    if (name !== undefined) {
      sets.push('name=?');
      params.push(name);
    }
    if (role !== undefined) {
      const normalizedRole = normalizeUserRole(role);
      if (!normalizedRole) return res.status(400).json({ error: 'valid role required' });
      sets.push('role=?');
      params.push(normalizedRole);
    }
    if (email !== undefined) {
      sets.push('email=?');
      params.push(email);
    }
    if (active !== undefined) {
      sets.push('active=?');
      params.push(active ? 1 : 0);
    }
    if (password) {
      if (password.length < 12)
        return res.status(400).json({ error: 'Password must be at least 12 characters' });
      sets.push('password=?');
      params.push(bcrypt.hashSync(password, BCRYPT_ROUNDS));
    }
    if (!sets.length) return res.json({ success: true });
    params.push(req.params.id);
    const result = db.prepare('UPDATE users SET ' + sets.join(', ') + ' WHERE id=?').run(...params);
    if (!result.changes) return res.status(404).json({ error: 'not found' });
    res.json({ success: true });
  });
  router.delete('/api/users/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    if (Number(req.params.id) === req.session.userId)
      return res.status(400).json({ error: "can't delete self" });
    db.prepare('UPDATE users SET active=0 WHERE id=?').run(req.params.id); // soft-delete
    res.json({ success: true });
  });
  return router;
}

module.exports = { createAccountsRouter };
