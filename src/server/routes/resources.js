'use strict';

const { Router } = require('express');

function createResourcesRouter({
  db,
  daysUntilExpr,
  inventoryStockCase,
  equipmentDueCase,
  requireAuth,
  requireStaff,
  apiReadLimiter,
}) {
  const router = Router();

  // ---- Lab resources overview ----
  router.get('/api/resources/overview', apiReadLimiter, requireAuth, (req, res) => {
    const inventory = db
      .prepare(
        `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN qty <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock,
        COALESCE(SUM(CASE WHEN qty > 0 AND qty <= min_qty THEN 1 ELSE 0 END), 0) AS low_stock,
        COALESCE(SUM(CASE WHEN expiry_date IS NOT NULL AND expiry_date != '' AND date(expiry_date) < date('now') THEN 1 ELSE 0 END), 0) AS expired,
        COALESCE(SUM(CASE WHEN expiry_date IS NOT NULL AND expiry_date != '' AND date(expiry_date) BETWEEN date('now') AND date('now','+30 days') THEN 1 ELSE 0 END), 0) AS expiring_soon,
        COALESCE(SUM(CASE WHEN COALESCE(hazard_class,'') != '' THEN 1 ELSE 0 END), 0) AS hazardous
      FROM inventory
    `,
      )
      .get();
    const equipment = db
      .prepare(
        `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status='available' THEN 1 ELSE 0 END), 0) AS available,
        COALESCE(SUM(CASE WHEN status='in_use' THEN 1 ELSE 0 END), 0) AS in_use,
        COALESCE(SUM(CASE WHEN status='maintenance' THEN 1 ELSE 0 END), 0) AS maintenance,
        COALESCE(SUM(CASE WHEN status='broken' THEN 1 ELSE 0 END), 0) AS broken,
        COALESCE(SUM(CASE WHEN next_maintenance_at IS NOT NULL AND next_maintenance_at != '' AND date(next_maintenance_at) < date('now') THEN 1 ELSE 0 END), 0) AS maintenance_overdue,
        COALESCE(SUM(CASE WHEN next_maintenance_at IS NOT NULL AND next_maintenance_at != '' AND date(next_maintenance_at) BETWEEN date('now') AND date('now','+30 days') THEN 1 ELSE 0 END), 0) AS maintenance_due_soon,
        COALESCE(SUM(CASE WHEN next_calibration_at IS NOT NULL AND next_calibration_at != '' AND date(next_calibration_at) < date('now') THEN 1 ELSE 0 END), 0) AS calibration_overdue,
        COALESCE(SUM(CASE WHEN next_calibration_at IS NOT NULL AND next_calibration_at != '' AND date(next_calibration_at) BETWEEN date('now') AND date('now','+30 days') THEN 1 ELSE 0 END), 0) AS calibration_due_soon
      FROM equipment
    `,
      )
      .get();
    const samples = db
      .prepare(
        `
      SELECT
        COALESCE(SUM(CASE WHEN approval_status='approved' THEN 1 ELSE 0 END), 0) AS total,
        COALESCE(SUM(CASE WHEN approval_status='approved' AND status='active' THEN 1 ELSE 0 END), 0) AS active,
        COALESCE(SUM(CASE WHEN approval_status='approved' AND status='depleted' THEN 1 ELSE 0 END), 0) AS depleted,
        COALESCE(SUM(CASE WHEN approval_status='approved' AND expiry_date IS NOT NULL AND expiry_date != '' AND date(expiry_date) < date('now') THEN 1 ELSE 0 END), 0) AS expired,
        COALESCE(SUM(CASE WHEN approval_status='approved' AND expiry_date IS NOT NULL AND expiry_date != '' AND date(expiry_date) BETWEEN date('now') AND date('now','+30 days') THEN 1 ELSE 0 END), 0) AS expiring_soon,
        COALESCE(SUM(CASE WHEN approval_status='pending' THEN 1 ELSE 0 END), 0) AS pending_approval
      FROM sample_registry
    `,
      )
      .get();
    const training = db
      .prepare(
        `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN expires_at IS NOT NULL AND expires_at != '' AND date(expires_at) < date('now') THEN 1 ELSE 0 END), 0) AS expired,
        COALESCE(SUM(CASE WHEN expires_at IS NOT NULL AND expires_at != '' AND date(expires_at) BETWEEN date('now') AND date('now','+60 days') THEN 1 ELSE 0 END), 0) AS expiring_soon,
        COUNT(DISTINCT user_id) AS covered_members
      FROM training_records
    `,
      )
      .get();
    const issues = db
      .prepare(
        `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status='open' THEN 1 ELSE 0 END), 0) AS open,
        COALESCE(SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END), 0) AS in_progress,
        COALESCE(SUM(CASE WHEN priority='high' AND status!='resolved' THEN 1 ELSE 0 END), 0) AS high_priority
      FROM issues
    `,
      )
      .get();
    const reservations = db
      .prepare(
        `
      SELECT
        COALESCE(SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status='approved' AND end_at >= datetime('now') THEN 1 ELSE 0 END), 0) AS upcoming
      FROM equipment_reservations
    `,
      )
      .get();

    const alerts = {
      inventory: db
        .prepare(
          `
        SELECT id, name, sku, qty, min_qty, expiry_date,
          ${daysUntilExpr('expiry_date')} AS days_until_expiry,
          ${inventoryStockCase('inventory')} AS stock_state
        FROM inventory
        WHERE qty <= min_qty OR (expiry_date IS NOT NULL AND expiry_date != '' AND date(expiry_date) <= date('now','+30 days'))
        ORDER BY CASE WHEN qty <= 0 THEN 0 WHEN qty <= min_qty THEN 1 ELSE 2 END,
          CASE WHEN expiry_date IS NOT NULL AND expiry_date != '' THEN date(expiry_date) ELSE date('2999-12-31') END ASC,
          name COLLATE NOCASE ASC
        LIMIT 6
      `,
        )
        .all(),
      equipment: db
        .prepare(
          `
        SELECT id, name, sku, status, next_maintenance_at, next_calibration_at,
          ${equipmentDueCase('next_maintenance_at')} AS maintenance_state,
          ${equipmentDueCase('next_calibration_at')} AS calibration_state
        FROM equipment
        WHERE status IN ('maintenance','broken')
          OR (next_maintenance_at IS NOT NULL AND next_maintenance_at != '' AND date(next_maintenance_at) <= date('now','+30 days'))
          OR (next_calibration_at IS NOT NULL AND next_calibration_at != '' AND date(next_calibration_at) <= date('now','+30 days'))
        ORDER BY CASE status WHEN 'broken' THEN 0 WHEN 'maintenance' THEN 1 ELSE 2 END,
          CASE WHEN next_maintenance_at IS NOT NULL AND next_maintenance_at != '' THEN date(next_maintenance_at) ELSE date('2999-12-31') END ASC,
          name COLLATE NOCASE ASC
        LIMIT 6
      `,
        )
        .all(),
      samples: db
        .prepare(
          `
        SELECT id, name, status, qty, unit, expiry_date,
          ${daysUntilExpr('expiry_date')} AS days_until_expiry
        FROM sample_registry
        WHERE approval_status='approved' AND (
          (expiry_date IS NOT NULL AND expiry_date != '' AND date(expiry_date) <= date('now','+30 days'))
          OR status='depleted'
        )
        ORDER BY CASE WHEN expiry_date IS NOT NULL AND expiry_date != '' THEN date(expiry_date) ELSE date('2999-12-31') END ASC,
          name COLLATE NOCASE ASC
        LIMIT 6
      `,
        )
        .all(),
      training: db
        .prepare(
          `
        SELECT t.id, t.training_name, t.expires_at, u.name AS user_name, e.name AS equipment_name,
          ${daysUntilExpr('t.expires_at')} AS days_until_expiry
        FROM training_records t
        JOIN users u ON u.id=t.user_id
        LEFT JOIN equipment e ON e.id=t.equipment_id
        WHERE t.expires_at IS NOT NULL AND t.expires_at != '' AND date(t.expires_at) <= date('now','+60 days')
        ORDER BY date(t.expires_at) ASC, t.training_name COLLATE NOCASE ASC
        LIMIT 6
      `,
        )
        .all(),
      reservations: db
        .prepare(
          `
        SELECT r.id, r.status, r.start_at, r.end_at, u.name AS user_name, e.name AS equipment_name
        FROM equipment_reservations r
        JOIN users u ON u.id=r.user_id
        JOIN equipment e ON e.id=r.equipment_id
        WHERE r.status IN ('pending','approved') AND r.end_at >= datetime('now')
        ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.start_at ASC
        LIMIT 6
      `,
        )
        .all(),
      issues: db
        .prepare(
          `
        SELECT id, title, category, priority, status, created_at
        FROM issues
        WHERE status != 'resolved'
        ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, created_at DESC
        LIMIT 6
      `,
        )
        .all(),
    };

    res.json({ inventory, equipment, samples, training, issues, reservations, alerts });
  });

  // ---- PI / Director dashboard overview (staff only) ----
  // Returns a single JSON snapshot of key lab metrics useful for the director.
  router.get('/api/dashboard/pi', apiReadLimiter, requireStaff, (req, res) => {
    const totalMembers = db.prepare('SELECT COUNT(*) as n FROM users WHERE active!=0').get().n;
    const openIssues = db.prepare("SELECT COUNT(*) as n FROM issues WHERE status='open'").get().n;
    const highIssues = db
      .prepare("SELECT COUNT(*) as n FROM issues WHERE status='open' AND priority='high'")
      .get().n;
    const equipmentInUse = db
      .prepare('SELECT COUNT(*) as n FROM equipment WHERE current_user_id IS NOT NULL')
      .get().n;
    const overdueTasks = db
      .prepare(
        "SELECT COUNT(*) as n FROM tasks WHERE status NOT IN ('done') AND due_date != '' AND date(due_date) < date('now')",
      )
      .get().n;
    const recentIssues = db
      .prepare(
        `
      SELECT i.id, i.title, i.priority, i.status, i.created_at, u.name AS reporter_name
      FROM issues i LEFT JOIN users u ON u.id=i.reporter_user_id
      WHERE i.status='open' ORDER BY CASE i.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, i.created_at DESC LIMIT 5`,
      )
      .all();
    const checkedOutEq = db
      .prepare(
        `
      SELECT e.name, e.sku, e.last_used_at, u.name AS held_by
      FROM equipment e LEFT JOIN users u ON u.id=e.current_user_id
      WHERE e.current_user_id IS NOT NULL ORDER BY e.last_used_at ASC LIMIT 10`,
      )
      .all();
    const upcomingEvents = db
      .prepare(
        `
      SELECT title, start_time, location FROM events
      WHERE datetime(start_time) >= datetime('now') ORDER BY start_time LIMIT 5`,
      )
      .all();
    const overdueTasksList = db
      .prepare(
        `
      SELECT t.title, t.due_date, u.name AS assignee_name
      FROM tasks t LEFT JOIN users u ON u.id=t.assignee_user_id
      WHERE t.status NOT IN ('done') AND t.due_date != '' AND date(t.due_date) < date('now')
      ORDER BY t.due_date ASC LIMIT 10`,
      )
      .all();

    res.json({
      totalMembers,
      openIssues,
      highIssues,
      equipmentInUse,
      overdueTasks,
      recentIssues,
      checkedOutEq,
      upcomingEvents,
      overdueTasksList,
    });
  });
  return router;
}

module.exports = { createResourcesRouter };
