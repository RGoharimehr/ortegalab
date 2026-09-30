'use strict';

const { Router } = require('express');

function createEquipmentRouter({
  db,
  clampInt,
  searchTerm,
  likePattern,
  queryFlag,
  currentRole,
  isLabStaffRole,
  equipmentDueCase,
  equipmentOrderBy,
  syncEquipmentMaintenanceState,
  validateReservationWindow,
  findReservationConflict,
  getEquipmentTrainingStatus,
  equipmentAccessError,
  requireAuth,
  requireCsrf,
  requireStaff,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // ---- Equipment ----
  router.get('/api/equipment', apiReadLimiter, requireAuth, (req, res) => {
    const { page, limit, category, status, search, due, mine, reservations, sort, training } =
      req.query;
    const pageNum = clampInt(page, 1, { min: 1, max: 100000 });
    const pageSize = clampInt(limit, 200, { min: 1, max: 200 });
    const baseParams = [req.session.userId];
    const conditions = [];
    const params = [];
    if (category) {
      conditions.push('e.category=?');
      params.push(category);
    }
    if (status) {
      conditions.push('e.status=?');
      params.push(status);
    }
    if (queryFlag(mine)) {
      conditions.push('e.current_user_id=?');
      params.push(req.session.userId);
    }
    if (due === 'maintenance')
      conditions.push(
        "e.next_maintenance_at IS NOT NULL AND e.next_maintenance_at != '' AND date(e.next_maintenance_at) <= date('now','+30 days')",
      );
    else if (due === 'calibration')
      conditions.push(
        "e.next_calibration_at IS NOT NULL AND e.next_calibration_at != '' AND date(e.next_calibration_at) <= date('now','+30 days')",
      );
    else if (due === 'any')
      conditions.push(`(
      (e.next_maintenance_at IS NOT NULL AND e.next_maintenance_at != '' AND date(e.next_maintenance_at) <= date('now','+30 days')) OR
      (e.next_calibration_at IS NOT NULL AND e.next_calibration_at != '' AND date(e.next_calibration_at) <= date('now','+30 days'))
    )`);
    if (reservations === 'pending') conditions.push('COALESCE(er.pending_reservations, 0) > 0');
    if (training === 'required') conditions.push('e.requires_training=1');
    else if (training === 'ready')
      conditions.push('e.requires_training=1 AND COALESCE(utr.user_active_training_count, 0) > 0');
    else if (training === 'blocked')
      conditions.push('e.requires_training=1 AND COALESCE(utr.user_active_training_count, 0) = 0');
    else if (training === 'expired')
      conditions.push(
        'e.requires_training=1 AND COALESCE(utr.user_training_records_count, 0) > 0 AND COALESCE(utr.user_active_training_count, 0) = 0',
      );
    const q = searchTerm(search);
    if (q) {
      const like = likePattern(q);
      conditions.push(`(
        e.name LIKE ? ESCAPE '\\' OR COALESCE(e.sku,'') LIKE ? ESCAPE '\\' OR COALESCE(e.location,'') LIKE ? ESCAPE '\\' OR
        COALESCE(e.category,'') LIKE ? ESCAPE '\\' OR COALESCE(e.manufacturer,'') LIKE ? ESCAPE '\\' OR
        COALESCE(e.model,'') LIKE ? ESCAPE '\\' OR COALESCE(e.serial_number,'') LIKE ? ESCAPE '\\'
      )`);
      params.push(like, like, like, like, like, like, like);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const baseSql = `FROM equipment e
      LEFT JOIN users lu ON lu.id = e.last_used_user_id
      LEFT JOIN users cu ON cu.id = e.current_user_id
      LEFT JOIN (
        SELECT
          equipment_id,
          SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_reservations,
          MIN(CASE WHEN status IN ('pending','approved') AND end_at >= datetime('now') THEN start_at END) AS next_reservation_at
        FROM equipment_reservations
        GROUP BY equipment_id
      ) er ON er.equipment_id = e.id
      LEFT JOIN (
        SELECT equipment_id, COUNT(*) AS training_records_count
        FROM training_records
        GROUP BY equipment_id
      ) tr ON tr.equipment_id = e.id
      LEFT JOIN (
        SELECT
          equipment_id,
          COUNT(*) AS user_training_records_count,
          SUM(CASE WHEN expires_at IS NULL OR expires_at='' OR date(expires_at) >= date('now') THEN 1 ELSE 0 END) AS user_active_training_count,
          MIN(CASE WHEN expires_at IS NOT NULL AND expires_at != '' AND date(expires_at) >= date('now') THEN expires_at ELSE NULL END) AS user_training_expires_at
        FROM training_records
        WHERE user_id=? AND completed_at IS NOT NULL
        GROUP BY equipment_id
      ) utr ON utr.equipment_id = e.id
      ${where}`;
    const sqlParams = [...baseParams, ...params];
    const total = db.prepare(`SELECT COUNT(*) as n ${baseSql}`).get(...sqlParams).n;
    const summary = db
      .prepare(
        `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN e.status='available' THEN 1 ELSE 0 END), 0) AS available,
        COALESCE(SUM(CASE WHEN e.status='in_use' THEN 1 ELSE 0 END), 0) AS in_use,
        COALESCE(SUM(CASE WHEN e.status='maintenance' THEN 1 ELSE 0 END), 0) AS maintenance,
        COALESCE(SUM(CASE WHEN e.status='broken' THEN 1 ELSE 0 END), 0) AS broken,
        COALESCE(SUM(CASE WHEN e.next_maintenance_at IS NOT NULL AND e.next_maintenance_at != '' AND date(e.next_maintenance_at) < date('now') THEN 1 ELSE 0 END), 0) AS maintenance_overdue,
        COALESCE(SUM(CASE WHEN e.next_maintenance_at IS NOT NULL AND e.next_maintenance_at != '' AND date(e.next_maintenance_at) BETWEEN date('now') AND date('now','+30 days') THEN 1 ELSE 0 END), 0) AS maintenance_due_soon,
        COALESCE(SUM(CASE WHEN e.next_calibration_at IS NOT NULL AND e.next_calibration_at != '' AND date(e.next_calibration_at) < date('now') THEN 1 ELSE 0 END), 0) AS calibration_overdue,
        COALESCE(SUM(CASE WHEN e.next_calibration_at IS NOT NULL AND e.next_calibration_at != '' AND date(e.next_calibration_at) BETWEEN date('now') AND date('now','+30 days') THEN 1 ELSE 0 END), 0) AS calibration_due_soon,
        COALESCE(SUM(COALESCE(er.pending_reservations, 0)), 0) AS pending_reservations,
        COALESCE(SUM(CASE WHEN e.requires_training=1 THEN 1 ELSE 0 END), 0) AS requires_training,
        COALESCE(SUM(CASE WHEN e.requires_training=1 AND COALESCE(utr.user_active_training_count, 0) > 0 THEN 1 ELSE 0 END), 0) AS training_ready,
        COALESCE(SUM(CASE WHEN e.requires_training=1 AND COALESCE(utr.user_active_training_count, 0) = 0 THEN 1 ELSE 0 END), 0) AS training_blocked,
        COALESCE(SUM(CASE WHEN e.requires_training=1 AND COALESCE(utr.user_training_records_count, 0) > 0 AND COALESCE(utr.user_active_training_count, 0) = 0 THEN 1 ELSE 0 END), 0) AS training_expired
      ${baseSql}
    `,
      )
      .get(...sqlParams);
    const rows = db
      .prepare(
        `
      SELECT e.*,
        lu.name AS last_used_user_name, lu.username AS last_used_username,
        cu.name AS current_user_name,   cu.username AS current_username,
        COALESCE(er.pending_reservations, 0) AS pending_reservations,
        er.next_reservation_at,
        COALESCE(tr.training_records_count, 0) AS training_records_count,
        COALESCE(utr.user_training_records_count, 0) AS user_training_records_count,
        COALESCE(utr.user_active_training_count, 0) AS user_active_training_count,
        utr.user_training_expires_at,
        CASE
          WHEN e.requires_training=0 THEN 'not_required'
          WHEN COALESCE(utr.user_active_training_count, 0) > 0 THEN 'active'
          WHEN COALESCE(utr.user_training_records_count, 0) > 0 THEN 'expired'
          ELSE 'missing'
        END AS training_state,
        ${equipmentDueCase('e.next_maintenance_at')} AS maintenance_state,
        ${equipmentDueCase('e.next_calibration_at')} AS calibration_state
      ${baseSql}
      ORDER BY ${equipmentOrderBy(sort)} LIMIT ? OFFSET ?`,
      )
      .all(...sqlParams, pageSize, (pageNum - 1) * pageSize);
    res.json({ total, page: pageNum, limit: pageSize, summary, rows });
  });
  router.post('/api/equipment', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const {
      name,
      sku,
      category,
      location,
      status,
      notes,
      sort_order,
      manufacturer,
      model,
      serial_number,
      purchase_date,
      maintenance_interval_days,
      last_calibrated_at,
      next_calibration_at,
      requires_training,
      training_requirement,
    } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const r = db
      .prepare(
        `INSERT INTO equipment
      (name, sku, category, location, status, notes, sort_order,
       manufacturer, model, serial_number, purchase_date, maintenance_interval_days,
       last_calibrated_at, next_calibration_at, requires_training, training_requirement)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        name,
        sku || null,
        category || '',
        location || '',
        status || 'available',
        notes || '',
        sort_order || 0,
        manufacturer || '',
        model || '',
        serial_number || '',
        purchase_date || null,
        maintenance_interval_days || 0,
        last_calibrated_at || null,
        next_calibration_at || null,
        queryFlag(requires_training) ? 1 : 0,
        training_requirement || '',
      );
    res.json({ id: r.lastInsertRowid });
  });
  router.put('/api/equipment/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const {
      name,
      sku,
      category,
      location,
      status,
      notes,
      sort_order,
      manufacturer,
      model,
      serial_number,
      purchase_date,
      maintenance_interval_days,
      last_maintained_at,
      next_maintenance_at,
      last_calibrated_at,
      next_calibration_at,
      requires_training,
      training_requirement,
    } = req.body;
    db.prepare(
      `UPDATE equipment SET name=?, sku=?, category=?, location=?, status=?, notes=?, sort_order=?,
      manufacturer=?, model=?, serial_number=?, purchase_date=?, maintenance_interval_days=?,
      last_maintained_at=?, next_maintenance_at=?, last_calibrated_at=?, next_calibration_at=?,
      requires_training=?, training_requirement=? WHERE id=?`,
    ).run(
      name,
      sku || null,
      category || '',
      location || '',
      status || 'available',
      notes || '',
      sort_order || 0,
      manufacturer || '',
      model || '',
      serial_number || '',
      purchase_date || null,
      maintenance_interval_days || 0,
      last_maintained_at || null,
      next_maintenance_at || null,
      last_calibrated_at || null,
      next_calibration_at || null,
      queryFlag(requires_training) ? 1 : 0,
      training_requirement || '',
      req.params.id,
    );
    res.json({ success: true });
  });

  router.delete('/api/equipment/:id', apiWriteLimiter, requireStaff, requireCsrf, (req, res) => {
    const eq = db.prepare('SELECT id FROM equipment WHERE id=?').get(req.params.id);
    if (!eq) return res.status(404).json({ error: 'not found' });
    db.transaction(() => {
      db.prepare('DELETE FROM equipment_reservations WHERE equipment_id=?').run(eq.id);
      db.prepare('DELETE FROM equipment_maintenance WHERE equipment_id=?').run(eq.id);
      db.prepare('DELETE FROM training_records WHERE equipment_id=?').run(eq.id);
      db.prepare('UPDATE issues SET related_equipment_id=NULL WHERE related_equipment_id=?').run(
        eq.id,
      );
      db.prepare('DELETE FROM equipment_log WHERE equipment_id=?').run(eq.id);
      db.prepare('DELETE FROM equipment WHERE id=?').run(eq.id);
    })();
    res.json({ success: true });
  });

  // Check out: any authed user can claim a free piece of equipment
  router.post(
    '/api/equipment/:id/checkout',
    apiWriteLimiter,
    requireAuth,
    requireCsrf,
    (req, res) => {
      const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id);
      if (!eq) return res.status(404).json({ error: 'not found' });
      if (eq.current_user_id) return res.status(409).json({ error: 'already checked out' });
      if (eq.status === 'broken' || eq.status === 'maintenance')
        return res.status(409).json({ error: 'unavailable: ' + eq.status });
      const role = req.session.role || 'student';
      const trainingError = equipmentAccessError(eq, req.session.userId, role);
      if (trainingError) return res.status(403).json({ error: trainingError });
      const blockingReservation = db
        .prepare(
          `
      SELECT user_id
      FROM equipment_reservations
      WHERE equipment_id=?
        AND status='approved'
        AND start_at <= datetime('now')
        AND end_at >= datetime('now')
        AND user_id != ?
      LIMIT 1
    `,
        )
        .get(req.params.id, req.session.userId);
      if (blockingReservation) {
        return res.status(409).json({ error: 'reserved for another lab member right now' });
      }
      const note = (req.body && req.body.note) || '';
      const userId = req.session.userId;
      db.prepare(
        'UPDATE equipment SET status=?, current_user_id=?, last_used_user_id=?, last_used_at=CURRENT_TIMESTAMP WHERE id=?',
      ).run('in_use', userId, userId, eq.id);
      db.prepare(
        'INSERT INTO equipment_log (equipment_id, user_id, action, note) VALUES (?,?,?,?)',
      ).run(eq.id, userId, 'checkout', note);
      res.json({ success: true });
    },
  );

  // Check in: only the current holder, an admin, or a professor can return
  router.post(
    '/api/equipment/:id/checkin',
    apiWriteLimiter,
    requireAuth,
    requireCsrf,
    (req, res) => {
      const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id);
      if (!eq) return res.status(404).json({ error: 'not found' });
      if (eq.status !== 'in_use' || !eq.current_user_id)
        return res.status(409).json({ error: 'Equipment is not checked out' });
      const role = req.session.role || 'student';
      if (eq.current_user_id !== req.session.userId && role !== 'admin' && role !== 'professor') {
        return res.status(403).json({ error: 'only current holder or staff can check in' });
      }
      const note = (req.body && req.body.note) || '';
      db.prepare(
        'UPDATE equipment SET status=?, current_user_id=NULL, last_used_at=CURRENT_TIMESTAMP WHERE id=?',
      ).run('available', eq.id);
      db.prepare(
        "UPDATE equipment_log SET ended_at=CURRENT_TIMESTAMP WHERE equipment_id=? AND user_id=? AND action='checkout' AND ended_at IS NULL",
      ).run(eq.id, eq.current_user_id || req.session.userId);
      db.prepare(
        'INSERT INTO equipment_log (equipment_id, user_id, action, note) VALUES (?,?,?,?)',
      ).run(eq.id, req.session.userId, 'checkin', note);
      res.json({ success: true });
    },
  );

  router.get('/api/equipment/:id/log', apiReadLimiter, requireAuth, (req, res) => {
    const rows = db
      .prepare(
        `
      SELECT l.*, u.username, u.name AS user_name
      FROM equipment_log l LEFT JOIN users u ON u.id = l.user_id
      WHERE l.equipment_id=? ORDER BY l.id DESC LIMIT 100`,
      )
      .all(req.params.id);
    res.json(rows);
  });

  // ── Equipment reservations ───────────────────────────────────────────────────
  router.get('/api/equipment/reservations', apiReadLimiter, requireAuth, (req, res) => {
    const { equipment_id, user_id, upcoming, status } = req.query;
    let sql = `SELECT r.*, u.name AS user_name, u.username,
      e.name AS equipment_name, e.sku AS equipment_sku
      FROM equipment_reservations r
      JOIN users u ON u.id = r.user_id
      JOIN equipment e ON e.id = r.equipment_id WHERE 1=1`;
    const params = [];
    if (equipment_id) {
      sql += ' AND r.equipment_id=?';
      params.push(equipment_id);
    }
    if (user_id) {
      sql += ' AND r.user_id=?';
      params.push(user_id);
    }
    if (status) {
      sql += ' AND r.status=?';
      params.push(status);
    }
    if (upcoming === '1') {
      sql += " AND r.end_at >= datetime('now') AND r.status NOT IN ('cancelled','denied')";
    }
    sql +=
      " ORDER BY CASE r.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, r.start_at ASC LIMIT 200";
    res.json(db.prepare(sql).all(...params));
  });
  router.get('/api/equipment/:id/reservations', apiReadLimiter, requireAuth, (req, res) => {
    const rows = db
      .prepare(
        `SELECT r.*, u.name AS user_name, u.username
      FROM equipment_reservations r JOIN users u ON u.id=r.user_id
      WHERE r.equipment_id=? ORDER BY r.start_at DESC LIMIT 100`,
      )
      .all(req.params.id);
    res.json(rows);
  });
  router.post(
    '/api/equipment/:id/reservations',
    apiWriteLimiter,
    requireAuth,
    requireCsrf,
    (req, res) => {
      const { start_at, end_at, purpose, notes } = req.body;
      const reservationError = validateReservationWindow(start_at, end_at);
      if (reservationError) return res.status(400).json({ error: reservationError });
      const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(req.params.id);
      if (!eq) return res.status(404).json({ error: 'equipment not found' });
      const trainingError = equipmentAccessError(
        eq,
        req.session.userId,
        req.session.role || 'student',
      );
      if (trainingError) return res.status(403).json({ error: trainingError });
      // Conflict check: overlapping approved/pending reservations
      const conflict = findReservationConflict(req.params.id, start_at, end_at);
      if (conflict)
        return res.status(409).json({ error: 'Time slot conflicts with an existing reservation' });
      const r = db
        .prepare(
          `INSERT INTO equipment_reservations
      (equipment_id, user_id, start_at, end_at, purpose, notes, status)
      VALUES (?,?,?,?,?,?,?)`,
        )
        .run(
          req.params.id,
          req.session.userId,
          start_at,
          end_at,
          purpose || '',
          notes || '',
          'pending',
        );
      res.json({ id: r.lastInsertRowid });
    },
  );
  router.put(
    '/api/equipment/reservations/:id',
    apiWriteLimiter,
    requireAuth,
    requireCsrf,
    (req, res) => {
      const resv = db.prepare('SELECT * FROM equipment_reservations WHERE id=?').get(req.params.id);
      if (!resv) return res.status(404).json({ error: 'not found' });
      const role = currentRole(req);
      const isStaff = isLabStaffRole(role);
      const canApprove = isLabStaffRole(role);
      const isOwner = resv.user_id === req.session.userId;
      // Only the professor can approve/deny; owner or lab staff can cancel
      const { status, notes, start_at, end_at, purpose } = req.body;
      if ((status === 'approved' || status === 'denied') && !canApprove)
        return res
          .status(403)
          .json({ error: 'Only the professor can approve or deny reservations' });
      if (status === 'cancelled' && !isOwner && !isStaff)
        return res.status(403).json({ error: 'Only the requestor or staff can cancel' });
      const nextStart = start_at || resv.start_at;
      const nextEnd = end_at || resv.end_at;
      if (start_at || end_at) {
        const reservationError = validateReservationWindow(nextStart, nextEnd);
        if (reservationError) return res.status(400).json({ error: reservationError });
        const conflict = findReservationConflict(resv.equipment_id, nextStart, nextEnd, resv.id);
        if (conflict)
          return res
            .status(409)
            .json({ error: 'Time slot conflicts with an existing reservation' });
      }
      const sets = [],
        params = [];
      if (status) {
        sets.push('status=?');
        params.push(status);
      }
      if (notes !== undefined) {
        sets.push('notes=?');
        params.push(notes);
      }
      if (start_at) {
        sets.push('start_at=?');
        params.push(start_at);
      }
      if (end_at) {
        sets.push('end_at=?');
        params.push(end_at);
      }
      if (purpose !== undefined) {
        sets.push('purpose=?');
        params.push(purpose);
      }
      if (status === 'approved') {
        const eq = db.prepare('SELECT * FROM equipment WHERE id=?').get(resv.equipment_id);
        const trainingStatus = getEquipmentTrainingStatus(resv.user_id, resv.equipment_id);
        if (eq && queryFlag(eq.requires_training) && trainingStatus.status !== 'active') {
          const label =
            eq.training_requirement || trainingStatus.training_name || 'Active training';
          return res.status(409).json({
            error:
              trainingStatus.status === 'expired'
                ? `${label} is expired for this reservation holder`
                : `${label} is required before this reservation can be approved`,
          });
        }
        sets.push('approved_by=?');
        params.push(req.session.userId);
      }
      if (!sets.length) return res.json({ success: true });
      params.push(req.params.id);
      db.prepare(`UPDATE equipment_reservations SET ${sets.join(', ')} WHERE id=?`).run(...params);
      res.json({ success: true });
    },
  );
  router.delete(
    '/api/equipment/reservations/:id',
    apiWriteLimiter,
    requireAuth,
    requireCsrf,
    (req, res) => {
      const resv = db
        .prepare('SELECT user_id FROM equipment_reservations WHERE id=?')
        .get(req.params.id);
      if (!resv) return res.status(404).json({ error: 'not found' });
      const role = req.session.role || 'student';
      if (resv.user_id !== req.session.userId && role !== 'admin' && role !== 'professor')
        return res.status(403).json({ error: 'Forbidden' });
      db.prepare('DELETE FROM equipment_reservations WHERE id=?').run(req.params.id);
      res.json({ success: true });
    },
  );

  // ── Equipment maintenance records ────────────────────────────────────────────
  router.get('/api/equipment/:id/maintenance', apiReadLimiter, requireAuth, (req, res) => {
    const rows = db
      .prepare(
        `SELECT m.*, u.name AS created_by_name
      FROM equipment_maintenance m LEFT JOIN users u ON u.id=m.created_by
      WHERE m.equipment_id=? ORDER BY m.id DESC LIMIT 100`,
      )
      .all(req.params.id);
    res.json(rows);
  });
  router.post(
    '/api/equipment/:id/maintenance',
    apiWriteLimiter,
    requireStaff,
    requireCsrf,
    (req, res) => {
      const { maint_type, scheduled_at, completed_at, performed_by, cost, notes, next_due_at } =
        req.body;
      if (!maint_type) return res.status(400).json({ error: 'maint_type required' });
      const eq = db.prepare('SELECT id FROM equipment WHERE id=?').get(req.params.id);
      if (!eq) return res.status(404).json({ error: 'equipment not found' });
      const r = db
        .prepare(
          `INSERT INTO equipment_maintenance
      (equipment_id, maint_type, scheduled_at, completed_at, performed_by, cost, notes, next_due_at, created_by)
      VALUES (?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          req.params.id,
          maint_type,
          scheduled_at || null,
          completed_at || null,
          performed_by || '',
          cost || null,
          notes || '',
          next_due_at || null,
          req.session.userId,
        );
      syncEquipmentMaintenanceState(req.params.id);
      res.json({ id: r.lastInsertRowid });
    },
  );
  router.put(
    '/api/equipment/maintenance/:id',
    apiWriteLimiter,
    requireStaff,
    requireCsrf,
    (req, res) => {
      const { maint_type, scheduled_at, completed_at, performed_by, cost, notes, next_due_at } =
        req.body;
      const rec = db
        .prepare('SELECT equipment_id FROM equipment_maintenance WHERE id=?')
        .get(req.params.id);
      if (!rec) return res.status(404).json({ error: 'not found' });
      db.prepare(
        `UPDATE equipment_maintenance SET maint_type=?, scheduled_at=?, completed_at=?,
      performed_by=?, cost=?, notes=?, next_due_at=? WHERE id=?`,
      ).run(
        maint_type,
        scheduled_at || null,
        completed_at || null,
        performed_by || '',
        cost || null,
        notes || '',
        next_due_at || null,
        req.params.id,
      );
      syncEquipmentMaintenanceState(rec.equipment_id);
      res.json({ success: true });
    },
  );
  router.delete(
    '/api/equipment/maintenance/:id',
    apiWriteLimiter,
    requireStaff,
    requireCsrf,
    (req, res) => {
      const rec = db
        .prepare('SELECT equipment_id FROM equipment_maintenance WHERE id=?')
        .get(req.params.id);
      if (!rec) return res.status(404).json({ error: 'not found' });
      db.prepare('DELETE FROM equipment_maintenance WHERE id=?').run(req.params.id);
      syncEquipmentMaintenanceState(rec.equipment_id);
      res.json({ success: true });
    },
  );
  return router;
}

module.exports = { createEquipmentRouter };
