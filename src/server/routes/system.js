'use strict';

const { Router } = require('express');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

function createSystemRouter({ db, config, sendInternalError, requireRole, adminOpLimiter }) {
  const router = Router();

  router.get('/healthz', (req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({ ok: true });
    } catch (_) {
      res.status(503).json({ ok: false });
    }
  });

  router.get('/', (req, res) => res.sendFile(path.join(config.publicPath, 'index.html')));
  router.get('/admin', (req, res) => res.sendFile(path.join(config.publicPath, 'admin.html')));
  router.get('/platform', (req, res) =>
    res.sendFile(path.join(config.publicPath, 'platform.html')),
  );

  router.get('/reset-password', (req, res) =>
    res.sendFile(path.join(config.publicPath, 'reset-password.html')),
  );

  // ── Admin: database backup download ─────────────────────────────────────────
  router.get('/api/admin/backup', adminOpLimiter, requireRole('admin'), (req, res) => {
    const backupPath = path.join(os.tmpdir(), `latfs-backup-${Date.now()}.db`);
    try {
      db.backup(backupPath)
        .then(() => {
          const ts = new Date().toISOString().slice(0, 10);
          res.download(backupPath, `latfs-backup-${ts}.db`, (err) => {
            fs.unlink(backupPath, () => {});
            if (err && !res.headersSent) res.status(500).json({ error: 'Backup download failed' });
          });
        })
        .catch((err) => sendInternalError(res, err, 'admin backup'));
    } catch (e) {
      sendInternalError(res, e, 'admin backup');
    }
  });

  return router;
}

module.exports = { createSystemRouter };
