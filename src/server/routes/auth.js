'use strict';

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { BCRYPT_ROUNDS } = require('../config');
const crypto = require('node:crypto');
const { authenticator } = require('otplib');

function createAuthRouter({
  db,
  config,
  mailer,
  sendMail,
  canAccessAdminSurfaceRole,
  withUserProfile,
  requireCsrf,
  authLimiter,
  passwordResetLimiter,
}) {
  const router = Router();

  function hashResetToken(token) {
    return crypto
      .createHash('sha256')
      .update(String(token || ''))
      .digest('hex');
  }

  // Admin auth routes
  router.post('/admin/login', authLimiter, (req, res) => {
    const { username, password, totp_code, remember_me } = req.body || {};
    if (
      typeof username !== 'string' ||
      !username.trim() ||
      username.length > 120 ||
      typeof password !== 'string' ||
      !password ||
      password.length > 1024
    ) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const ip = req.ip || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';

    const logEvent = (userId, uname, success, reason) => {
      try {
        db.prepare(
          'INSERT INTO login_events (user_id, username, success, reason, ip, user_agent) VALUES (?,?,?,?,?,?)',
        ).run(userId || null, uname || '', success ? 1 : 0, reason, ip, ua.slice(0, 500));
      } catch (_) {
        /* A failed audit write must not obscure an authentication result. */
      }
    };

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    // Unknown user — generic error (prevent enumeration)
    if (!user || !user.active) {
      logEvent(null, username, false, 'bad_password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Account lockout check
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (lockedUntil > new Date()) {
        logEvent(user.id, username, false, 'locked');
        const secsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
        return res.status(429).json({ error: `Account locked. Try again in ${secsLeft} seconds.` });
      } else {
        // Lock expired — reset
        db.prepare('UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?').run(user.id);
      }
    }

    if (!bcrypt.compareSync(password, user.password)) {
      // Increment failed attempts — lock after 10
      const newAttempts = (user.failed_attempts || 0) + 1;
      if (newAttempts >= 10) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min
        db.prepare('UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?').run(
          newAttempts,
          lockUntil,
          user.id,
        );
        logEvent(user.id, username, false, 'bad_password');
        return res
          .status(429)
          .json({ error: 'Too many failed attempts. Account locked for 30 minutes.' });
      }
      db.prepare('UPDATE users SET failed_attempts=? WHERE id=?').run(newAttempts, user.id);
      logEvent(user.id, username, false, 'bad_password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Password correct — check 2FA if enabled
    if (user.totp_enabled) {
      if (!totp_code) {
        // Signal to the client that 2FA is required (password was correct)
        logEvent(user.id, username, false, '2fa_required');
        return res.status(200).json({ totp_required: true });
      }
      const totpRow = db
        .prepare('SELECT secret FROM totp_secrets WHERE user_id=? AND enabled=1')
        .get(user.id);
      const codeStr = String(totp_code).trim();

      // Check TOTP code first
      let twoFaOk = totpRow && authenticator.check(codeStr, totpRow.secret);

      // If TOTP didn't match, try one-time backup codes
      if (!twoFaOk) {
        const cleanCode = codeStr.replace(/-/g, '').toUpperCase();
        const unusedCodes = db
          .prepare('SELECT id, code_hash FROM totp_backup_codes WHERE user_id=? AND used=0')
          .all(user.id);
        for (const bc of unusedCodes) {
          if (bcrypt.compareSync(cleanCode, bc.code_hash)) {
            db.prepare(
              'UPDATE totp_backup_codes SET used=1, used_at=CURRENT_TIMESTAMP WHERE id=?',
            ).run(bc.id);
            twoFaOk = true;
            break;
          }
        }
      }

      if (!twoFaOk) {
        const newAttempts = (user.failed_attempts || 0) + 1;
        db.prepare('UPDATE users SET failed_attempts=? WHERE id=?').run(newAttempts, user.id);
        logEvent(user.id, username, false, '2fa_bad');
        return res.status(401).json({ error: 'Invalid two-factor code' });
      }
    }

    // ── Successful login ──
    db.prepare(
      'UPDATE users SET failed_attempts=0, locked_until=NULL, last_login_at=CURRENT_TIMESTAMP, last_login_ip=? WHERE id=?',
    ).run(ip, user.id);
    logEvent(user.id, username, true, '');

    // New-IP email notification (fire-and-forget)
    if (mailer && user.email && user.last_login_ip && user.last_login_ip !== ip) {
      sendMail(
        user.email,
        'New sign-in to your LATFS account from a different location',
        `Hi ${user.name || user.username},\n\nA sign-in to your LATFS account was detected from a new IP address.\n\nIP address : ${ip}\nTime       : ${new Date().toUTCString()}\nBrowser    : ${ua.slice(0, 200)}\n\nIf this was you, no action is needed.\nIf this was NOT you, contact your lab administrator immediately and change your password.\n\n— LATFS Security`,
      );
    }

    // ── Prevent session fixation: regenerate session ID before committing identity ──
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error — please try again' });
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role || 'student';
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');

      // Remember Me — extend session lifetime to 30 days
      if (remember_me) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      }

      req.session.save((saveErr) => {
        if (saveErr) return res.status(500).json({ error: 'Session error — please try again' });
        res.json({
          success: true,
          username: user.username,
          name: user.name || '',
          role: user.role || 'student',
          csrfToken: req.session.csrfToken,
        });
      });
    });
  });

  router.post('/admin/logout', requireCsrf, (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });

  router.get('/admin/check', (req, res) => {
    if (req.session && req.session.userId) {
      if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      }
      const rawUser =
        db
          .prepare('SELECT id, username, name, role, email, person_id FROM users WHERE id=?')
          .get(req.session.userId) || {};
      const u = withUserProfile(rawUser) || {};
      if (!canAccessAdminSurfaceRole(u.role || req.session.role || 'student')) {
        return res.json({
          loggedIn: false,
          role: u.role || req.session.role || 'student',
          message:
            'Use the lab platform for member workflows. Admin access requires moderator, professor, or admin permission.',
        });
      }
      res.json({
        loggedIn: true,
        username: req.session.username,
        name: u.name || '',
        role: u.role || req.session.role || 'student',
        email: u.email || '',
        person_id: u.person_id || null,
        photo_url: u.photo_url || '',
        photo_position: u.photo_position || 'center center',
        csrfToken: req.session.csrfToken,
      });
    } else {
      res.json({ loggedIn: false });
    }
  });

  router.post('/api/forgot-password', passwordResetLimiter, (req, res) => {
    const { email } = req.body;
    // Always return success to prevent user enumeration
    res.json({
      success: true,
      message: 'If that email is registered, a reset link has been sent.',
    });
    if (!email || !mailer) return;
    const user = db
      .prepare('SELECT id, name, email FROM users WHERE email=? AND active!=0')
      .get(email.toLowerCase().trim());
    if (!user) return;
    // Delete any existing tokens for this user
    db.prepare('DELETE FROM password_reset_tokens WHERE user_id=?').run(user.id);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(token);
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    db.prepare('INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?,?,?)').run(
      tokenHash,
      user.id,
      expires,
    );
    const resetUrl = `${config.baseUrl}/reset-password?token=${token}`;
    sendMail(
      user.email,
      '[LATFS] Password reset request',
      `Hi ${user.name || user.email},\n\nSomeone requested a password reset for your LATFS account.\n\nReset link (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n`,
    );
  });

  router.post('/api/reset-password', passwordResetLimiter, (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'token and password required' });
    if (password.length < 12)
      return res.status(400).json({ error: 'password must be at least 12 characters' });
    const tokenHash = hashResetToken(token);
    // Clean up expired tokens
    db.prepare(
      "DELETE FROM password_reset_tokens WHERE datetime(expires_at) < datetime('now')",
    ).run();
    const row = db.prepare('SELECT * FROM password_reset_tokens WHERE token=?').get(tokenHash);
    if (!row) return res.status(400).json({ error: 'Invalid or expired reset token' });
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, row.user_id);
    db.prepare('DELETE FROM password_reset_tokens WHERE token=?').run(tokenHash);
    res.json({ success: true });
  });
  return router;
}

module.exports = { createAuthRouter };
