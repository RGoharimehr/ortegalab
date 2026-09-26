'use strict';

const { Router } = require('express');

function createTasksRouter({
  db,
  sendMail,
  str,
  clampInt,
  currentRole,
  isLabStaffRole,
  normalizeTaskStatus,
  isValidTaskStatus,
  taskStatusOrderExpr,
  resolveTaskAssigneeName,
  resolveTaskDueLabel,
  requireAuth,
  requireCsrf,
  apiWriteLimiter,
  apiReadLimiter,
}) {
  const router = Router();

  // TASKS
  router.get('/api/tasks', apiReadLimiter, requireAuth, (req, res) => {
    const { page, limit, status, mine } = req.query;
    const pageNum = clampInt(page, 1, { min: 1, max: 100000 });
    const pageSize = clampInt(limit, 200, { min: 1, max: 200 });
    const offset = (pageNum - 1) * pageSize;
    const conditions = [];
    const params = [];
    if (status) {
      const normalized = normalizeTaskStatus(status);
      if (!isValidTaskStatus(normalized)) return res.status(400).json({ error: 'invalid status' });
      conditions.push('t.status=?');
      params.push(normalized);
    }
    if (mine === '1') {
      conditions.push('(t.assignee_user_id=? OR t.created_by_user_id=?)');
      params.push(req.session.userId, req.session.userId);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const baseSql = `FROM tasks t LEFT JOIN users u ON u.id = t.assignee_user_id ${where}`;
    const total = db.prepare(`SELECT COUNT(*) as n ${baseSql}`).get(...params).n;
    const rows = db
      .prepare(
        `
      SELECT t.*, u.name AS assignee_name, u.username AS assignee_username,
             COALESCE(u.name, NULLIF(t.assignee, '')) AS assignee_display
      ${baseSql}
      ORDER BY ${taskStatusOrderExpr('t.status')}, t.sort_order, t.id
      LIMIT ? OFFSET ?
    `,
      )
      .all(...params, pageSize, offset);
    res.json({ total, page: pageNum, limit: pageSize, rows });
  });
  router.post('/api/tasks', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const {
      title,
      description,
      assignee_user_id,
      assignee,
      priority,
      due_date,
      due_label,
      status,
      tag,
      sort_order,
    } = req.body;
    if (!title) return res.status(400).json({ error: 'Missing title' });
    // Only professors and admins can assign tasks to other people; everyone else self-assigns
    const role = req.session.role || 'student';
    const canAssignOthers = role === 'admin' || role === 'professor';
    const effectiveAssignee = canAssignOthers
      ? assignee_user_id || null
      : req.session.userId || null;
    const normalizedStatus = normalizeTaskStatus(status);
    if (!isValidTaskStatus(normalizedStatus))
      return res.status(400).json({ error: 'invalid status' });
    const assigneeName = resolveTaskAssigneeName(effectiveAssignee, assignee || '');
    const legacyDueLabel = resolveTaskDueLabel(due_date || '', due_label || '');
    const result = db
      .prepare(
        'INSERT INTO tasks (title, assignee, description, assignee_user_id, created_by_user_id, priority, due_label, due_date, status, tag, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      )
      .run(
        str(title, 500),
        assigneeName,
        str(description, 5000),
        effectiveAssignee,
        req.session.userId || null,
        priority || 'normal',
        legacyDueLabel,
        due_date || '',
        normalizedStatus,
        tag || 'lab',
        sort_order || 0,
      );
    // Email notification — alert the assignee if different from creator
    if (effectiveAssignee && Number(effectiveAssignee) !== req.session.userId) {
      const assigneeRecord = db
        .prepare('SELECT name, email FROM users WHERE id=?')
        .get(effectiveAssignee);
      const creator = db.prepare('SELECT name FROM users WHERE id=?').get(req.session.userId);
      if (assigneeRecord && assigneeRecord.email) {
        sendMail(
          assigneeRecord.email,
          `[LATFS] Task assigned to you: ${title}`,
          `Hi ${assigneeRecord.name || assigneeRecord.email},\n\nA new task has been assigned to you by ${creator ? creator.name : 'a lab member'}.\n\nTask: ${title}\nPriority: ${priority || 'normal'}${due_date ? '\nDue: ' + due_date : ''}\n\nLog in to the LATFS Platform to view details.\n`,
        );
      }
    }
    res.json({ id: result.lastInsertRowid });
  });
  // Bulk status update — accepts { ids: number[], status: string }
  router.put('/api/tasks/bulk', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !ids.length)
      return res.status(400).json({ error: 'ids array required' });
    const taskIds = ids.map(Number).filter(Number.isFinite);
    if (!taskIds.length) return res.status(400).json({ error: 'valid ids required' });
    const normalizedStatus = normalizeTaskStatus(status);
    if (!isValidTaskStatus(normalizedStatus))
      return res.status(400).json({ error: 'invalid status' });
    const role = currentRole(req);
    const isStaff = isLabStaffRole(role);
    const placeholders = taskIds.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT id, assignee_user_id, created_by_user_id FROM tasks WHERE id IN (${placeholders})`,
      )
      .all(...taskIds);
    const userId = req.session.userId;
    const canEditTask = (task) =>
      isStaff || task.created_by_user_id === userId || task.assignee_user_id === userId;
    if (rows.length !== taskIds.length || rows.some((task) => !canEditTask(task))) {
      return res
        .status(403)
        .json({ error: 'Only the assignee, creator, or staff can update these tasks' });
    }
    const update = db.prepare('UPDATE tasks SET status=? WHERE id=?');
    const bulkUpdate = db.transaction((taskIds, st) => {
      for (const id of taskIds) update.run(st, id);
    });
    bulkUpdate(taskIds, normalizedStatus);
    res.json({ success: true, updated: taskIds.length });
  });
  router.put('/api/tasks/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'not found' });
    const {
      title,
      description,
      assignee_user_id,
      assignee,
      priority,
      due_date,
      due_label,
      status,
      tag,
      sort_order,
    } = req.body;
    const role = currentRole(req);
    const isStaff = isLabStaffRole(role);
    const isCreator = task.created_by_user_id === req.session.userId;
    const isAssignee = task.assignee_user_id === req.session.userId;
    if (!isStaff && !isCreator && !isAssignee) {
      return res
        .status(403)
        .json({ error: 'Only the assignee, creator, or staff can edit this task' });
    }
    const canAssignOthers = isStaff;
    const sets = [],
      params = [];
    if (title !== undefined) {
      sets.push('title=?');
      params.push(str(title, 500));
    }
    if (description !== undefined) {
      sets.push('description=?');
      params.push(str(description, 5000));
    }
    // Only professors and admins can reassign tasks to other people
    let resolvedAssigneeName;
    if (assignee_user_id !== undefined && canAssignOthers) {
      sets.push('assignee_user_id=?');
      params.push(assignee_user_id || null);
      resolvedAssigneeName = resolveTaskAssigneeName(assignee_user_id || null, assignee || '');
    } else if (assignee !== undefined) {
      resolvedAssigneeName = resolveTaskAssigneeName(null, assignee);
    }
    if (resolvedAssigneeName !== undefined) {
      sets.push('assignee=?');
      params.push(resolvedAssigneeName);
    }
    if (priority !== undefined) {
      sets.push('priority=?');
      params.push(priority || 'normal');
    }
    if (due_date !== undefined) {
      sets.push('due_date=?');
      params.push(due_date || '');
    }
    if (due_date !== undefined || due_label !== undefined) {
      sets.push('due_label=?');
      params.push(resolveTaskDueLabel(due_date || '', due_label || ''));
    }
    if (status !== undefined) {
      const normalizedStatus = normalizeTaskStatus(status);
      if (!isValidTaskStatus(normalizedStatus))
        return res.status(400).json({ error: 'invalid status' });
      sets.push('status=?');
      params.push(normalizedStatus);
    }
    if (tag !== undefined) {
      sets.push('tag=?');
      params.push(tag || 'lab');
    }
    if (sort_order !== undefined) {
      sets.push('sort_order=?');
      params.push(sort_order || 0);
    }
    if (!sets.length) return res.json({ success: true });
    params.push(req.params.id);
    db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id=?`).run(...params);
    res.json({ success: true });
  });
  router.delete('/api/tasks/:id', apiWriteLimiter, requireAuth, requireCsrf, (req, res) => {
    const task = db.prepare('SELECT created_by_user_id FROM tasks WHERE id=?').get(req.params.id);
    if (!task) return res.status(404).json({ error: 'not found' });
    const role = currentRole(req);
    const isCreator = task.created_by_user_id === req.session.userId;
    if (!isCreator && !isLabStaffRole(role)) {
      return res.status(403).json({ error: 'Only the creator or staff can delete this task' });
    }
    db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
    res.json({ success: true });
  });

  // ---- Per-user task helpers ----
  // Listing tasks already exists at /api/tasks; provide an enriched view with assignee info + filter "mine".
  router.get('/api/tasks/full', apiReadLimiter, requireAuth, (req, res) => {
    const { mine, status } = req.query;
    let sql = `SELECT t.*, u.name AS assignee_name, u.username AS assignee_username
               FROM tasks t LEFT JOIN users u ON u.id = t.assignee_user_id WHERE 1=1`;
    const params = [];
    if (mine === '1') {
      sql += ' AND t.assignee_user_id=?';
      params.push(req.session.userId);
    }
    if (status) {
      const normalizedStatus = normalizeTaskStatus(status);
      if (!isValidTaskStatus(normalizedStatus))
        return res.status(400).json({ error: 'invalid status' });
      sql += ' AND t.status=?';
      params.push(normalizedStatus);
    }
    sql += ` ORDER BY ${taskStatusOrderExpr('t.status')}, t.sort_order, t.id`;
    res.json(db.prepare(sql).all(...params));
  });
  return router;
}

module.exports = { createTasksRouter };
