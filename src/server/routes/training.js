'use strict';

const { Router } = require('express');

function createTrainingRouter({
  db,
  str,
  searchTerm,
  likePattern,
  queryFlag,
  daysUntilExpr,
  requireAuth,
  requireCsrf,
  requireStaff,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // ── Training & certification records ─────────────────────────────────────────
  router.get('/api/training', apiReadLimiter, requireAuth, (req, res) => {
    const { user_id, equipment_id, training_type, expiring_soon, expired, search } = req.query;
    let sql = `SELECT t.*, u.name AS user_name, u.username,
      e.name AS equipment_name
      FROM training_records t
      JOIN users u ON u.id=t.user_id
      LEFT JOIN equipment e ON e.id=t.equipment_id WHERE 1=1`;
    const params = [];
    if (user_id) {
      sql += ' AND t.user_id=?';
      params.push(user_id);
    }
    if (equipment_id) {
      sql += ' AND t.equipment_id=?';
      params.push(equipment_id);
    }
    if (training_type) {
      sql += ' AND t.training_type=?';
      params.push(training_type);
    }
    if (queryFlag(expired)) {
      sql +=
        " AND t.expires_at IS NOT NULL AND t.expires_at != '' AND date(t.expires_at) < date('now')";
    } else if (queryFlag(expiring_soon)) {
      sql +=
        " AND t.expires_at IS NOT NULL AND t.expires_at != '' AND date(t.expires_at) BETWEEN date('now') AND date('now','+60 days')";
    }
    const q = searchTerm(search);
    if (q) {
      const like = likePattern(q);
      sql +=
        " AND (t.training_name LIKE ? ESCAPE '\\' OR COALESCE(t.notes,'') LIKE ? ESCAPE '\\' OR COALESCE(u.name,'') LIKE ? ESCAPE '\\' OR COALESCE(u.username,'') LIKE ? ESCAPE '\\' OR COALESCE(e.name,'') LIKE ? ESCAPE '\\')";
      params.push(like, like, like, like, like);
    }
    const rows = db
      .prepare(
        `
      SELECT rows.*,
        ${daysUntilExpr('rows.expires_at')} AS days_until_expiry
      FROM (${sql}) rows
      ORDER BY CASE
        WHEN rows.expires_at IS NOT NULL AND rows.expires_at != '' AND date(rows.expires_at) < date('now') THEN 0
        WHEN rows.expires_at IS NOT NULL AND rows.expires_at != '' AND date(rows.expires_at) <= date('now','+60 days') THEN 1
        ELSE 2
      END,
      rows.completed_at DESC
      LIMIT 500
    `,
      )
      .all(...params);
    const summary = db
      .prepare(
        `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN t.expires_at IS NOT NULL AND t.expires_at != '' AND date(t.expires_at) < date('now') THEN 1 ELSE 0 END), 0) AS expired,
        COALESCE(SUM(CASE WHEN t.expires_at IS NOT NULL AND t.expires_at != '' AND date(t.expires_at) BETWEEN date('now') AND date('now','+60 days') THEN 1 ELSE 0 END), 0) AS expiring_soon,
        COALESCE(SUM(CASE WHEN t.expires_at IS NULL OR t.expires_at = '' THEN 1 ELSE 0 END), 0) AS no_expiry,
        COUNT(DISTINCT t.user_id) AS members,
        COALESCE(SUM(CASE WHEN t.equipment_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS equipment_linked
      FROM training_records t
      JOIN users u ON u.id=t.user_id
      LEFT JOIN equipment e ON e.id=t.equipment_id
      WHERE 1=1
        ${user_id ? 'AND t.user_id=?' : ''}
        ${equipment_id ? 'AND t.equipment_id=?' : ''}
        ${training_type ? 'AND t.training_type=?' : ''}
        ${queryFlag(expired) ? "AND t.expires_at IS NOT NULL AND t.expires_at != '' AND date(t.expires_at) < date('now')" : ''}
        ${!queryFlag(expired) && queryFlag(expiring_soon) ? "AND t.expires_at IS NOT NULL AND t.expires_at != '' AND date(t.expires_at) BETWEEN date('now') AND date('now','+60 days')" : ''}
        ${q ? "AND (t.training_name LIKE ? ESCAPE '\\' OR COALESCE(t.notes,'') LIKE ? ESCAPE '\\' OR COALESCE(u.name,'') LIKE ? ESCAPE '\\' OR COALESCE(u.username,'') LIKE ? ESCAPE '\\' OR COALESCE(e.name,'') LIKE ? ESCAPE '\\')" : ''}
    `,
      )
      .get(...params);
    res.json({ rows, summary });
  });
  router.post('/api/training', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const {
      user_id,
      equipment_id,
      training_type,
      training_name,
      completed_at,
      expires_at,
      certified_by,
      notes,
    } = req.body;
    if (!user_id || !training_name || !completed_at)
      return res.status(400).json({ error: 'user_id, training_name, completed_at required' });
    const r = db
      .prepare(
        `INSERT INTO training_records
      (user_id, equipment_id, training_type, training_name, completed_at, expires_at, certified_by, notes)
      VALUES (?,?,?,?,?,?,?,?)`,
      )
      .run(
        user_id,
        equipment_id || null,
        training_type || 'equipment',
        str(training_name, 300),
        completed_at,
        expires_at || null,
        certified_by || '',
        notes || '',
      );
    res.json({ id: r.lastInsertRowid });
  });
  router.put('/api/training/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const {
      user_id,
      equipment_id,
      training_type,
      training_name,
      completed_at,
      expires_at,
      certified_by,
      notes,
    } = req.body;
    db.prepare(
      `UPDATE training_records SET user_id=?, equipment_id=?, training_type=?, training_name=?,
      completed_at=?, expires_at=?, certified_by=?, notes=? WHERE id=?`,
    ).run(
      user_id,
      equipment_id || null,
      training_type || 'equipment',
      str(training_name, 300),
      completed_at,
      expires_at || null,
      certified_by || '',
      notes || '',
      req.params.id,
    );
    res.json({ success: true });
  });
  router.delete('/api/training/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM training_records WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });
  return router;
}

module.exports = { createTrainingRouter };
