'use strict';

const { Router } = require('express');

function createSamplesRouter({
  db,
  str,
  searchTerm,
  likePattern,
  queryFlag,
  currentRole,
  isSampleApproverRole,
  normalizeSampleLifecycleStatus,
  normalizeSampleApprovalStatus,
  daysUntilExpr,
  requireAuth,
  requireCsrf,
  requireStaff,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // ── Sample registry ───────────────────────────────────────────────────────────
  router.get('/api/samples', apiReadLimiter, requireAuth, (req, res) => {
    const { status, project_id, search, expiring_soon, expired, low_qty, approval_status } =
      req.query;
    const role = currentRole(req);
    const canReview = isSampleApproverRole(role);
    const lifecycleStatus = status ? normalizeSampleLifecycleStatus(status, '') : '';
    if (status && !lifecycleStatus) return res.status(400).json({ error: 'invalid sample status' });
    const approvalStatus = approval_status
      ? normalizeSampleApprovalStatus(approval_status, '')
      : '';
    if (approval_status && !approvalStatus)
      return res.status(400).json({ error: 'invalid approval status' });
    let sql = `SELECT s.*, u.name AS created_by_name, u.username AS created_by_username,
        p.title AS project_title, au.name AS approved_by_name
      FROM sample_registry s
      LEFT JOIN users u ON u.id = s.created_by_id
      LEFT JOIN users au ON au.id = s.approved_by_id
      LEFT JOIN projects p ON p.id = s.project_id WHERE 1=1`;
    const params = [];
    if (!canReview) {
      sql += " AND (s.approval_status='approved' OR s.created_by_id=?)";
      params.push(req.session.userId);
    }
    if (lifecycleStatus) {
      sql += ' AND s.status=?';
      params.push(lifecycleStatus);
    }
    if (approvalStatus) {
      sql += ' AND s.approval_status=?';
      params.push(approvalStatus);
    }
    if (project_id) {
      sql += ' AND s.project_id=?';
      params.push(project_id);
    }
    if (queryFlag(expired)) {
      sql +=
        " AND s.expiry_date IS NOT NULL AND s.expiry_date != '' AND date(s.expiry_date) < date('now')";
    } else if (queryFlag(expiring_soon)) {
      sql +=
        " AND s.expiry_date IS NOT NULL AND s.expiry_date != '' AND date(s.expiry_date) BETWEEN date('now') AND date('now','+30 days')";
    }
    if (queryFlag(low_qty)) {
      sql += ' AND COALESCE(s.qty, 0) <= 0';
    }
    const q = searchTerm(search);
    if (q) {
      const like = likePattern(q);
      sql +=
        " AND (s.name LIKE ? ESCAPE '\\' OR COALESCE(s.location,'') LIKE ? ESCAPE '\\' OR COALESCE(s.sample_type,'') LIKE ? ESCAPE '\\' OR COALESCE(s.description,'') LIKE ? ESCAPE '\\' OR COALESCE(s.notes,'') LIKE ? ESCAPE '\\' OR COALESCE(p.title,'') LIKE ? ESCAPE '\\')";
      params.push(like, like, like, like, like, like);
    }
    const rows = db
      .prepare(
        `
      SELECT rows.*,
        ${daysUntilExpr('rows.expiry_date')} AS days_until_expiry
      FROM (${sql}) rows
      ORDER BY CASE rows.approval_status WHEN 'pending' THEN 0 WHEN 'denied' THEN 1 ELSE 2 END,
        CASE rows.status WHEN 'active' THEN 0 WHEN 'depleted' THEN 1 WHEN 'disposed' THEN 2 ELSE 3 END,
        CASE WHEN rows.expiry_date IS NOT NULL AND rows.expiry_date != '' THEN date(rows.expiry_date) ELSE date('2999-12-31') END ASC,
        rows.created_at DESC
      LIMIT 500
    `,
      )
      .all(...params);
    const summary = db
      .prepare(
        `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN vis.approval_status='approved' THEN 1 ELSE 0 END), 0) AS approved,
        COALESCE(SUM(CASE WHEN vis.approval_status='pending' THEN 1 ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN vis.approval_status='denied' THEN 1 ELSE 0 END), 0) AS denied,
        COALESCE(SUM(CASE WHEN vis.approval_status='approved' AND vis.status='active' THEN 1 ELSE 0 END), 0) AS active,
        COALESCE(SUM(CASE WHEN vis.approval_status='approved' AND vis.status='depleted' THEN 1 ELSE 0 END), 0) AS depleted,
        COALESCE(SUM(CASE WHEN vis.approval_status='approved' AND vis.status='disposed' THEN 1 ELSE 0 END), 0) AS disposed,
        COALESCE(SUM(CASE WHEN vis.approval_status='approved' AND vis.expiry_date IS NOT NULL AND vis.expiry_date != '' AND date(vis.expiry_date) < date('now') THEN 1 ELSE 0 END), 0) AS expired,
        COALESCE(SUM(CASE WHEN vis.approval_status='approved' AND vis.expiry_date IS NOT NULL AND vis.expiry_date != '' AND date(vis.expiry_date) BETWEEN date('now') AND date('now','+30 days') THEN 1 ELSE 0 END), 0) AS expiring_soon
      FROM (${sql}) vis
    `,
      )
      .get(...params);
    res.json({ rows, summary, can_review: canReview });
  });
  router.post('/api/samples', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const {
      name,
      sample_type,
      location,
      project_id,
      status,
      expiry_date,
      qty,
      unit,
      description,
      notes,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const role = currentRole(req);
    const canReview = isSampleApproverRole(role);
    const lifecycleStatus = normalizeSampleLifecycleStatus(status || 'active');
    const approvalStatus = canReview ? 'approved' : 'pending';
    const r = db
      .prepare(
        `INSERT INTO sample_registry
      (name, sample_type, location, project_id, created_by_id, status, approval_status, approved_by_id, approved_at, review_note, expiry_date, qty, unit, description, notes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        str(name, 300),
        sample_type || 'other',
        location || '',
        project_id || null,
        req.session.userId,
        lifecycleStatus,
        approvalStatus,
        canReview ? req.session.userId : null,
        canReview ? new Date().toISOString() : null,
        '',
        expiry_date || null,
        qty || 0,
        unit || 'unit',
        description || '',
        notes || '',
      );
    res.json({ id: r.lastInsertRowid, approval_status: approvalStatus });
  });
  router.put('/api/samples/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const smpl = db.prepare('SELECT * FROM sample_registry WHERE id=?').get(req.params.id);
    if (!smpl) return res.status(404).json({ error: 'not found' });
    const role = currentRole(req);
    const canReview = isSampleApproverRole(role);
    const isCreator = smpl.created_by_id === req.session.userId;
    if (!canReview && !isCreator) return res.status(403).json({ error: 'Forbidden' });
    if (!canReview && smpl.approval_status === 'approved') {
      return res.status(403).json({
        error: 'Approved samples can only be changed by an admin, professor, or moderator',
      });
    }
    const {
      name,
      sample_type,
      location,
      project_id,
      status,
      expiry_date,
      qty,
      unit,
      description,
      notes,
    } = req.body;
    const lifecycleStatus = normalizeSampleLifecycleStatus(status || smpl.status || 'active');
    const approvalStatus = canReview ? smpl.approval_status || 'approved' : 'pending';
    db.prepare(
      `UPDATE sample_registry SET name=?, sample_type=?, location=?, project_id=?,
      status=?, approval_status=?, approved_by_id=?, approved_at=?, review_note=?, expiry_date=?, qty=?, unit=?, description=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    ).run(
      str(name, 300),
      sample_type || 'other',
      location || '',
      project_id || null,
      lifecycleStatus,
      approvalStatus,
      canReview ? smpl.approved_by_id || null : null,
      canReview ? smpl.approved_at || null : null,
      canReview ? smpl.review_note || '' : '',
      expiry_date || null,
      qty || 0,
      unit || 'unit',
      description || '',
      notes || '',
      req.params.id,
    );
    res.json({ success: true, approval_status: approvalStatus });
  });
  router.post('/api/samples/:id/review', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const role = currentRole(req);
    if (!isSampleApproverRole(role))
      return res
        .status(403)
        .json({ error: 'Only an admin, professor, or moderator can review samples' });
    const smpl = db.prepare('SELECT id FROM sample_registry WHERE id=?').get(req.params.id);
    if (!smpl) return res.status(404).json({ error: 'not found' });
    const approvalStatus = normalizeSampleApprovalStatus(req.body.approval_status);
    if (!approvalStatus || !['approved', 'denied'].includes(approvalStatus)) {
      return res.status(400).json({ error: 'approval_status must be approved or denied' });
    }
    const reviewNote = str(req.body.review_note || '', 2000);
    db.prepare(
      `UPDATE sample_registry
      SET approval_status=?, approved_by_id=?, approved_at=CURRENT_TIMESTAMP, review_note=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?`,
    ).run(approvalStatus, req.session.userId, reviewNote, req.params.id);
    res.json({ success: true, approval_status: approvalStatus });
  });
  router.delete('/api/samples/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    db.prepare('DELETE FROM sample_registry WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });
  return router;
}

module.exports = { createSamplesRouter };
